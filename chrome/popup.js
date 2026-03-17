// popup.js — Loominary extension settings popup

const STORAGE_KEY = 'loominary_export_config';
const LANG_KEY = 'loominary_lang';

const DEFAULTS = {
  // 格式
  includeNumbering: true,
  numberingFormat: 'numeric',
  senderFormat: 'default',
  humanLabel: 'Human',
  assistantLabel: 'Claude',
  includeHeaderPrefix: true,
  headerLevel: 2,
  thinkingFormat: 'codeblock',
  // 内容
  includeTimestamps: false,
  includeThinking: false,
  includeArtifacts: true,
  includeCanvas: true,
  includeTools: false,
  includeCitations: false,
  includeAttachments: true,
  includeBranchMarkers: true,
  // Claude 附加信息
  includeProjectInfo: false,
  includeUserMemory: false,
  // 全部导出
  exportAllMode: 'zip',
  // 外观
  theme: 'dark'
};

const I18N = {
  zh: {
    saved: '已保存',
    sectionAppearance: '外观',
    theme: '主题',
    themeDark: '🌙 深色',
    themeLight: '☀️ 浅色',
    sectionFormat: '导出格式',
    numbering: '序号',
    numberingNone: '无',
    senderLabel: '发送者标签',
    senderDefault: '默认（用户 / AI）',
    headerPrefix: '标题前缀',
    headerNone: '无',
    thinkingFormat: '思考过程格式',
    thinkingCodeblock: '代码块',
    thinkingXml: 'XML 标签',
    thinkingEmoji: '表情符号',
    sectionContent: '导出内容',
    sectionContentDesc: '控制导出的 Markdown 文件中包含哪些内容',
    timestamps: '时间戳',
    timestampsDesc: '包含消息的发送时间',
    thinking: '思考过程',
    thinkingDesc: 'Claude 的内部思考过程',
    artifacts: 'Artifacts',
    artifactsDesc: '代码、文档等生成内容',
    tools: '工具使用',
    toolsDesc: '搜索、计算等工具调用记录',
    citations: '引用来源',
    citationsDesc: '网页链接等引用信息',
    attachments: '附件信息',
    attachmentsDesc: '用户上传的文件及其预览信息',
    branchMarkers: '分支标识符',
    branchMarkersDesc: '导出时包含分支标记（↳ 和 🔀）',
    sectionExportAll: '全部导出',
    exportAllMode: '导出方式',
    exportAllZip: '下载压缩包',
    exportAllApp: '打开应用（开发中）',
    sectionST: 'SillyTavern',
    sectionSTDesc: '在 SillyTavern 标签页中打开此弹窗，可直接导出当前对话',
    stExport: '导出当前 ST 对话',
    stExporting: '导出中…',
    stNoST: '当前标签页未检测到 SillyTavern',
    stNoChat: '当前没有打开的对话',
    stOk: '已发送，正在打开查看器…',
    stError: '导出失败：'
  },
  en: {
    saved: 'Saved',
    sectionAppearance: 'Appearance',
    theme: 'Theme',
    themeDark: '🌙 Dark',
    themeLight: '☀️ Light',
    sectionFormat: 'Export Format',
    numbering: 'Numbering',
    numberingNone: 'None',
    senderLabel: 'Sender Label',
    senderDefault: 'Default (User / AI)',
    headerPrefix: 'Header Prefix',
    headerNone: 'None',
    thinkingFormat: 'Thinking Format',
    thinkingCodeblock: 'Code Block',
    thinkingXml: 'XML Tags',
    thinkingEmoji: 'Emoji',
    sectionContent: 'Export Content',
    sectionContentDesc: 'Control what is included in the exported Markdown file',
    timestamps: 'Timestamps',
    timestampsDesc: 'Include message send time',
    thinking: 'Thinking',
    thinkingDesc: "Claude's internal thinking process",
    artifacts: 'Artifacts',
    artifactsDesc: 'Code, documents, and other generated content',
    tools: 'Tool Usage',
    toolsDesc: 'Search, calculation, and other tool call records',
    citations: 'Citations',
    citationsDesc: 'Web links and reference information',
    attachments: 'Attachments',
    attachmentsDesc: 'Uploaded files and their preview info',
    branchMarkers: 'Branch Markers',
    branchMarkersDesc: 'Include branch markers (↳ and 🔀) in export',
    sectionExportAll: 'Export All',
    exportAllMode: 'Export Mode',
    exportAllZip: 'Download ZIP',
    exportAllApp: 'Open App (WIP)',
    sectionST: 'SillyTavern',
    sectionSTDesc: 'Open this popup while on a SillyTavern tab to export the current chat',
    stExport: 'Export current ST chat',
    stExporting: 'Exporting…',
    stNoST: 'SillyTavern not detected on current tab',
    stNoChat: 'No chat is currently open',
    stOk: 'Sent — opening viewer…',
    stError: 'Export failed: '
  }
};

