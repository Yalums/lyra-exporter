// Version tracking system for Gemini (Optimized)
const VersionTracker = {
    tracker: null,
    scanInterval: null,
    hrefCheckInterval: null,
    currentHref: location.href,
    isTracking: false,
    isScanning: false,
    imageCache: new Map(),
    imagePool: new Map(),

    getImageHashKey: (img) => img ? `${img.size}-${img.format}-${img.data.substring(0, 100)}` : null,

    getOrFetchImage: async (imgElement, retries = 3) => {
        if (!imgElement.complete || !imgElement.naturalWidth) {
            await new Promise(r => {
                if (imgElement.complete) return r();
                imgElement.onload = imgElement.onerror = r;
                setTimeout(r, 2000);
            });
        }

        const url = imgElement.src;
        if (!url || url.startsWith('data:') || url.includes('drive-thirdparty.googleusercontent.com')
            || imgElement.classList.contains('new-file-icon') || imgElement.dataset.testId === 'new-file-icon') return null;
        if (VersionTracker.imageCache.has(url)) return VersionTracker.imageCache.get(url);

        for (let i = 1; i <= retries; i++) {
            try {
                const imageData = await gemini_processImageElement(imgElement);
                if (imageData) {
                    const hashKey = VersionTracker.getImageHashKey(imageData);
                    if (hashKey && VersionTracker.imagePool.has(hashKey)) {
                        const existing = VersionTracker.imagePool.get(hashKey);
                        VersionTracker.imageCache.set(url, existing);
                        return existing;
                    }
                    if (hashKey) VersionTracker.imagePool.set(hashKey, imageData);
                    VersionTracker.imageCache.set(url, imageData);
                    return imageData;
                }
            } catch (e) {
                if (i === retries) return null;
                await new Promise(r => setTimeout(r, 500 * i));
            }
        }
        return null;
    },

    createEmptyTracker: () => ({ turns: {}, order: [] }),

    resetTracker: (reason) => {
        VersionTracker.tracker = VersionTracker.createEmptyTracker();
        VersionTracker.imageCache.clear();
        VersionTracker.imagePool.clear();
    },

    startTracking: () => {
        if (VersionTracker.isTracking) return;
        VersionTracker.isTracking = true;
        VersionTracker.resetTracker();
        console.log('[Gemini] VersionTracker started, scan interval:', Config.TIMING.VERSION_SCAN_INTERVAL, 'ms');
        VersionTracker.scanInterval = setInterval(() => VersionTracker.scanOnce(), Config.TIMING.VERSION_SCAN_INTERVAL);
        VersionTracker.hrefCheckInterval = setInterval(() => {
            if (location.href !== VersionTracker.currentHref) {
                VersionTracker.currentHref = location.href;
                VersionTracker.resetTracker();
            }
        }, Config.TIMING.HREF_CHECK_INTERVAL);
    },

    stopTracking: () => {
        if (!VersionTracker.isTracking) return;
        VersionTracker.isTracking = false;
        clearInterval(VersionTracker.scanInterval);
        clearInterval(VersionTracker.hrefCheckInterval);
        VersionTracker.scanInterval = VersionTracker.hrefCheckInterval = null;
    },

    ensureTurn: (turnId) => {
        const tracker = VersionTracker.tracker;
        if (!tracker.turns[turnId]) {
            tracker.turns[turnId] = {
                id: turnId,
                userVersions: [], assistantVersions: [],
                userLastText: '', assistantCommittedText: '', assistantPendingText: '', assistantPendingSince: 0, assistantPendingImages: [],
                userImages: new Map(), assistantImages: new Map()
            };
            tracker.order.push(turnId);
        }
        return tracker.turns[turnId];
    },

    getTurnId: (node, idx) => node.getAttribute?.('data-message-id') || node.getAttribute?.('data-id') || `turn-${idx}`,

    areImageListsEqual: (a, b) => {
        if (!a && !b) return true;
        if (!a || !b || a.length !== b.length) return false;
        return a.every((img, i) => img.size === b[i].size && img.data === b[i].data);
    },

    handleUser: (turnId, text, images = []) => {
        const t = VersionTracker.ensureTurn(turnId);
        const value = (text || '').trim();
        if (!value && !images.length) return;

        const last = t.userVersions.at(-1);
        const lastImages = last ? (t.userImages.get(last.version) || []) : [];
        const isTextSame = last?.text === value;
        const isImagesSame = VersionTracker.areImageListsEqual(lastImages, images);

        if (isTextSame && isImagesSame) return;
        if (last?.text && !value && isImagesSame) return; // Skip intermediate edit state

        // 文本相同但图片变化（异步加载完成），更新现有版本的图片而非创建新版本
        if (isTextSame && !isImagesSame && images.length) {
            t.userImages.set(last.version, images);
            return;
        }

        const version = t.userVersions.length;
        t.userVersions.push({ version, type: version ? 'edit' : 'normal', text: value });
        if (images.length) t.userImages.set(version, images);
        t.userLastText = value;
    },

    handleAssistant: (turnId, domText, images = []) => {
        const t = VersionTracker.ensureTurn(turnId);
        const text = (domText || '').trim();
        if (!text && !images.length) return;

        const now = Date.now();
        if (text !== t.assistantPendingText) {
            t.assistantPendingText = text;
            t.assistantPendingSince = now;
            if (images.length) t.assistantPendingImages = images;
            return;
        }
        // 即使文本未变，也持续更新待处理图片（异步加载可能滞后）
        if (images.length) t.assistantPendingImages = images;
        if (now - t.assistantPendingSince < Config.TIMING.VERSION_STABLE) return;

        const userVersion = t.userVersions.at(-1)?.version ?? null;
        const last = t.assistantVersions.at(-1);
        const lastImages = last ? (t.assistantImages.get(last.version) || []) : [];

        if (last?.userVersion === userVersion && last?.text === text) {
            // 文本和 userVersion 相同时，如果只是图片变化（异步加载完成），更新现有版本的图片
            if (!VersionTracker.areImageListsEqual(lastImages, images) && images.length) {
                t.assistantImages.set(last.version, images);
            }
            t.assistantPendingSince = now;
            return;
        }

        const version = t.assistantVersions.length;
        t.assistantVersions.push({ version, type: version ? 'retry' : 'normal', userVersion, text });
        if (images.length) t.assistantImages.set(version, images);
        t.assistantCommittedText = text;
    },

    scanOnce: async () => {
        if (VersionTracker.isScanning) return;
        VersionTracker.isScanning = true;

        try {
            const turns = document.querySelectorAll('div.conversation-turn, div.single-turn, div.conversation-container');
            if (!turns.length) {
                // 每 30 秒输出一次调试信息，避免刷屏
                if (!VersionTracker._lastDebugLog || Date.now() - VersionTracker._lastDebugLog > 30000) {
                    VersionTracker._lastDebugLog = Date.now();
                    console.log('[Gemini] scanOnce: no turns found. DOM selectors tried: div.conversation-turn, div.single-turn, div.conversation-container');
                }
                return;
            }

            const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;

            for (const turn of turns) {
                const idx = Array.from(turns).indexOf(turn);
                const id = VersionTracker.getTurnId(turn, idx);
                let userImages = [], assistantImages = [];

                if (includeImages) {
                    // 排除文件类型图标（drive-thirdparty.googleusercontent.com）
                    const userImgEls = [...turn.querySelectorAll('user-query img, user-query-file-preview img, .file-preview-container img')]
                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com'));
                    // 只获取 message-content 内的图片，排除 model-thoughts
                    const modelContent = turn.querySelector('model-response message-content');
                    const modelImgEls = modelContent ? [...modelContent.querySelectorAll('img')]
                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com')) : [];

                    if (userImgEls.length) userImages = (await Promise.all(userImgEls.map(i => VersionTracker.getOrFetchImage(i)))).filter(Boolean);
                    if (modelImgEls.length) assistantImages = (await Promise.all(modelImgEls.map(i => VersionTracker.getOrFetchImage(i)))).filter(Boolean);
                }

                const userText = VersionTracker.getUserText(turn);
                const assistantText = VersionTracker.getAssistantText(turn);

                // 调试日志（每 30 秒最多输出一次）
                if (!VersionTracker._lastScanDebug || Date.now() - VersionTracker._lastScanDebug > 30000) {
                    if (idx === 0) VersionTracker._lastScanDebug = Date.now();
                    console.log(`[Gemini] Turn ${idx} id=${id}: userText=${userText.length}chars, assistantText=${assistantText.length}chars`,
                        turn.querySelector('user-query') ? 'has-user-query' : 'no-user-query',
                        turn.querySelector('message-content') ? 'has-message-content' : 'no-message-content',
                        turn.querySelector('.markdown-main-panel') ? 'has-markdown-panel' : 'no-markdown-panel');
                }

                VersionTracker.handleUser(id, userText, userImages);
                VersionTracker.handleAssistant(id, assistantText, assistantImages);
            }
        } finally {
            VersionTracker.isScanning = false;
        }
    },

    getUserText: (turn) => {
        const el = turn.querySelector('user-query .query-text, .query-text-line, [data-user-text]');
        if (!el) return '';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.cdk-visually-hidden').forEach(e => e.remove());
        return clone.innerText.trim();
    },

    getAssistantText: (turn) => {
        // 严格只从 message-content 获取内容，完全排除 model-thoughts
        const messageContent = turn.querySelector('message-content');
        if (!messageContent) return '';
        
        // 优先选择 markdown-main-panel
        let panel = messageContent.querySelector('.markdown-main-panel');
        if (!panel) {
            // 回退：使用整个 message-content，但要排除思考过程
            panel = messageContent;
        }
        
        const clone = panel.cloneNode(true);
        // 移除所有不需要的元素（含 Gemini 的屏幕阅读器隐藏文本）
        clone.querySelectorAll('button.retry-without-tool-button, model-thoughts, .model-thoughts, .thoughts-header, .cdk-visually-hidden').forEach(b => b.remove());
        
        const text = htmlToMarkdown(clone);
        // 过滤掉只有思考标题的短文本（通常小于50字符且不包含换行）
        if (text.length < 50 && !text.includes('\n') && !text.includes('*') && !text.includes('#')) {
            // 可能是思考标题如"分析分析"、"Analyzing"etc，跳过
            return '';
        }
        return text;
    },

    // 导出前强制提交所有待处理的 assistant 文本（忽略 VERSION_STABLE 延迟）
    forceCommitAll: () => {
        const { turns, order } = VersionTracker.tracker;
        for (const id of order) {
            const t = turns[id];
            if (!t || !t.assistantPendingText) continue;
            const text = t.assistantPendingText;
            const images = t.assistantPendingImages || [];
            const userVersion = t.userVersions.at(-1)?.version ?? null;
            const last = t.assistantVersions.at(-1);
            if (last?.userVersion === userVersion && last?.text === text) {
                // 文本已提交，但图片可能尚未更新
                if (images.length && !VersionTracker.areImageListsEqual(t.assistantImages.get(last.version) || [], images)) {
                    t.assistantImages.set(last.version, images);
                }
                continue;
            }
            const version = t.assistantVersions.length;
            t.assistantVersions.push({ version, type: version ? 'retry' : 'normal', userVersion, text });
            if (images.length) t.assistantImages.set(version, images);
            t.assistantCommittedText = text;
        }
    },

    buildVersionedData: (title, includeImages = true) => {
        const { turns, order } = VersionTracker.tracker;
        const result = [];
        console.log('[Gemini] buildVersionedData: tracked turns =', order.length, ', turnIds =', order);

        for (const id of order) {
            const t = turns[id];
            if (!t) continue;

            const mapVersions = (versions, imgMap) => versions
                .filter(v => v.text?.trim() || v.thinking?.trim() || (includeImages && imgMap.get(v.version)?.length))
                .map(v => {
                    const d = { version: v.version, type: v.type, text: v.text };
                    if (v.userVersion !== undefined) d.userVersion = v.userVersion;
                    if (v.thinking) d.thinking = v.thinking;
                    const imgs = includeImages ? imgMap.get(v.version) : null;
                    if (imgs?.length) d.images = imgs;
                    return d;
                });

            result.push({
                turnIndex: result.length,
                human: t.userVersions.length ? { versions: mapVersions(t.userVersions, t.userImages) } : null,
                assistant: t.assistantVersions.length ? { versions: mapVersions(t.assistantVersions, t.assistantImages) } : null
            });
        }

        return { title: title || 'Gemini Chat', platform: 'gemini', exportedAt: new Date().toISOString(), conversation: result };
    }
};

