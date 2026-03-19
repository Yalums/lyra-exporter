// markdown-core.js — Script-layer Markdown generation & export
// Injected into content.js (extension) and userscript AFTER common-base.js.
// No ES module syntax; all functions live in the enclosing IIFE scope.

// ─── i18n helper ────────────────────────────────────────────────────────────
function _mdT(key, fallback) {
    try { const v = i18n.t('exportManager.' + key); return (v && v !== 'exportManager.' + key) ? v : fallback; }
    catch (_) { return fallback; }
}

// ─── Date utils ──────────────────────────────────────────────────────────────
function _fmtDate(s) {
    if (!s) return '';
    try { return new Date(s).toLocaleString(); } catch (_) { return s; }
}
function _todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Artifact / tool extractors (ported from helpers.js) ─────────────────────
function _extractArtifact(item) {
    try {
        const input = item.input || {};
        const command = input.command || '';
        if (command === 'create') return { id: input.id || '', command, type: input.type || '', title: input.title || '', content: input.content || '', language: input.language || '', result: null };
        if (command === 'update' || command === 'rewrite') return { id: input.id || '', command, old_str: input.old_str || '', new_str: input.new_str || '', result: null };
    } catch (_) {}
    return null;
}
function _extractToolUse(item) {
    const t = { name: item.name || 'unknown', input: item.input || {}, result: null };
    if (item.name === 'web_search_tool' && item.input?.query) t.query = item.input.query;
    return t;
}
function _extractToolResult(item) {
    return { name: item.name || 'unknown', is_error: !!item.is_error, content: item.content || [] };
}
function _filterCitations(cits) {
    if (!Array.isArray(cits)) return [];
    return cits.filter(c => c && typeof c === 'object' && (c.metadata?.type !== 'file') && (c.metadata?.source !== 'my_files'));
}

// ─── Claude content-array processor (ported from helpers.js) ─────────────────
function _processContentArray(arr, msg, isHuman) {
    let text = '';
    (arr || []).forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const t = item.type || '';
        if (t === 'text') {
            text += item.text || '';
            if (Array.isArray(item.citations)) msg.citations.push(..._filterCitations(item.citations));
        } else if (t === 'image') {
            const src = item.source || {};
            const placeholder = ` [图片${msg.images.length + 1}] `;
            msg.images.push({ index: msg.images.length, file_name: `image_${idx}`, file_type: src.media_type || 'image/jpeg', display_mode: 'base64', embedded_image: { data: `data:${src.media_type};base64,${src.data}` }, placeholder });
            text += placeholder;
        } else if (t === 'thinking' && !isHuman) {
            msg.thinking = (item.thinking || '').trim();
        } else if (t === 'tool_use' && !isHuman) {
            if (item.name === 'artifacts') { const a = _extractArtifact(item); if (a) msg.artifacts.push(a); }
            else { const tool = _extractToolUse(item); if (tool) msg.tools.push(tool); }
        } else if (t === 'tool_result') {
            const res = _extractToolResult(item);
            if (item.name && item.name.includes('artifacts')) { if (msg.artifacts.length) msg.artifacts[msg.artifacts.length - 1].result = res; }
            else { if (msg.tools.length) msg.tools[msg.tools.length - 1].result = res; }
        }
    });
    msg.display_text += text.trim();
}

// ─── Build blank message object ──────────────────────────────────────────────
function _blankMsg(idx, uuid, parentUuid, sender, senderLabel, timestamp) {
    return { index: idx, uuid: uuid || '', parent_uuid: parentUuid || '', sender, sender_label: senderLabel, timestamp: timestamp || '', display_text: '', thinking: '', tools: [], artifacts: [], citations: [], images: [], attachments: [], branch_id: null, is_branch_point: false, branch_level: 0 };
}

// ─── Claude parser ────────────────────────────────────────────────────────────
function _parseClaude(d) {
    const meta = { title: d.name || 'Untitled', created_at: _fmtDate(d.created_at), updated_at: _fmtDate(d.updated_at), uuid: d.uuid || '', project_uuid: d.project_uuid || '', platform: 'claude' };
    const history = (d.chat_messages || []).map((m, i) => {
        const isHuman = m.sender === 'human';
        const msg = _blankMsg(i, m.uuid, m.parent_message_uuid, m.sender, isHuman ? 'User' : 'Claude', _fmtDate(m.created_at));
        if (Array.isArray(m.content)) _processContentArray(m.content, msg, isHuman);
        else if (m.text) { msg.display_text = m.text; }
        if (Array.isArray(m.attachments)) msg.attachments = m.attachments.map(a => ({ id: a.id || '', file_name: a.file_name || '', file_size: a.file_size || 0, file_type: a.file_type || '', extracted_content: a.extracted_content || '', created_at: _fmtDate(a.created_at) }));
        return msg;
    });
    return { meta_info: meta, chat_history: history, format: 'claude' };
}