let config = { ...DEFAULTS };
let currentLang = 'zh';
let saveTimer = null;

// ── i18n ──
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.zh[key]) || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  refreshThemeBtn();
}

// ── 保存提示 ──
function showSaved() {
  const hint = document.getElementById('savedHint');
  hint.textContent = t('saved');
  hint.classList.add('visible');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => hint.classList.remove('visible'), 1500);
}

// ── 保存到 chrome.storage.local ──
function saveConfig() {
  chrome.storage.local.set({ [STORAGE_KEY]: config }, showSaved);
}

// ── 更新主题按钮文字 ──
function refreshThemeBtn() {
  const btn = document.getElementById('themeToggle');
  btn.textContent = config.theme === 'dark' ? t('themeDark') : t('themeLight');
}

// ── 将 config 填入 UI ──
function loadUI() {
  applyI18n();

  // 序号
  document.getElementById('numbering').value =
    config.includeNumbering ? config.numberingFormat : 'none';

  // 发送者
  document.getElementById('senderFormat').value = config.senderFormat || 'default';

  // 标题前缀
  document.getElementById('headerPrefix').value =
    config.includeHeaderPrefix ? String(config.headerLevel) : 'none';

  // 思考格式
  document.getElementById('thinkingFormat').value = config.thinkingFormat || 'codeblock';

  // 全部导出模式
  document.getElementById('exportAllMode').value = config.exportAllMode || 'zip';

  // 复选框
  const checkboxIds = [
    'includeTimestamps', 'includeThinking', 'includeArtifacts',
    'includeTools', 'includeCitations', 'includeAttachments', 'includeBranchMarkers',
    'includeProjectInfo', 'includeUserMemory'
  ];
  checkboxIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = config[id] !== undefined ? !!config[id] : !!DEFAULTS[id];
  });
}