VersionTracker.tracker = VersionTracker.createEmptyTracker();

window.loominaryGeminiExport = (title) => {
    const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
    return VersionTracker.buildVersionedData(title || 'Gemini Chat', includeImages);
};
window.loominaryGeminiReset = () => VersionTracker.resetTracker();

function gemini_fetchViaGM(url) {
    return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            return reject(new Error('GM_xmlhttpRequest not available'));
        }
        GM_xmlhttpRequest({
            method: "GET", url, responseType: "blob",
            onload: r => r.status >= 200 && r.status < 300 ? resolve(r.response) : reject(new Error(`Status: ${r.status}`)),
            onerror: e => reject(new Error(e.statusText || 'Network error'))
        });
    });
}

async function gemini_processImageElement(imgElement) {
    if (!imgElement) return null;
    const url = imgElement.src;
    if (!url || url.includes('drive-thirdparty.googleusercontent.com')
        || imgElement.classList.contains('new-file-icon') || imgElement.dataset.testId === 'new-file-icon') return null;

    // data: URI 直接提取 base64，无需 fetch
    if (url.startsWith('data:')) {
        try {
            const commaIdx = url.indexOf(',');
            if (commaIdx === -1) return null;
            const header = url.slice(0, commaIdx); // e.g. "data:image/jpeg;base64"
            const semiIdx = header.indexOf(';');
            if (semiIdx === -1) return null;
            const mimeType = header.slice(5, semiIdx); // after "data:"
            if (!mimeType.startsWith('image/')) return null;
            const base64Data = url.slice(commaIdx + 1);
            const size = Math.round((base64Data.length * 3) / 4);
            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url.slice(0, 80) + '...' };
        } catch (e) {
            console.error('[Gemini] Failed to process data: URI image:', e);
            return null;
        }
    }

    try {
        let base64Data, mimeType, size;

        if (url.startsWith('blob:')) {
            try {
                const blob = await fetch(url).then(r => r.ok ? r.blob() : Promise.reject());
                base64Data = await Utils.blobToBase64(blob);
                mimeType = blob.type;
                size = blob.size;
            } catch {
                // Canvas fallback
                const canvas = document.createElement('canvas');
                canvas.width = imgElement.naturalWidth || imgElement.width;
                canvas.height = imgElement.naturalHeight || imgElement.height;
                canvas.getContext('2d').drawImage(imgElement, 0, 0);

                const isPhoto = canvas.width * canvas.height > 50000;
                const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
                mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                base64Data = dataURL.split(',')[1];
                size = Math.round((base64Data.length * 3) / 4);
            }
        } else {
            const blob = await gemini_fetchViaGM(url);
            base64Data = await Utils.blobToBase64(blob);
            mimeType = blob.type;
            size = blob.size;
        }

        return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
    } catch (e) {
        console.error('[Gemini] Failed to process image:', url, e);
        return null;
    }
}