// ─── Grok parser ──────────────────────────────────────────────────────────────
function _parseGrok(d) {
    const meta = { title: d.title || 'Untitled', created_at: _fmtDate(d.exportTime), uuid: d.conversationId || '', platform: 'grok' };
    const history = (d.responses || []).map((m, i) => {
        const isHuman = m.sender === 'human';
        const msg = _blankMsg(i, m.responseId, m.parentResponseId, m.sender, isHuman ? 'User' : 'Grok', _fmtDate(m.createTime));
        let text = m.message || '';
        if (Array.isArray(m.citations)) {
            const map = new Map();
            m.citations.forEach(c => map.set(c.id, c));
            text = text.replace(/<grok:render card_id="([^"]+)"[\s\S]*?<\/grok:render>/g, (_, id) => {
                const c = map.get(id); return c ? `[${c.title || 'Source'}](${c.url})` : '';
            }).replace(/<grok:render[\s\S]*?<\/grok:render>/g, '').trim();
            msg.citations = m.citations.map(c => ({ url: c.url, title: c.title || 'Source' }));
        }
        msg.display_text = text;
        if (Array.isArray(m.attachments)) msg.attachments = m.attachments;
        return msg;
    });
    return { meta_info: meta, chat_history: history, format: 'grok' };
}

// ─── Gemini / scraped parser ──────────────────────────────────────────────────
function _parseGemini(d) {
    const platform = d.platform || 'gemini';
    const meta = { title: d.title || 'Untitled', created_at: _fmtDate(d.exportedAt), uuid: platform + '_' + Date.now(), platform };
    const history = [];
    let idx = 0;
    (d.conversation || []).forEach(item => {
        if (item.human) {
            const hc = typeof item.human === 'string' ? { text: item.human } : item.human;
            const msg = _blankMsg(idx++, 'h_' + idx, '', 'human', 'User', meta.created_at);
            msg.display_text = hc.text || '';
            history.push(msg);
        }
        if (item.assistant) {
            const ac = typeof item.assistant === 'string' ? { text: item.assistant } : item.assistant;
            const msg = _blankMsg(idx++, 'a_' + idx, '', 'assistant', platform.charAt(0).toUpperCase() + platform.slice(1), meta.created_at);
            msg.display_text = ac.text || '';
            history.push(msg);
        }
    });
    return { meta_info: meta, chat_history: history, format: platform };
}

// ─── Dispatch parser by content ──────────────────────────────────────────────
function _parseRaw(jsonData) {
    if (!jsonData || typeof jsonData !== 'object') return null;
    if (jsonData.chat_history && jsonData.format) return jsonData; // already processed
    if (jsonData.chat_messages) return _parseClaude(jsonData);
    if (jsonData.responses && jsonData.conversationId !== undefined) return _parseGrok(jsonData);
    if (jsonData.conversation && jsonData.platform) return _parseGemini(jsonData);
    return null;
}

// ─── Format helpers (ported from formatHelpers.js) ───────────────────────────
function _escXml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function _details(summary, lines) {
    return ['<details>', `<summary>${summary}</summary>`, '', ...(Array.isArray(lines) ? lines : [lines]), '</details>', ''].join('\n');
}

function _fmtAttachments(atts, opts) {
    if (!atts || !atts.length) return '';
    const lines = ['<attachments>'];
    atts.forEach((a, i) => {
        lines.push(`<attachment index="${i+1}">`, `<file_name>${_escXml(a.file_name || '')}</file_name>`, `<file_size>${a.file_size || 0}</file_size>`);
        if (a.created_at) lines.push(`<created_at>${_escXml(a.created_at)}</created_at>`);
        if (a.extracted_content) {
            lines.push('<attachment_content>');
            lines.push(opts?.includeAttachments !== false ? a.extracted_content : a.extracted_content.substring(0, 200) + (a.extracted_content.length > 200 ? '...' : ''));
            lines.push('</attachment_content>');
        }
        lines.push('</attachment>', '');
    });
    lines.push('</attachments>', '');
    return lines.join('\n');
}

function _fmtThinking(thinking, fmt, label) {
    label = label || _mdT('format.thinkingLabel', '💭 Thinking:');
    switch (fmt) {
        case 'xml': return ['<anthropic_thinking>', thinking, '</anthropic_thinking>', ''].join('\n');
        case 'emoji': return [label, '```', thinking, '```', ''].join('\n');
        default: return ['``` thinking', thinking, '```', ''].join('\n');
    }
}