// ── 绑定事件 ──
function bindEvents() {
  // 主题切换
  document.getElementById('themeToggle').addEventListener('click', () => {
    config.theme = config.theme === 'dark' ? 'light' : 'dark';
    refreshThemeBtn();
    saveConfig();
  });

  // 序号
  document.getElementById('numbering').addEventListener('change', e => {
    const v = e.target.value;
    if (v === 'none') {
      config.includeNumbering = false;
    } else {
      config.includeNumbering = true;
      config.numberingFormat = v;
    }
    saveConfig();
  });

  // 发送者标签
  document.getElementById('senderFormat').addEventListener('change', e => {
    config.senderFormat = e.target.value;
    if (e.target.value === 'human-assistant') {
      config.humanLabel = 'Human';
      config.assistantLabel = 'Assistant';
    } else {
      config.humanLabel = 'Human';
      config.assistantLabel = 'Claude';
    }
    saveConfig();
  });

  // 标题前缀
  document.getElementById('headerPrefix').addEventListener('change', e => {
    const v = e.target.value;
    if (v === 'none') {
      config.includeHeaderPrefix = false;
    } else {
      config.includeHeaderPrefix = true;
      config.headerLevel = parseInt(v, 10);
    }
    saveConfig();
  });

  // 思考过程格式
  document.getElementById('thinkingFormat').addEventListener('change', e => {
    config.thinkingFormat = e.target.value;
    saveConfig();
  });

  // 全部导出模式
  document.getElementById('exportAllMode').addEventListener('change', e => {
    config.exportAllMode = e.target.value;
    saveConfig();
  });

  // 复选框
  const checkboxIds = [
    'includeTimestamps', 'includeThinking', 'includeArtifacts',
    'includeTools', 'includeCitations', 'includeAttachments', 'includeBranchMarkers',
    'includeProjectInfo', 'includeUserMemory'
  ];
  checkboxIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', e => {
        config[id] = e.target.checked;
        saveConfig();
      });
    }
  });

  // SillyTavern 导出
  const stBtn = document.getElementById('stExportBtn');
  const stStatus = document.getElementById('stStatus');

  stBtn.addEventListener('click', async () => {
    stStatus.className = 'st-status';
    stStatus.textContent = '';
    stBtn.disabled = true;
    stBtn.textContent = t('stExporting');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Inject into the active tab via scripting API (activeTab permission covers this)
      // world: 'MAIN' is required to access window.SillyTavern set by the page's JS
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: async () => {
          if (!window.SillyTavern?.getContext) return { error: 'noST' };
          try {
            const ctx = window.SillyTavern.getContext();
            const { chat, characters, characterId, chatId, name1, name2, chatMetadata } = ctx;
            if (!chat || chat.length === 0) return { error: 'noChat' };
            const charName = (characters && characterId !== undefined)
              ? (characters[characterId]?.name || 'Unknown') : 'Unknown';
            const avatarUrl = (characters && characterId !== undefined)
              ? (characters[characterId]?.avatar || '') : '';

            // Extract rich character/world/persona context
            let stContext = null;
            const char = (characters && characterId !== undefined) ? characters[characterId] : null;
            if (char) {
              stContext = {
                character: {
                  name:                      char.name || '',
                  description:               char.description || '',
                  personality:               char.personality || '',
                  scenario:                  char.scenario || '',
                  system_prompt:             char.system_prompt || '',
                  post_history_instructions: char.post_history_instructions || '',
                  creator_notes:             char.creator_notes || '',
                  first_mes:                 char.first_mes || '',
                  mes_example:               char.mes_example || ''
                },
                characterBook: char.character_book || null,
                worldBooks: {},
                persona: null,
                instructPreset: null,
                syspromptPreset: null
              };
              // --- World books ---
              // 1. Character-linked world book
              const charWorldName = char.extensions?.world;
              if (charWorldName) {
                try {
                  const wb = await ctx.loadWorldInfo(charWorldName);
                  if (wb?.entries) stContext.worldBooks[charWorldName] = { entries: wb.entries, source: 'character' };
                } catch (e) { /* skip if unavailable */ }
              }
              // 2. Chat-level world book (bound via chat metadata key "world_info")
              const chatWorldName = chatMetadata?.world_info;
              if (chatWorldName && chatWorldName !== charWorldName) {
                try {
                  const wb = await ctx.loadWorldInfo(chatWorldName);
                  if (wb?.entries) stContext.worldBooks[chatWorldName] = { entries: wb.entries, source: 'chat' };
                } catch (e) { /* skip if unavailable */ }
              }
              // 3. Global world books (activated in the World Info panel)
              //    ST stores the list in world_info.globalSelect inside settings.json.
              //    We fetch it from the ST settings API endpoint.
              try {
                const wiResp = await fetch(`${window.location.origin}/api/settings/get`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                if (wiResp.ok) {
                  const wiData = await wiResp.json();
                  const globalSelected = wiData?.world_info?.globalSelect || [];
                  for (const wbName of globalSelected) {
                    if (stContext.worldBooks[wbName]) continue; // already loaded
                    try {
                      const wb = await ctx.loadWorldInfo(wbName);
                      if (wb?.entries) stContext.worldBooks[wbName] = { entries: wb.entries, source: 'global' };
                    } catch (e) { /* skip */ }
                  }
                }
              } catch (e) { /* settings API unavailable */ }

              // --- Persona ---
              const pus = ctx.powerUserSettings;
              const pid = pus?.default_persona;
              if (pid) {
                const pdesc = pus?.persona_descriptions?.[pid];
                stContext.persona = {
                  name: pus?.personas?.[pid] || '',
                  description: (typeof pdesc === 'string' ? pdesc : pdesc?.description) || ''
                };
                if (!stContext.persona.name && !stContext.persona.description) stContext.persona = null;
              }
              // --- Instruct preset ---
              const instruct = pus?.instruct;
              if (instruct?.preset) stContext.instructPreset = { name: instruct.preset, enabled: !!instruct.enabled };
              // --- System prompt preset ---
              //     Stored in power_user.sysprompt.name (ST 1.12+)
              const syspromptName = pus?.sysprompt?.name;
              if (syspromptName) stContext.syspromptPreset = { name: syspromptName, enabled: !!pus?.sysprompt?.enabled };
            }
            const origin = window.location.origin;
            // Fetch CSRF token from ST server (same as ST's own getRequestHeaders)
            let csrfToken = '';
            try {
              const tokenResp = await fetch(`${origin}/csrf-token`);
              if (tokenResp.ok) {
                const tokenData = await tokenResp.json();
                csrfToken = tokenData.token || '';
              }
            } catch (e) { /* no CSRF token, proceed anyway */ }
            const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken };
            // main_chat points to the IMMEDIATE parent, not the root.
            // Strip branch/checkpoint suffixes to find the root chat name.
            const mainChatName = chatMetadata?.main_chat || chatId;
            let rootName = mainChatName;
            // Strip trailing " - Branch #N" / " - Checkpoint #N" (may be chained)
            rootName = rootName.replace(/( - (Branch|Checkpoint) #\d+)+$/i, '');
            // Strip leading "Branch #N - " (old ST naming convention)
            rootName = rootName.replace(/^(Branch #\d+ - )+/i, '');
            console.log('[Loominary] mainChatName:', mainChatName, '→ rootName:', rootName);

            // Fetch all related branch files from ST's local API
            let allFiles = [];
            try {
              const resp = await fetch(`${origin}/api/characters/chats`, {
                method: 'POST', headers,
                body: JSON.stringify({ avatar_url: avatarUrl, simple: true })
              });
              console.log('[Loominary] /api/characters/chats status:', resp.status, 'avatarUrl:', avatarUrl, 'rootName:', rootName);
              if (resp.ok) {
                const allChats = await resp.json();
                console.log('[Loominary] allChats file_ids:', allChats.map(c => c.file_id));
                const related = allChats.filter(c => {
                  const fid = c.file_id;
                  // Exact match with root
                  if (fid === rootName) return true;
                  // New naming: "rootName - Branch #N" or "rootName - Checkpoint #N"
                  if (fid.startsWith(rootName + ' - Branch #') || fid.startsWith(rootName + ' - Checkpoint #')) return true;
                  // Old naming: "Branch #N - rootName"
                  if (fid.startsWith('Branch #') && fid.endsWith(' - ' + rootName)) return true;
                  return false;
                });
                console.log('[Loominary] related files:', related.map(c => c.file_id));
                for (const f of related) {
                  try {
                    const chatResp = await fetch(`${origin}/api/chats/get`, {
                      method: 'POST', headers,
                      body: JSON.stringify({ avatar_url: avatarUrl, file_name: f.file_id })
                    });
                    if (chatResp.ok) {
                      const messages = await chatResp.json();
                      allFiles.push({
                        content: messages.map(m => JSON.stringify(m)).join('\n'),
                        filename: f.file_name
                      });
                    }
                  } catch (e) { /* skip individual file errors */ }
                }
              }
            } catch (e) { /* ST API unavailable, fall through to current chat */ }

            // Fallback: export only the currently displayed branch
            if (allFiles.length === 0) {
              const meta = { chat_metadata: chatMetadata, user_name: name1 || 'User', character_name: charName };
              const safeChar = charName.replace(/[<>:"/\\|?*]/g, '_');
              const safeChatId = (chatId || 'export').replace(/[<>:"/\\|?*]/g, '_');
              allFiles = [{
                content: [JSON.stringify(meta), ...chat.map(m => JSON.stringify(m))].join('\n'),
                filename: `${safeChar} - ${safeChatId}.jsonl`
              }];
            }
            return { files: allFiles, stContext };
          } catch (e) {
            return { error: e.message };
          }
        }
      });

      const payload = results?.[0]?.result;
      if (!payload) throw new Error(t('stNoST'));
      if (payload.error === 'noST') throw new Error(t('stNoST'));
      if (payload.error === 'noChat') throw new Error(t('stNoChat'));
      if (payload.error) throw new Error(t('stError') + payload.error);

      const { files, stContext } = payload;
      const exportContext = stContext ? { stContext } : undefined;
      chrome.runtime.sendMessage({
        type: 'LOOMINARY_OPEN_SIDEPANEL',
        data: files.length === 1
          ? { ...files[0], exportContext }
          : { files, exportContext }
      });

      stStatus.className = 'st-status ok';
      stStatus.textContent = t('stOk');
    } catch (err) {
      stStatus.className = 'st-status error';
      stStatus.textContent = err.message || String(err);
    } finally {
      stBtn.disabled = false;
      stBtn.textContent = t('stExport');
    }
  });
}

// ── Firefox MV3 权限请求 ──
// Firefox MV3 中 host_permissions 是可选的，需要用户手动授权。
// 当用户点击扩展图标打开 popup 时，自动请求所有 host_permissions。
async function requestHostPermissions() {
  try {
    const manifest = chrome.runtime.getManifest();
    const origins = manifest.host_permissions || [];
    if (!origins.length) return;

    const granted = await chrome.permissions.contains({ origins });
    if (granted) return;

    const result = await chrome.permissions.request({ origins });
    if (result) {
      // 权限已授予，刷新当前标签页以注入 content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.reload(tab.id);
    }
  } catch (e) {
    // Chrome 中 host_permissions 已自动授予，忽略
  }
}

// ── 初始化：从 storage 读取语言和配置，再渲染 ──
chrome.storage.local.get([STORAGE_KEY, LANG_KEY], result => {
  config = { ...DEFAULTS, ...(result[STORAGE_KEY] || {}) };
  currentLang = result[LANG_KEY] || (navigator.language.startsWith('zh') ? 'zh' : 'en');
  document.documentElement.lang = currentLang === 'zh' ? 'zh' : 'en';
  loadUI();
  bindEvents();
  // Firefox: 自动请求 host_permissions
  requestHostPermissions();
});