const MD_TAGS = {
    h1: c => `\n# ${c}\n`, h2: c => `\n## ${c}\n`, h3: c => `\n### ${c}\n`,
    h4: c => `\n#### ${c}\n`, h5: c => `\n##### ${c}\n`, h6: c => `\n###### ${c}\n`,
    strong: c => `**${c}**`, b: c => `**${c}**`, em: c => `*${c}*`, i: c => `*${c}*`,
    hr: () => '\n---\n', br: () => '\n', p: c => `\n${c}\n`, div: c => c,
    blockquote: c => `\n> ${c.split('\n').join('\n> ')}\n`,
    table: c => `\n${c}\n`, thead: c => c, tbody: c => c, tr: c => `${c}|\n`,
    th: c => `| **${c}** `, td: c => `| ${c} `, li: c => c
};

function htmlToMarkdown(element) {
    if (!element) return '';

    // HTML实体解码器（修复了 Gemini 的 Trusted Types 安全拦截问题）
    const decodeHtmlEntities = (str) => {
        if (!str) return '';
        try {
            // 使用 DOMParser 将字符串解析为文档，直接提取 textContent，从而完美避开 innerHTML 赋值
            const parser = new DOMParser();
            const doc = parser.parseFromString(str, 'text/html');
            return doc.documentElement.textContent || str;
        } catch (e) {
            console.error('[Loominary] HTML entity decoding failed:', e);
            return str;
        }
    };

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();

        // ========== 数学公式处理 ==========
        // 处理 data-math 属性（Gemini 常用）
        const dataMathRaw = node.getAttribute('data-math');
        if (dataMathRaw) {
            // 解码HTML实体，确保LaTeX命令正确（如 &lt; -> <, &amp; -> &）
            const dataMath = decodeHtmlEntities(dataMathRaw);
            const content = dataMath.trim();
            // 检测是否为引用格式 [1] 或 [1, 2]
            if (/^\d+(,\s*\d+)*$/.test(content)) {
                // 检查后面是否跟着单位（区分引用和数值）
                let next = node.nextSibling;
                while (next && next.nodeType === 3 && !next.textContent.trim()) next = next.nextSibling;
                if (next) {
                    const text = (next.nodeType === 3 ? next.textContent : next.textContent || '').trim().toLowerCase();
                    const units = ['min', 's', 'sec', 'h', 'hr', 'd', 'day', 'g', 'kg', 'mg', 'l', 'ml', 'm', 'cm', 'mm', 'km', '%', '分', '秒', '时', '天', '克', '升', '米'];
                    if (units.some(u => text.startsWith(u))) {
                        return `$${content}$`; // 数值 + 单位
                    }
                }
                return `[${content}]`; // 引用
            }
            // 块级公式
            if (node.classList.contains('math-block')) {
                return `\n$$${dataMath}$$\n`;
            }
            return `$${dataMath}$`;
        }

        // 处理其他数学属性（data-tex, data-latex, KaTeX）
        const potentialLatexRaw = node.getAttribute('data-tex') || node.getAttribute('data-latex') || node.getAttribute('alt') || node.getAttribute('aria-label');
        if (potentialLatexRaw && (tag === 'math' || tag === 'img' || node.classList.contains('math') || /[=^\\_{]/.test(potentialLatexRaw))) {
            const potentialLatex = decodeHtmlEntities(potentialLatexRaw);
            let clean = potentialLatex.replace(/^Image of /, '').replace(/^Math formula: /, '');
            if (!clean.startsWith('$')) clean = `$${clean}$`;
            return clean;
        }

        // math 标签
        if (tag === 'math') {
            const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
            if (annotation) {
                const latex = decodeHtmlEntities(annotation.textContent.trim());
                return `$${latex}$`;
            }
            return node.textContent;
        }

        // KaTeX 元素
        if (node.classList.contains('katex-mathml')) {
            const annotation = node.querySelector('annotation');
            if (annotation) {
                const latex = decodeHtmlEntities(annotation.textContent);
                return `$${latex}$`;
            }
        }
        if (node.classList.contains('katex-html')) return '';

        // ========== 表格修复处理 ==========
        if (tag === 'table') {
            let md = '\n';
            let rows = Array.from(node.rows || node.querySelectorAll('tr'));

            // 提取数据矩阵
            let matrix = rows.map(row => {
                const cells = row.cells?.length > 0 ? Array.from(row.cells) : Array.from(row.querySelectorAll('td, th'));
                return cells.map(cell => processNode(cell).replace(/(\r\n|\n|\r)/gm, ' ').trim());
            });

            // 过滤完全空的行
            matrix = matrix.filter(row => row.some(cell => cell !== ''));
            if (matrix.length === 0) return '';

            // 确定最大列数
            const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);

            // 移除单列伪标题（如果表格明显是多列的）
            if (matrix.length > 1 && matrix[0].length === 1 && maxCols > 1) {
                matrix.shift();
            }

            // 生成 Markdown
            matrix.forEach((row, rIndex) => {
                // 填充到相同列数
                while (row.length < maxCols) row.push('');
                md += '| ' + row.join(' | ') + ' |\n';
                // 在第一行后添加分隔符
                if (rIndex === 0) {
                    md += '| ' + Array(maxCols).fill(':---').join(' | ') + ' |\n';
                }
            });
            return md + '\n';
        }

        const children = [...node.childNodes].map(processNode).join('');

        if (MD_TAGS[tag]) return MD_TAGS[tag](children);

        if (tag === 'code') {
            const inPre = node.parentElement?.tagName.toLowerCase() === 'pre';
            if (children.includes('\n') || inPre) return inPre ? children : `\n\`\`\`\n${children}\n\`\`\`\n`;
            return `\`${children}\``;
        }
        if (tag === 'pre') {
            const code = node.querySelector('code');
            if (code) {
                const lang = code.className.match(/language-(\w+)/)?.[1] || '';
                return `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n`;
            }
            return `\n\`\`\`\n${children}\n\`\`\`\n`;
        }
        if (tag === 'a') {
            const href = node.getAttribute('href');
            return href ? `[${children}](${href})` : children;
        }
        if (tag === 'ul') return `\n${[...node.children].map(li => `- ${processNode(li).replace(/^\n+/, '').replace(/\n+$/, '')}`).join('\n')}\n`;
        if (tag === 'ol') {
            const start = parseInt(node.getAttribute('start')) || 1;
            return `\n${[...node.children].map((li, i) => `${start + i}. ${processNode(li).replace(/^\n+/, '').replace(/\n+$/, '')}`).join('\n')}\n`;
        }

        return children;
    }

    let result = processNode(element).replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n').trim();

    // 后处理：移除图片标注文本（如 "$, AI generated$" "$，AI 生成$"）
    result = result.replace(/\$[,，]\s*AI.{1,100}?\$/g, '');

    // 后处理：修复独立成行的引用 [1, 2]
    result = result.replace(/([^\n])\n+(\[[\d,\s.]+\])\n+([^\n])/g, (match, prevChar, citation, nextChar) => {
        const isNextPunctuation = /[。，；：！？.,;:!?]/.test(nextChar);
        return `${prevChar} ${citation}${isNextPunctuation ? '' : ' '}${nextChar}`;
    });

    return result;
}