function _fmtArtifact(a) {
    const typeLabel = _mdT('format.typeLabel', 'Type:');
    const langLabel = _mdT('format.language', 'Language:');
    const contLabel = _mdT('format.content', 'Content:');
    const artLabel  = _mdT('format.artifact', 'Artifact:');
    const noTitle   = _mdT('format.noTitle', '(no title)');
    const lines = [`${typeLabel} \`${a.type || ''}\``, ''];
    if (a.command === 'create' && a.content) {
        if (a.language) lines.push(`${langLabel} \`${a.language}\``);
        lines.push('', contLabel, `\`\`\`${a.language || ''}`, a.content, '```');
    }
    return _details(`${artLabel} ${a.title || noTitle}`, lines);
}

function _fmtTool(t) {
    const toolLabel   = _mdT('format.tool', 'Tool:');
    const queryLabel  = _mdT('format.searchQuery', 'Query:');
    const resultLabel = _mdT('format.searchResults', 'Results:');
    const noTitle     = _mdT('format.noTitle', '(no title)');
    const lines = [];
    if (t.query) lines.push(`${queryLabel} \`${t.query}\``, '');
    if (t.result?.content && t.name === 'web_search_tool') {
        lines.push(resultLabel, '');
        t.result.content.slice(0, 5).forEach((item, i) => lines.push(`${i+1}. [${item.title || noTitle}](${item.url || '#'})`));
    }
    return _details(`${toolLabel} ${t.name}`, lines);
}

function _fmtCitations(cits) {
    const label = _mdT('format.citations', 'Citations');
    const unk   = _mdT('format.unknownSource', 'Unknown');
    const lines = ['| Title | Source |', '| --- | --- |'];
    cits.forEach(c => {
        const url = c.url || '#';
        const src = url.includes('/') ? url.split('/')[2] : unk;
        lines.push(`| [${c.title || unk}](${url}) | ${src} |`);
    });
    return _details(label, lines);
}

function _branchMarker(msg) {
    if (msg.is_branch_point) return ' 🔀';
    if (msg.branch_level > 0) {
        const b = msg.branch_id || '';
        const dot = b.match(/^main((?:\.\d+)+)$/);
        if (dot) return ' ↳' + dot[1].slice(1).replace(/\./g, '-');
        const alt = [...b.matchAll(/_alt(\d+)/g)].map(m => m[1]).join('-');
        if (alt) return ' ↳' + alt;
        return ' ↳' + msg.branch_level;
    }
    return '';
}

function _senderLabel(msg, cfg) {
    const isHuman = msg.sender === 'human';
    const fmt = (cfg || {}).senderFormat || 'default';
    if (fmt === 'default') return isHuman ? 'User' : 'AI';
    if (fmt === 'human-assistant') return isHuman ? 'Human' : 'Assistant';
    if (fmt === 'custom' && cfg.humanLabel && cfg.assistantLabel) return isHuman ? cfg.humanLabel : cfg.assistantLabel;
    return msg.sender_label || (isHuman ? 'Human' : 'Assistant');
}

function _toExcelCol(n) { let r = ''; while (n > 0) { n--; r = String.fromCharCode(65 + (n % 26)) + r; n = Math.floor(n / 26); } return r; }

function _toRoman(n) {
    if (n <= 0 || n >= 4000) return String(n);
    const vs = [1000,900,500,400,100,90,50,40,10,9,5,4,1], ss = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let r = '';
    for (let i = 0; i < vs.length; i++) while (n >= vs[i]) { r += ss[i]; n -= vs[i]; }
    return r;
}