// ==================== AI Studio XHR 拦截 ====================
const AiStudioXHR = {
    capturedData: null,
    capturedTimestamp: 0,

    init: () => {
        if (State.currentPlatform !== 'aistudio') return;
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._aistudio_url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            this.addEventListener('load', function() {
                if (this._aistudio_url && (
                    this._aistudio_url.includes('ResolveDriveResource') ||
                    this._aistudio_url.includes('CreatePrompt') ||
                    this._aistudio_url.includes('UpdatePrompt')
                )) {
                    try {
                        const rawText = this.responseText.replace(/^\)\]\}'/, '').trim();
                        let json = JSON.parse(rawText);
                        if (Array.isArray(json) && json.length > 0) {
                            // Normalize: ResolveDriveResource returns [[...]], CreatePrompt/UpdatePrompt returns [...]
                            if (typeof json[0] === 'string' && json[0].startsWith('prompts/')) {
                                json = [json];
                            }
                            AiStudioXHR.capturedData = json;
                            AiStudioXHR.capturedTimestamp = Date.now();
                            console.log('[Loominary AI Studio] XHR intercepted:', rawText.length, 'chars');
                        }
                    } catch (err) {
                        console.error('[Loominary AI Studio] XHR parse error:', err.message);
                    }
                }
            });
            return originalSend.apply(this, arguments);
        };
        console.log('[Loominary AI Studio] XHR interceptor installed');
    },

    isTurn: (arr) => {
        if (!Array.isArray(arr)) return false;
        return arr.includes('user') || arr.includes('model');
    },

    findHistory: (node, depth = 0) => {
        if (depth > 4 || !Array.isArray(node)) return null;
        if (node.slice(0, 5).some(child => AiStudioXHR.isTurn(child))) return node;
        for (const child of node) {
            if (Array.isArray(child)) {
                const result = AiStudioXHR.findHistory(child, depth + 1);
                if (result) return result;
            }
        }
        return null;
    },

    extractText: (turn) => {
        const candidates = [];
        const scan = (item, d = 0) => {
            if (d > 3) return;
            if (typeof item === 'string' && item.length > 1 && !['user', 'model', 'function'].includes(item)) {
                candidates.push(item);
            } else if (Array.isArray(item)) {
                item.forEach(sub => scan(sub, d + 1));
            }
        };
        scan(turn.slice(0, 3));
        return candidates.sort((a, b) => b.length - a.length)[0] || '';
    },

    isThinking: (turn) => Array.isArray(turn) && turn.length > 19 && turn[19] === 1,
    isResponse: (turn) => Array.isArray(turn) && turn.length > 16 && turn[16] === 1,
    isCodeExec: (turn) => Array.isArray(turn) && turn.length > 10 && Array.isArray(turn[10]) && turn[10][0] === 1 && typeof turn[10][1] === 'string',
    isCodeResult: (turn) => Array.isArray(turn) && turn.length > 11 && Array.isArray(turn[11]) && turn[11][0] === 1 && typeof turn[11][1] === 'string',

    // 将 XHR 数据转换为 Loominary 的 conversation 格式
    parseToConversation: () => {
        if (!AiStudioXHR.capturedData) return null;
        try {
            const root = AiStudioXHR.capturedData[0];
            const history = AiStudioXHR.findHistory(root);
            if (!history) return null;

            const pairs = [];
            let pendingThinking = [];
            let pendingCode = [];
            let currentUser = null;

            for (const turn of history) {
                if (!Array.isArray(turn)) continue;
                const isUser = turn.includes('user');
                const isModel = turn.includes('model');

                if (isUser) {
                    const text = AiStudioXHR.extractText(turn);
                    if (text) currentUser = text;
                    pendingThinking = [];
                    pendingCode = [];
                } else if (isModel) {
                    const thinking = AiStudioXHR.isThinking(turn);
                    const response = AiStudioXHR.isResponse(turn);
                    const codeExec = AiStudioXHR.isCodeExec(turn);
                    const codeResult = AiStudioXHR.isCodeResult(turn);

                    if (codeExec) pendingCode.push({ type: 'code', content: turn[10][1] });
                    if (codeResult) pendingCode.push({ type: 'result', content: turn[11][1] });
                    if ((codeExec || codeResult) && !response && !thinking) continue;

                    if (thinking && !response) {
                        const text = AiStudioXHR.extractText(turn);
                        if (text) pendingThinking.push(text);
                    } else {
                        let text = AiStudioXHR.extractText(turn);
                        let assistantText = '';

                        // 添加代码执行（保留在正文中）
                        if (pendingCode.length > 0) {
                            for (const block of pendingCode) {
                                if (block.type === 'code') {
                                    assistantText += `<details>\n<summary><strong>Executable Code</strong></summary>\n\n\`\`\`python\n${block.content}\n\`\`\`\n\n</details>\n\n`;
                                } else if (block.type === 'result') {
                                    assistantText += `<details>\n<summary><strong>Code Execution Result</strong></summary>\n\n\`\`\`\n${block.content}\n\`\`\`\n\n</details>\n\n`;
                                }
                            }
                            pendingCode = [];
                        }

                        if (text) assistantText += text;

                        // 思考内容单独存储到 thinking 字段
                        const thinkingText = pendingThinking.length > 0 ? pendingThinking.join('\n\n').trim() : undefined;
                        pendingThinking = [];

                        if (assistantText || thinkingText) {
                            const assistantObj = { text: assistantText.trim() };
                            if (thinkingText) assistantObj.thinking = thinkingText;
                            pairs.push({
                                human: { text: currentUser || '[No preceding user prompt found]' },
                                assistant: assistantObj
                            });
                            currentUser = null;
                        }
                    }
                }
            }

            // 如果最后有未配对的用户消息
            if (currentUser) {
                pairs.push({
                    human: { text: currentUser },
                    assistant: { text: '[Model response is pending]' }
                });
            }

            return pairs.length > 0 ? pairs : null;
        } catch (e) {
            console.error('[Loominary AI Studio] XHR parse error:', e);
            return null;
        }
    },

    getTitle: () => {
        if (!AiStudioXHR.capturedData) return null;
        try {
            const root = AiStudioXHR.capturedData[0];
            if (Array.isArray(root[4]) && typeof root[4][0] === 'string') return root[4][0];
        } catch (e) {}
        return null;
    }
};