// ─── Markdown generation ──────────────────────────────────────────────────────
function _generateMarkdown(processedData, cfg) {
    cfg = cfg || {};
    const { meta_info = {}, chat_history = [] } = processedData;
    const title = meta_info.title || _mdT('metadata.defaultTitle', 'Conversation');
    const lines = [];

    // Header
    lines.push(`# ${title}`);
    lines.push(`*${_mdT('metadata.created', 'Created')}: ${meta_info.created_at || ''}*`);
    lines.push(`*${_mdT('metadata.exportTime', 'Exported')}: ${new Date().toLocaleString()}*`);
    lines.push('', '---', '');

    const thinkFmt = cfg.thinkingFormat || 'codeblock';
    const thinkLabel = _mdT('format.thinkingLabel', '💭 Thinking:');
    const hLevel = cfg.includeHeaderPrefix !== false ? '#'.repeat(cfg.headerLevel || 2) + ' ' : '';
    const msgLines = [];

    chat_history.forEach((msg, i) => {
        const num = i + 1;
        const bm = cfg.includeBranchMarkers !== false ? _branchMarker(msg) : '';
        let msgHeader = hLevel;
        if (cfg.includeNumbering !== false) {
            const fmt = cfg.numberingFormat || 'numeric';
            if (fmt === 'letter') msgHeader += _toExcelCol(num) + '. ';
            else if (fmt === 'roman') msgHeader += _toRoman(num) + '. ';
            else msgHeader += num + '. ';
        }
        msgHeader += _senderLabel(msg, cfg) + bm;

        const part = [msgHeader];
        if (cfg.includeTimestamps && msg.timestamp) part.push(`*${msg.timestamp}*`);
        part.push('');

        if (msg.thinking && cfg.includeThinking && msg.sender !== 'human' && (thinkFmt === 'codeblock' || thinkFmt === 'xml'))
            part.push(_fmtThinking(msg.thinking, thinkFmt, thinkLabel));
        if (msg.display_text) part.push(msg.display_text, '');
        if (msg.attachments?.length && cfg.includeAttachments !== false && msg.sender === 'human')
            part.push(_fmtAttachments(msg.attachments, cfg));
        if (msg.thinking && cfg.includeThinking && msg.sender !== 'human' && thinkFmt === 'emoji')
            part.push(_fmtThinking(msg.thinking, thinkFmt, thinkLabel));
        if (msg.artifacts?.length && cfg.includeArtifacts !== false && msg.sender !== 'human')
            msg.artifacts.forEach(a => part.push(_fmtArtifact(a)));
        if (msg.tools?.length && cfg.includeTools !== false)
            msg.tools.forEach(t => part.push(_fmtTool(t)));
        if (msg.citations?.length && cfg.includeCitations !== false)
            part.push(_fmtCitations(msg.citations));

        msgLines.push(part.join('\n'));
    });

    lines.push(msgLines.join('\n---\n\n'));
    return lines.join('\n');
}

// ─── Image processing ─────────────────────────────────────────────────────────
function _processImages(messages) {
    const imageFiles = [];
    const processed = messages.map(msg => {
        if (!msg.images || !msg.images.length) return msg;
        let text = msg.display_text || '';
        msg.images.forEach((img, idx) => {
            const placeholder = img.placeholder || ` [图片${idx + 1}] `;
            const data = img.embedded_image?.data || (img.is_embedded_image ? img.link : null);
            if (data) {
                const m = data.match(/^data:([^;]+);base64,(.+)$/);
                if (m) {
                    const ext = m[1].split('/')[1] || 'jpg';
                    const n = imageFiles.length + 1;
                    const zipPath = `images/img_${String(n).padStart(3,'0')}.${ext}`;
                    imageFiles.push({ zipPath, base64Data: m[2], mimeType: m[1] });
                    text = text.replace(placeholder.trim(), `![${img.file_name || 'image_' + n}](${zipPath})`);
                }
            }
        });
        return { ...msg, display_text: text };
    });
    return { messages: processed, imageFiles };
}

// ─── Context block ────────────────────────────────────────────────────────────
function _contextBlock(exportContext, knowledgeRefs) {
    if (!exportContext) return '';
    const { projectInfo, userMemory } = exportContext;
    if (!projectInfo && !userMemory) return '';
    const toStr = v => !v ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    const parts = [];
    if (userMemory) {
        const mem = toStr(userMemory.memories); if (mem) parts.push(`<userMemories>${mem.replace(/\n/g,'\\n')}</userMemories>`);
        const pref = toStr(userMemory.preferences); if (pref) parts.push(`<userPreferences>${pref.replace(/\n/g,'\\n')}</userPreferences>`);
    }
    if (projectInfo) {
        const mem = toStr(projectInfo.memory); if (mem) parts.push(`<projectMemories>${mem.replace(/\n/g,'\\n')}</projectMemories>`);
        const ins = toStr(projectInfo.instructions); if (ins) parts.push(`<projectInstructions>${ins.replace(/\n/g,'\\n')}</projectInstructions>`);
        if (knowledgeRefs?.length) parts.push(`<projectKnowledge>${knowledgeRefs.map(r=>`- [${r.name}](${r.zipPath})`).join('\\n')}</projectKnowledge>`);
    }
    return parts.length ? parts.join('') + '\n\n---\n\n' : '';
}

// ─── Download helpers ─────────────────────────────────────────────────────────
function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    (document.body || document.documentElement).appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}