function getAIStudioScroller() {
    for (const sel of ['ms-chat-session ms-autoscroll-container', 'mat-sidenav-content', '.chat-view-container']) {
        const el = document.querySelector(sel);
        if (el && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) return el;
    }
    return document.documentElement;
}

async function extractDataIncremental_AiStudio(includeImages = true) {
    for (const turn of document.querySelectorAll('ms-chat-turn')) {
        if (collectedData.has(turn)) continue;

        const userEl = turn.querySelector('.chat-turn-container.user');
        const modelEl = turn.querySelector('.chat-turn-container.model');
        const turnData = { type: 'unknown', text: '', images: [] };

        if (userEl) {
            turnData.type = 'user';
            const textEl = userEl.querySelector('.user-prompt-container .turn-content');
            if (textEl) {
                const clone = textEl.cloneNode(true);
                // 移除 author-label（含时间戳如 "User 14:56"）
                clone.querySelectorAll('.author-label, .turn-separator').forEach(e => e.remove());
                let text = clone.innerText.trim();
                if (text) turnData.text = text;
            }
            if (includeImages) {
                const imgs = userEl.querySelectorAll('.user-prompt-container img');
                console.log('[Loominary AI Studio DOM] user turn: img elements found:', imgs.length, [...imgs].map(i => i.src?.slice(0, 50)));
                turnData.images = (await Promise.all([...imgs].map(gemini_processImageElement))).filter(Boolean);
                console.log('[Loominary AI Studio DOM] user turn: images processed:', turnData.images.length);
            }
        } else if (modelEl) {
            const chunks = modelEl.querySelectorAll('ms-prompt-chunk');
            const texts = [], thinkingTexts = [], imgPromises = [];

            chunks.forEach(chunk => {
                const thoughtChunk = chunk.querySelector('ms-thought-chunk');
                if (thoughtChunk) {
                    const cmark = thoughtChunk.querySelector('ms-cmark-node');
                    if (cmark) {
                        const md = htmlToMarkdown(cmark);
                        if (md) thinkingTexts.push(md);
                    }
                    return;
                }
                // ms-image-chunk 内的图片（模型生成的图片）
                if (includeImages) {
                    const imageChunk = chunk.querySelector('ms-image-chunk img');
                    if (imageChunk) {
                        imgPromises.push(gemini_processImageElement(imageChunk));
                        return;
                    }
                }
                const cmark = chunk.querySelector('ms-cmark-node');
                if (cmark) {
                    const md = htmlToMarkdown(cmark);
                    if (md) texts.push(md);
                    if (includeImages) [...cmark.querySelectorAll('img')].forEach(i => imgPromises.push(gemini_processImageElement(i)));
                }
            });

            const text = texts.join('\n\n').trim();
            const thinkingText = thinkingTexts.join('\n\n').trim();
            if (text || thinkingText) { turnData.type = 'model'; turnData.text = text; }
            if (thinkingText) turnData.thinking = thinkingText;
            if (includeImages) turnData.images = (await Promise.all(imgPromises)).filter(Boolean);
            console.log('[Loominary AI Studio DOM] model turn: text=' + text.length + 'chars, thinking=' + thinkingText.length + 'chars, images=' + turnData.images.length, 'chunks=' + chunks.length);
        }

        if (turnData.type !== 'unknown' && (turnData.text || turnData.images.length)) {
            collectedData.set(turn, turnData);
        }
    }
}