async function _downloadMarkdownExport(result) {
    const { needsZip, mdText, imageFiles, knowledgeFiles, filename } = result;
    if (!needsZip) {
        _triggerDownload(new Blob([mdText], { type: 'text/markdown;charset=utf-8' }), filename);
        return;
    }
    // ZIP: use global fflate (extension injects fflate.min.js; userscript uses @require)
    const fl = (typeof fflate !== 'undefined') ? fflate : null;
    if (!fl || typeof fl.zip !== 'function') {
        // Fallback: download plain md without images
        console.warn('[Loominary] fflate not available, downloading Markdown without images');
        _triggerDownload(new Blob([mdText], { type: 'text/markdown;charset=utf-8' }), filename.replace('.zip', '.md'));
        return;
    }
    const entries = {};
    entries['conversation.md'] = fl.strToU8(mdText);
    for (const { zipPath, base64Data } of imageFiles) {
        const bin = atob(base64Data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        entries[zipPath] = bytes;
    }
    for (const { zipPath, content } of knowledgeFiles) {
        entries[zipPath] = fl.strToU8(content);
    }
    await new Promise((resolve, reject) => {
        fl.zip(entries, { level: 1 }, (err, data) => {
            if (err) { reject(err); return; }
            _triggerDownload(new Blob([data], { type: 'application/zip' }), filename);
            resolve();
        });
    });
}

// ─── Config builder ───────────────────────────────────────────────────────────
function _buildGenConfig(c) {
    c = c || {};
    return {
        includeTimestamps: !!c.includeTimestamps,
        includeThinking: !!c.includeThinking,
        includeArtifacts: c.includeArtifacts !== false,
        includeTools: !!c.includeTools,
        includeCitations: !!c.includeCitations,
        includeAttachments: c.includeAttachments !== false,
        includeBranchMarkers: c.includeBranchMarkers !== false,
        includeNumbering: c.includeNumbering !== false,
        numberingFormat: c.numberingFormat || 'numeric',
        senderFormat: c.senderFormat || 'default',
        humanLabel: c.humanLabel || 'Human',
        assistantLabel: c.assistantLabel || 'Assistant',
        includeHeaderPrefix: c.includeHeaderPrefix !== false,
        headerLevel: c.headerLevel || 2,
        thinkingFormat: c.thinkingFormat || 'codeblock',
    };
}

// ─── Read export config from storage ─────────────────────────────────────────
async function _readExportConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
        return new Promise(resolve =>
            chrome.storage.local.get(['loominary_export_config'], r => {
                const cfg = r.loominary_export_config || {};
                console.log('[Loominary] _readExportConfig (extension):', JSON.stringify(cfg));
                resolve(cfg);
            })
        );
    }
    // Userscript: localStorage on the AI site
    try {
        const raw = localStorage.getItem('loominary_export_config') || '{}';
        const cfg = JSON.parse(raw);
        console.log('[Loominary] _readExportConfig (userscript), raw:', raw);
        return cfg;
    }
    catch (_) { return {}; }
}

// ─── Main export entry point ──────────────────────────────────────────────────
async function loominaryExportMarkdown(rawData, baseFilename, exportConfig, exportContext) {
    const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const processedData = _parseRaw(parsedData);
    if (!processedData) {
        alert('[Loominary] Could not parse conversation data.');
        return;
    }

    const cfg = exportConfig || await _readExportConfig();
    const genCfg = _buildGenConfig(cfg);

    // Process images in messages
    const { messages: processedMsgs, imageFiles } = _processImages(processedData.chat_history || []);

    // Process knowledge files
    const knowledgeFiles = [];
    const knowledgeRefs = [];
    if (exportContext?.projectInfo?.knowledgeFiles) {
        exportContext.projectInfo.knowledgeFiles.forEach(({ name, content }) => {
            const safe = name.replace(/[<>:"/\\|?*]/g, '_');
            const zipPath = 'knowledge/' + safe;
            knowledgeFiles.push({ zipPath, content });
            knowledgeRefs.push({ name, zipPath });
        });
    }

    const contextBlock = _contextBlock(exportContext || null, knowledgeRefs);
    const bodyMd = _generateMarkdown({ ...processedData, chat_history: processedMsgs }, genCfg);
    const mdText = contextBlock ? contextBlock + bodyMd : bodyMd;

    const needsZip = imageFiles.length > 0 || knowledgeFiles.length > 0;
    const filename = (baseFilename || 'conversation') + (needsZip ? '.zip' : '.md');

    await _downloadMarkdownExport({ needsZip, mdText, imageFiles, knowledgeFiles, filename });
}