const ScraperHandler = {
    handlers: {
        gemini: {
            getTitle: () => {
                const domTitle = document.querySelector('[data-test-id="conversation-title"]')?.textContent?.trim();
                if (domTitle) return domTitle;
                const input = prompt('请输入对话标题 / Enter title:', '对话');
                return input === null ? null : (input || i18n.t('untitledChat'));
            },
            extractData: async (includeImages = true) => {
                const data = [];
                const turns = document.querySelectorAll("div.conversation-turn, div.single-turn, div.conversation-container");

                for (const container of turns) {
                    const userEl = container.querySelector("user-query .query-text, .query-text-line");
                    // 严格只从 message-content 获取内容
                    const messageContent = container.querySelector("message-content");
                    const modelEl = messageContent?.querySelector(".markdown-main-panel");

                    let humanText = "";
                    if (userEl) {
                        const userClone = userEl.cloneNode(true);
                        userClone.querySelectorAll('.cdk-visually-hidden').forEach(e => e.remove());
                        humanText = userClone.innerText.trim();
                    }
                    let assistantText = "";

                    if (modelEl) {
                        const clone = modelEl.cloneNode(true);
                        clone.querySelectorAll('button.retry-without-tool-button, model-thoughts, .model-thoughts, .thoughts-header, .cdk-visually-hidden').forEach(b => b.remove());
                        assistantText = htmlToMarkdown(clone);
                    } else if (messageContent) {
                        // 回退：使用整个 message-content
                        const clone = messageContent.cloneNode(true);
                        clone.querySelectorAll('button.retry-without-tool-button, model-thoughts, .model-thoughts, .thoughts-header, .cdk-visually-hidden').forEach(b => b.remove());
                        assistantText = htmlToMarkdown(clone);
                    }
                    
                    // 过滤掉只有思考标题的短文本
                    if (assistantText.length < 50 && !assistantText.includes('\n') && !assistantText.includes('*') && !assistantText.includes('#')) {
                        assistantText = "";
                    }

                    let userImages = [], modelImages = [];
                    if (includeImages) {
                        const uImgs = container.querySelectorAll("user-query img, user-query-file-preview img, .file-preview-container img");
                        // 只从 message-content 获取图片
                        const mImgs = messageContent?.querySelectorAll("img") || [];
                        userImages = (await Promise.all([...uImgs].map(gemini_processImageElement))).filter(Boolean);
                        modelImages = (await Promise.all([...mImgs].map(gemini_processImageElement))).filter(Boolean);
                    }

                    if (humanText || assistantText || userImages.length || modelImages.length) {
                        const human = { text: humanText };
                        const assistant = { text: assistantText };
                        if (userImages.length) human.images = userImages;
                        if (modelImages.length) assistant.images = modelImages;
                        data.push({ human, assistant });
                    }
                }
                return data;
            }
        },

        aistudio: {
            getTitle: () => {
                return AiStudioXHR.getTitle() || 'AI_Studio_Chat';
            },
            extractData: async (includeImages = true) => {
                console.log('[Loominary AI Studio] extractData called, includeImages:', includeImages);
                // 优先使用 XHR 拦截数据（即时、完整）
                const xhrResult = AiStudioXHR.parseToConversation();
                console.log('[Loominary AI Studio] XHR result:', xhrResult ? xhrResult.length + ' pairs' : 'null');
                if (xhrResult && xhrResult.length > 0) {
                    console.log('[Loominary AI Studio] Using XHR path');
                    // XHR 不含图片，通过滚动 DOM 补充提取
                    if (includeImages) {
                        console.log('[Loominary AI Studio] Starting DOM image collection');
                        const turns = document.querySelectorAll('ms-chat-turn');
                        console.log('[Loominary AI Studio] ms-chat-turn elements found:', turns.length);

                        if (turns.length > 0) {
                            const scroller = getAIStudioScroller();
                            scroller.scrollTop = 0;
                            await Utils.sleep(Config.TIMING.SCROLL_TOP_WAIT);

                            const imageMap = new Map();
                            const collectImages = async () => {
                                const currentTurns = document.querySelectorAll('ms-chat-turn');
                                for (const turn of currentTurns) {
                                    if (imageMap.has(turn)) continue;
                                    const allImgs = turn.querySelectorAll('ms-image-chunk img');
                                    const userImgs = [...turn.querySelectorAll('.chat-turn-container.user ms-image-chunk img')]
                                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com'));
                                    const modelImgs = [...turn.querySelectorAll('.chat-turn-container.model ms-image-chunk img')]
                                        .filter(img => !img.src.includes('drive-thirdparty.googleusercontent.com'));
                                    if (allImgs.length) {
                                        console.log('[Loominary AI Studio] Turn has', allImgs.length, 'img(s), user:', userImgs.length, 'model:', modelImgs.length,
                                            [...allImgs].map(i => i.src?.slice(0, 60)));
                                    }
                                    if (userImgs.length || modelImgs.length) {
                                        imageMap.set(turn, {
                                            userImages: (await Promise.all(userImgs.map(gemini_processImageElement))).filter(Boolean),
                                            modelImages: (await Promise.all(modelImgs.map(gemini_processImageElement))).filter(Boolean)
                                        });
                                    } else {
                                        imageMap.set(turn, null);
                                    }
                                }
                            };

                            let lastScrollTop = -1;
                            while (true) {
                                await collectImages();
                                if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 10) break;
                                lastScrollTop = scroller.scrollTop;
                                scroller.scrollTop += scroller.clientHeight * 0.85;
                                await Utils.sleep(Config.TIMING.SCROLL_DELAY);
                                if (scroller.scrollTop === lastScrollTop) break;
                            }
                            await collectImages();

                            const totalWithImages = [...imageMap.values()].filter(v => v !== null).length;
                            console.log('[Loominary AI Studio] Image collection done, turns with images:', totalWithImages);

                            // 按 DOM 顺序合并图片到 XHR pairs
                            let pairIdx = 0;
                            let pendingUserImages = null;
                            for (const turn of document.querySelectorAll('ms-chat-turn')) {
                                const data = imageMap.get(turn);
                                const isUser = turn.querySelector('.chat-turn-container.user');
                                const isModel = turn.querySelector('.chat-turn-container.model');
                                if (isUser && data?.userImages?.length) {
                                    pendingUserImages = data.userImages;
                                }
                                if (isModel) {
                                    if (pairIdx < xhrResult.length) {
                                        if (pendingUserImages) {
                                            xhrResult[pairIdx].human.images = pendingUserImages;
                                            pendingUserImages = null;
                                        }
                                        if (data?.modelImages?.length) {
                                            xhrResult[pairIdx].assistant.images = data.modelImages;
                                        }
                                    }
                                    pairIdx++;
                                }
                            }
                            console.log('[Loominary AI Studio] Image merge done, pairs processed:', pairIdx);
                        }
                    }
                    return xhrResult;
                }
                console.log('[Loominary AI Studio] Using DOM fallback path');

                // DOM 回退（滚动提取）
                collectedData.clear();
                const scroller = getAIStudioScroller();
                scroller.scrollTop = 0;
                await Utils.sleep(Config.TIMING.SCROLL_TOP_WAIT);

                let lastScrollTop = -1;
                while (true) {
                    await extractDataIncremental_AiStudio(includeImages);
                    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 10) break;
                    lastScrollTop = scroller.scrollTop;
                    scroller.scrollTop += scroller.clientHeight * 0.85;
                    await Utils.sleep(Config.TIMING.SCROLL_DELAY);
                    if (scroller.scrollTop === lastScrollTop) break;
                }

                await extractDataIncremental_AiStudio(includeImages);
                await Utils.sleep(500);

                const sorted = [];
                document.querySelectorAll('ms-chat-turn').forEach(t => {
                    if (collectedData.has(t)) sorted.push(collectedData.get(t));
                });

                const paired = [];
                let lastHuman = null;

                for (const item of sorted) {
                    if (item.type === 'user') {
                        lastHuman = lastHuman || { text: '', images: [] };
                        lastHuman.text = (lastHuman.text ? lastHuman.text + '\n' : '') + item.text;
                        if (item.images?.length) lastHuman.images.push(...item.images);
                    } else if (item.type === 'model') {
                        const human = { text: lastHuman?.text || "[No preceding user prompt found]" };
                        if (lastHuman?.images?.length) human.images = lastHuman.images;
                        const assistant = { text: item.text };
                        if (item.thinking) assistant.thinking = item.thinking;
                        if (item.images?.length) assistant.images = item.images;
                        paired.push({ human, assistant });
                        lastHuman = null;
                    }
                }

                if (lastHuman) {
                    const human = { text: lastHuman.text };
                    if (lastHuman.images?.length) human.images = lastHuman.images;
                    paired.push({ human, assistant: { text: "[Model response is pending]" } });
                }
                return paired;
            }
        }
    },

    buildConversationJson: async (platform, title) => {
        const handler = ScraperHandler.handlers[platform];
        if (!handler) throw new Error('Invalid platform handler');

        if (platform === 'gemini' && document.getElementById(Config.CANVAS_SWITCH_ID)?.checked) {
            // 导出前强制扫描一次，避免因 URL 变更重置或时序问题导致数据为空
            VersionTracker.isScanning = false; // 防止卡死
            await VersionTracker.scanOnce();
            VersionTracker.forceCommitAll();
            const includeImagesForVersioned = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
            const versionedData = VersionTracker.buildVersionedData(title, includeImagesForVersioned);
            if (versionedData.conversation.length > 0) return versionedData;
            // 版本追踪数据为空，回退到普通提取
        }

        const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
        const conversation = await handler.extractData(includeImages);
        if (!conversation?.length) throw new Error(i18n.t('noContent'));

        return { title, platform, exportedAt: new Date().toISOString(), conversation };
    },

    addButtons: (controlsArea, platform) => {
        const handler = ScraperHandler.handlers[platform];
        if (!handler) return;

        const colors = { gemini: '#1a73e8', aistudio: '#777779' };
        const color = colors[platform] || '#4285f4';
        const useInline = platform === 'gemini';

        const createToggle = (label, id, state, onChange) => {
            const toggle = Utils.createToggle(label, id, state);
            const input = toggle.querySelector('.loominary-switch input');
            if (input) {
                input.addEventListener('change', onChange);
                const slider = toggle.querySelector('.loominary-slider');
                if (slider) slider.style.setProperty('--theme-color', color);
            }
            return toggle;
        };

        if (platform === 'gemini') {
            controlsArea.appendChild(createToggle(i18n.t('versionTracking') || '版本追踪', Config.CANVAS_SWITCH_ID, State.includeCanvas, e => {
                State.includeCanvas = e.target.checked;
                localStorage.setItem('includeCanvas', State.includeCanvas);
                e.target.checked ? VersionTracker.startTracking() : VersionTracker.stopTracking();
            }));
            if (State.includeCanvas) VersionTracker.startTracking();
        }

        if (platform === 'gemini' || platform === 'aistudio') {
            controlsArea.appendChild(createToggle(i18n.t('includeImages'), Config.IMAGE_SWITCH_ID, State.includeImages, e => {
                State.includeImages = e.target.checked;
                localStorage.setItem('includeImages', State.includeImages);
            }));
        }

        const createActionBtn = (icon, label, action) => {
            const btn = Utils.createButton(`${icon} ${i18n.t(label)}`, action, useInline);
            if (useInline) Object.assign(btn.style, { backgroundColor: color, color: 'white' });
            return btn;
        };

        controlsArea.appendChild(createActionBtn(previewIcon, 'viewOnline', async btn => {
            const title = handler.getTitle();
            if (!title) return;
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('loading'));
            let progress = platform === 'aistudio' ? Utils.createProgressElem(controlsArea) : null;
            if (progress) progress.textContent = i18n.t('loading');
            try {
                const json = await ScraperHandler.buildConversationJson(platform, title);
                const filename = `${platform}_${Utils.sanitizeFilename(title)}_${new Date().toISOString().slice(0, 10)}.json`;
                await Communicator.open(JSON.stringify(json, null, 2), filename);
            } catch (e) {
                ErrorHandler.handle(e, 'Preview conversation', { userMessage: `${i18n.t('loadFailed')} ${e.message}` });
            } finally {
                Utils.restoreButton(btn, original);
                progress?.remove();
            }
        }));

        controlsArea.appendChild(createActionBtn(exportIcon, 'exportCurrentJSON', async btn => {
            const title = handler.getTitle();
            if (!title) return;
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('exporting'));
            let progress = platform === 'aistudio' ? Utils.createProgressElem(controlsArea) : null;
            if (progress) progress.textContent = i18n.t('exporting');
            try {
                const json = await ScraperHandler.buildConversationJson(platform, title);
                const baseName = `${platform}_${Utils.sanitizeFilename(title)}_${new Date().toISOString().slice(0, 10)}`;
                await loominaryExportMarkdown(json, baseName);
            } catch (e) {
                ErrorHandler.handle(e, 'Export conversation');
            } finally {
                Utils.restoreButton(btn, original);
                progress?.remove();
            }
        }));
    }
};
