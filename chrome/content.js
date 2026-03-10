// ============================================================
// Loominary - Content Script
// Version: 0.1
// Built: 2026-03-11T02:22:44.596121
// ============================================================

(function() {
    'use strict';
    if (window.loominaryFetchInitialized) return;
    window.loominaryFetchInitialized = true;

    // 注入页面上下文脚本（用于拦截 fetch/XHR）
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(script);

    // 监听来自注入脚本的消息
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'LOOMINARY_USER_ID_CAPTURED') {
            localStorage.setItem('claudeUserId', event.data.userId);
        }
        if (event.data.type === 'LOOMINARY_TOKEN_CAPTURED') {
            localStorage.setItem('chatGPTToken', event.data.token);
        }
    });

// Extension Adapter Layer for Userscript GM_* API

const LOOMINARY_ENV = 'extension';

function GM_addStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
}

function GM_xmlhttpRequest(options) {
    const { method = 'GET', url, headers = {}, responseType, onload, onerror } = options;

    const fetchOptions = {
        method,
        headers,
        credentials: 'include'
    };

    fetch(url, fetchOptions)
        .then(async response => {
            let responseData;

            if (responseType === 'blob') {
                responseData = await response.blob();
            } else if (responseType === 'json') {
                responseData = await response.json();
            } else if (responseType === 'arraybuffer') {
                responseData = await response.arrayBuffer();
            } else {
                responseData = await response.text();
            }

            if (onload) {
                onload({
                    status: response.status,
                    statusText: response.statusText,
                    response: responseData,
                    responseText: typeof responseData === 'string' ? responseData : '',
                    responseHeaders: [...response.headers.entries()]
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\r\n')
                });
            }
        })
        .catch(error => {
            if (onerror) {
                onerror({
                    error: error.message,
                    statusText: error.message
                });
            }
        });

    return {
        abort: () => {
            console.log('[Loominary] Request abort not fully implemented');
        }
    };
}

        // Trusted Types support for CSP compatibility
        let trustedPolicy = null;
        if (typeof window.trustedTypes !== 'undefined' && window.trustedTypes.createPolicy) {
            try {
                trustedPolicy = window.trustedTypes.createPolicy('loominary-exporter-policy', {
                    createHTML: (input) => input
                });
                console.log('[Loominary] Trusted-Types policy created successfully');
            } catch (e) {
                console.warn('[Loominary] Failed to create Trusted-Types policy:', e);
            }
        }

        function safeSetInnerHTML(element, html) {
            if (!element) return;
            if (trustedPolicy) {
                element.innerHTML = trustedPolicy.createHTML(html);
            } else {
                element.innerHTML = html;
            }
        }

        const Config = {
            CONTROL_ID: 'loominary-controls',
            TOGGLE_ID: 'loominary-toggle-button',
            LANG_SWITCH_ID: 'loominary-lang-switch',
            TREE_SWITCH_ID: 'loominary-tree-mode-switch',
            IMAGE_SWITCH_ID: 'loominary-image-switch',
            EXPORTER_URL: 'https://claude.ai',
            EXPORTER_ORIGIN: 'https://claude.ai',
            TIMING: {
                SCROLL_DELAY: 250,
                SCROLL_TOP_WAIT: 1000,
                VERSION_STABLE: 1500,
                VERSION_SCAN_INTERVAL: 1000,
                HREF_CHECK_INTERVAL: 800,
                PANEL_INIT_DELAY: 2000,
                BATCH_EXPORT_SLEEP: 300,
                BATCH_EXPORT_YIELD: 0
            }
        };

        const State = {
            currentPlatform: (() => {
                const host = window.location.hostname;
                const path = window.location.pathname;
                console.log('[Loominary] Detecting platform, hostname:', host, 'path:', path);
                if (host.includes('claude.ai')) {
                    console.log('[Loominary] Platform detected: claude');
                    return 'claude';
                }
                console.log('[Loominary] Platform detected: null (unknown)');
                return null;
            })(),
            isPanelCollapsed: localStorage.getItem('exporterCollapsed') === 'true',
            includeImages: localStorage.getItem('includeImages') === 'true',
            capturedUserId: localStorage.getItem('claudeUserId') || '',
            panelInjected: false
        };

        const i18n = {
            languages: {
                zh: {
                    loading: '加载中...', exporting: '导出中...', compressing: '压缩中...', preparing: '准备中...',
                    exportSuccess: '导出成功!', noContent: '没有可导出的对话内容。',
                    exportCurrentJSON: '导出当前', exportAllConversations: '导出全部',
                    branchMode: '多分支', includeImages: '含图像',
                    enterFilename: '请输入文件名(不含扩展名):', untitledChat: '未命名对话',
                    uuidNotFound: '未找到对话UUID!', fetchFailed: '获取对话数据失败',
                    exportFailed: '导出失败: ', gettingConversation: '获取对话',
                    withImages: ' (处理图片中...)', successExported: '成功导出', conversations: '个对话!',
                    manualUserId: '手动设置ID', enterUserId: '请输入您的组织ID (settings/account):',
                    userIdSaved: '用户ID已保存!',
                    viewOnline: '预览对话',
                    loadFailed: '加载失败: ',
                    cannotOpenExporter: '无法打开 Loominary,请检查弹窗拦截',
                    versionTracking: '实时',
                    detectingConversations: '正在探测对话数量...',
                    foundConversations: '检测到',
                    selectExportCount: '请输入要导出最近的多少个对话 (输入 0 或留空导出全部):',
                    invalidNumber: '输入无效，请输入有效的数字',
                    exportCancelled: '已取消导出'
                },
                en: {
                    loading: 'Loading...', exporting: 'Exporting...', compressing: 'Compressing...', preparing: 'Preparing...',
                    exportSuccess: 'Export successful!', noContent: 'No conversation content to export.',
                    exportCurrentJSON: 'Export', exportAllConversations: 'Save All',
                    branchMode: 'Branch', includeImages: 'Images',
                    enterFilename: 'Enter filename (without extension):', untitledChat: 'Untitled Chat',
                    uuidNotFound: 'UUID not found!', fetchFailed: 'Failed to fetch conversation data',
                    exportFailed: 'Export failed: ', gettingConversation: 'Getting conversation',
                    withImages: ' (processing images...)', successExported: 'Successfully exported', conversations: 'conversations!',
                    manualUserId: 'Customize UUID', enterUserId: 'Organization ID (settings/account)',
                    userIdSaved: 'User ID saved!',
                    viewOnline: 'Preview',
                    loadFailed: 'Load failed: ',
                    cannotOpenExporter: 'Cannot open Loominary, please check popup blocker',
                    versionTracking: 'Realtime',
                    detectingConversations: 'Detecting conversations...',
                    foundConversations: 'Found',
                    selectExportCount: 'How many recent conversations to export? (Enter 0 or leave empty for all):',
                    invalidNumber: 'Invalid input, please enter a valid number',
                    exportCancelled: 'Export cancelled'
                }
            },
            currentLang: localStorage.getItem('exporterLanguage') || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
            t: (key) => i18n.languages[i18n.currentLang]?.[key] || key,
            setLanguage: (lang) => {
                i18n.currentLang = lang;
                localStorage.setItem('exporterLanguage', lang);
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ loominary_lang: lang });
                }
            },
            getLanguageShort() {
                return this.currentLang === 'zh' ? '简体中文' : 'English';
            }
        };

        // Sync initial language to chrome.storage for popup access
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ loominary_lang: i18n.currentLang });
        }

        const previewIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        const collapseIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
        const expandIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        const exportIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
        const zipIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11V9a7 7 0 0 0-7-7a7 7 0 0 0-7 7v2"></path><rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect></svg>';

        const ErrorHandler = {
            handle: (error, context, options = {}) => {
                const {
                    showAlert = true,
                    logToConsole = true,
                    userMessage = null
                } = options;

                const errorMsg = error?.message || String(error);
                const contextMsg = context ? `[${context}]` : '';

                if (logToConsole) {
                    console.error(`[Loominary] ${contextMsg}`, error);
                }

                if (showAlert) {
                    const displayMsg = userMessage || `${i18n.t('exportFailed')} ${errorMsg}`;
                    alert(displayMsg);
                }

                return false;
            }
        };

        const Utils = {
            sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

            sanitizeFilename: (name) => {
                if (!name) return 'unnamed';
                return name
                    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // 移除非法字符
                    .replace(/[\u0080-\uFFFF]/g, (c) => { // 移除非ASCII字符（保留中文）
                        const code = c.charCodeAt(0);
                        return (code >= 0x4e00 && code <= 0x9fa5) ? c : '';
                    })
                    .replace(/_{2,}/g, '_') // 多个下划线合并为一个
                    .replace(/^[._]+|[._]+$/g, '') // 移除首尾的点和下划线
                    .substring(0, 100) || 'unnamed';
            },

            blobToBase64: (blob) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }),

            downloadJSON: (jsonString, filename) => {
                const blob = new Blob([jsonString], { type: 'application/json' });
                Utils.downloadFile(blob, filename);
            },

            downloadFile: (blob, filename) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            },

            setButtonLoading: (btn, text) => {
                btn.disabled = true;
                safeSetInnerHTML(btn, `<div class="loominary-loading"></div> <span>${text}</span>`);
            },

            restoreButton: (btn, originalContent) => {
                btn.disabled = false;
                safeSetInnerHTML(btn, originalContent);
            },

            createButton: (innerHTML, onClick, useInlineStyles = false) => {
                const btn = document.createElement('button');
                btn.className = 'loominary-button';
                safeSetInnerHTML(btn, innerHTML);
                btn.addEventListener('click', () => onClick(btn));

                if (useInlineStyles) {
                    Object.assign(btn.style, {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '8px',
                        width: '100%',
                        maxWidth: '100%',
                        padding: '8px 12px',
                        margin: '8px 0',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        letterSpacing: '0.3px',
                        height: '32px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap'
                    });
                }

                return btn;
            },

            createToggle: (label, id, checked = false) => {
                const container = document.createElement('div');
                container.className = 'loominary-toggle';
                const labelSpan = document.createElement('span');
                labelSpan.className = 'loominary-toggle-label';
                labelSpan.textContent = label;

                const switchLabel = document.createElement('label');
                switchLabel.className = 'loominary-switch';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = id;
                input.checked = checked;

                const slider = document.createElement('span');
                slider.className = 'loominary-slider';

                switchLabel.appendChild(input);
                switchLabel.appendChild(slider);
                container.appendChild(labelSpan);
                container.appendChild(switchLabel);

                return container;
            },

            createProgressElem: (parent) => {
                const elem = document.createElement('div');
                elem.className = 'loominary-progress';
                parent.appendChild(elem);
                return elem;
            }
        };

        const Communicator = {
            open: async (jsonData, filename) => {
                try {
                    // 检测是否在 Chrome 扩展环境中
                    const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

                    if (isExtension) {
                        // Chrome 扩展模式：通过 runtime messaging 发送数据
                        const defaultFilename = filename || `${State.currentPlatform}_export_${new Date().toISOString().slice(0,10)}.json`;

                        chrome.runtime.sendMessage({
                            type: 'LOOMINARY_OPEN_SIDEPANEL',
                            data: {
                                content: jsonData,
                                filename: defaultFilename
                            }
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('[Loominary Extension] Send message error:', chrome.runtime.lastError);
                                alert(i18n.t('cannotOpenExporter') + ': ' + chrome.runtime.lastError.message);
                            } else {
                                console.log('[Loominary Extension] Side panel opened successfully');
                            }
                        });

                        return true;
                    } else {
                        // Userscript 模式：使用 window.open + postMessage
                        const exporterWindow = window.open(Config.EXPORTER_URL, '_blank');
                        if (!exporterWindow) {
                            alert(i18n.t('cannotOpenExporter'));
                            return false;
                        }

                        const checkInterval = setInterval(() => {
                            try {
                                exporterWindow.postMessage({
                                    type: 'LOOMINARY_HANDSHAKE',
                                    source: 'loominary-fetch-script'
                                }, Config.EXPORTER_ORIGIN);
                            } catch (e) {
                            }
                        }, 1000);

                        const handleMessage = (event) => {
                            if (event.origin !== Config.EXPORTER_ORIGIN) {
                                return;
                            }
                            if (event.data && event.data.type === 'LOOMINARY_READY') {
                                clearInterval(checkInterval);
                                const dataToSend = {
                                    type: 'LOOMINARY_LOAD_DATA',
                                    source: 'loominary-fetch-script',
                                    data: {
                                        content: jsonData,
                                        filename: filename || `${State.currentPlatform}_export_${new Date().toISOString().slice(0,10)}.json`
                                    }
                                };
                                exporterWindow.postMessage(dataToSend, Config.EXPORTER_ORIGIN);
                                window.removeEventListener('message', handleMessage);
                            }
                        };

                        window.addEventListener('message', handleMessage);

                        setTimeout(() => {
                            clearInterval(checkInterval);
                            window.removeEventListener('message', handleMessage);
                        }, 60000);

                        return true;
                    }
                } catch (error) {
                    alert(`${i18n.t('cannotOpenExporter')}: ${error.message}`);
                    return false;
                }
            }
        };

const ClaudeHandler = {
    _cache: {
        baseUrl: null,
        accountData: null,
        allConversations: null,
        allConversationsTime: 0,
    },
    init: () => {
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                function captureUserId(url) {
                    const match = url.match(/\\/api\\/organizations\\/([a-f0-9-]+)\\//);
                    if (match && match[1]) {
                        localStorage.setItem('claudeUserId', match[1]);
                        window.dispatchEvent(new CustomEvent('userIdCaptured', { detail: { userId: match[1] } }));
                    }
                }
                const originalXHROpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function() {
                    if (arguments[1]) captureUserId(arguments[1]);
                    return originalXHROpen.apply(this, arguments);
                };
                const originalFetch = window.fetch;
                window.fetch = function(resource) {
                    const url = typeof resource === 'string' ? resource : (resource.url || '');
                    if (url) captureUserId(url);
                    return originalFetch.apply(this, arguments);
                };
            })();
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
        window.addEventListener('userIdCaptured', (e) => {
            if (e.detail.userId) State.capturedUserId = e.detail.userId;
        });
    },
    addUI: (controlsArea) => {

        const savedTreeMode = localStorage.getItem('treeMode');
        const treeMode = savedTreeMode !== null ? savedTreeMode === 'true' : true;
        const branchToggle = Utils.createToggle(i18n.t('branchMode'), Config.TREE_SWITCH_ID, treeMode);
        branchToggle.querySelector('input')?.addEventListener('change', (e) => {
            localStorage.setItem('treeMode', e.target.checked);
        });
        controlsArea.appendChild(branchToggle);

        controlsArea.appendChild(Utils.createToggle(i18n.t('includeImages'), Config.IMAGE_SWITCH_ID, State.includeImages));
        document.getElementById(Config.IMAGE_SWITCH_ID)?.addEventListener('change', (e) => {
            State.includeImages = e.target.checked;
            localStorage.setItem('includeImages', State.includeImages);
        });

        const memoryToggle = Utils.createToggle(
            i18n.currentLang === 'zh' ? '含记忆' : 'Memory',
            'loominary-memory-switch',
            false
        );
        const memoryToggleEl = memoryToggle.querySelector('input');
        controlsArea.appendChild(memoryToggle);
        ClaudeHandler.getAccountSettings().then(settings => {
            if (settings && memoryToggleEl) {
                memoryToggleEl.checked = settings.enabled_saffron !== false;
            }
        });
        memoryToggleEl?.addEventListener('change', async (e) => {
            const toggle = e.target;
            const newValue = toggle.checked;
            toggle.disabled = true;
            try {
                const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/account/settings`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ enabled_saffron: newValue })
                });
                if (!response.ok) throw new Error('Failed to update');
                location.reload();
            } catch (error) {
                toggle.checked = !newValue;
                toggle.disabled = false;
                State.showToast(i18n.currentLang === 'zh' ? '更新失败' : 'Update failed', 'error');
            }
        });
    },
    addButtons: (controlsArea) => {
        controlsArea.appendChild(Utils.createButton(
            `${previewIcon} ${i18n.t('viewOnline')}`,
            async (btn) => {
                const uuid = ClaudeHandler.getCurrentUUID();
                if (!uuid) { alert(i18n.t('uuidNotFound')); return; }
                if (!await ClaudeHandler.ensureUserId()) return;
                const original = btn.innerHTML;
                Utils.setButtonLoading(btn, i18n.t('loading'));
                try {
                    const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
                    const [data, meta] = await Promise.all([
                        ClaudeHandler.getConversation(uuid, includeImages),
                        ClaudeHandler.getConversationMeta(uuid)
                    ]);
                    if (!data) throw new Error(i18n.t('fetchFailed'));
                    if (meta) {
                        if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                        if (meta.project) data.project = meta.project;
                    }
                    const jsonString = JSON.stringify(data, null, 2);
                    const filename = `claude_${data.name || 'conversation'}_${uuid.substring(0, 8)}.json`;
                    await Communicator.open(jsonString, filename);
                } catch (error) {
                    ErrorHandler.handle(error, 'Preview conversation', {
                        userMessage: `${i18n.t('loadFailed')} ${error.message}`
                    });
                } finally {
                    Utils.restoreButton(btn, original);
                }
            }
        ));
        controlsArea.appendChild(Utils.createButton(
            `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
            async (btn) => {
                const uuid = ClaudeHandler.getCurrentUUID();
                if (!uuid) { alert(i18n.t('uuidNotFound')); return; }
                if (!await ClaudeHandler.ensureUserId()) return;
                const filename = prompt(i18n.t('enterFilename'), Utils.sanitizeFilename(`claude_${uuid.substring(0, 8)}`));
                if (!filename?.trim()) return;
                const original = btn.innerHTML;
                Utils.setButtonLoading(btn, i18n.t('exporting'));
                try {
                    const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
                    const [data, meta] = await Promise.all([
                        ClaudeHandler.getConversation(uuid, includeImages),
                        ClaudeHandler.getConversationMeta(uuid)
                    ]);
                    if (!data) throw new Error(i18n.t('fetchFailed'));
                    if (meta) {
                        if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                        if (meta.project) data.project = meta.project;
                    }
                    Utils.downloadJSON(JSON.stringify(data, null, 2), `${filename.trim()}.json`);
                } catch (error) {
                    ErrorHandler.handle(error, 'Export conversation');
                } finally {
                    Utils.restoreButton(btn, original);
                }
            }
        ));
        controlsArea.appendChild(Utils.createButton(
            `${zipIcon} ${i18n.t('exportAllConversations')}`,
            (btn) => ClaudeHandler.exportAll(btn, controlsArea)
        ));
    },
    getCurrentUUID: () => window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/)?.[1],
    ensureUserId: async () => {
        if (State.capturedUserId) return State.capturedUserId;
        const saved = localStorage.getItem('claudeUserId');
        if (saved) {
            State.capturedUserId = saved;
            return saved;
        }
        alert('未能检测到用户ID / User ID not detected');
        return null;
    },
    getBaseUrl: () => {
        if (ClaudeHandler._cache.baseUrl) return ClaudeHandler._cache.baseUrl;
        let url;
        if (window.location.hostname.includes('claude.ai')) {
            url = 'https://claude.ai';
        } else {
            url = window.location.origin;
        }
        ClaudeHandler._cache.baseUrl = url;
        return url;
    },
    getAllConversations: async (skipCache = false) => {
        const now = Date.now();
        if (!skipCache && ClaudeHandler._cache.allConversations && now - ClaudeHandler._cache.allConversationsTime < 30000) {
            return ClaudeHandler._cache.allConversations;
        }
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/chat_conversations`);
            if (!response.ok) throw new Error('Fetch failed');
            const data = await response.json();
            ClaudeHandler._cache.allConversations = data;
            ClaudeHandler._cache.allConversationsTime = now;
            return data;
        } catch (error) {
            console.error('Get all conversations error:', error);
            return null;
        }
    },
    getConversationMeta: async (uuid) => {
        try {
            const allConvs = await ClaudeHandler.getAllConversations();
            if (!allConvs || !Array.isArray(allConvs)) return null;
            return allConvs.find(conv => conv.uuid === uuid) || null;
        } catch (error) {
            return null;
        }
    },
    getConversation: async (uuid, includeImages = false, _userId = null) => {
        const userId = _userId || await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const treeMode = document.getElementById(Config.TREE_SWITCH_ID)?.checked || false;
            const endpoint = treeMode ?
                `/api/organizations/${userId}/chat_conversations/${uuid}?tree=True&rendering_mode=messages&render_all_tools=true` :
                `/api/organizations/${userId}/chat_conversations/${uuid}`;
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}${endpoint}`);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const data = await response.json();
            data.organization_id = userId;
            if (includeImages && data.chat_messages) {
                const imagePromises = [];
                const baseUrl = ClaudeHandler.getBaseUrl();
                for (const msg of data.chat_messages) {
                    for (const key of ['files', 'files_v2', 'attachments']) {
                        if (Array.isArray(msg[key])) {
                            for (const file of msg[key]) {
                                const isImage = file.file_kind === 'image' || file.file_type?.startsWith('image/');
                                const imageUrl = file.preview_url || file.thumbnail_url || file.file_url;
                                if (isImage && imageUrl && !file.embedded_image) {
                                    const fullUrl = imageUrl.startsWith('http') ? imageUrl : baseUrl + imageUrl;
                                    imagePromises.push(
                                        fetch(fullUrl).then(async (imgResp) => {
                                            if (imgResp.ok) {
                                                const blob = await imgResp.blob();
                                                const base64 = await Utils.blobToBase64(blob);
                                                file.embedded_image = { type: 'image', format: blob.type, size: blob.size, data: base64, original_url: imageUrl };
                                            }
                                        }).catch(() => {})
                                    );
                                }
                            }
                        }
                    }
                }
                await Promise.all(imagePromises);
            }
            return data;
        } catch (error) {
            console.error('Get conversation error:', error);
            return null;
        }
    },
    getAllProjects: async () => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects`);
            if (!response.ok) throw new Error('Fetch projects failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getProjectDetail: async (projectUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects/${projectUuid}`);
            if (!response.ok) throw new Error('Fetch project detail failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getGlobalMemory: async () => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/memory`);
            if (!response.ok) throw new Error('Fetch global memory failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getProjectMemory: async (projectUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/memory?project_uuid=${projectUuid}`);
            if (!response.ok) throw new Error('Fetch project memory failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    getUserProfile: async () => {
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/account_profile`);
            if (!response.ok) throw new Error('Fetch user profile failed');
            return await response.json();
        } catch (error) {
            return null;
        }
    },
    _fetchAccountData: async () => {
        if (ClaudeHandler._cache.accountData) return ClaudeHandler._cache.accountData;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/account`);
            if (!response.ok) return null;
            const data = await response.json();
            ClaudeHandler._cache.accountData = data;
            return data;
        } catch (error) {
            return null;
        }
    },
    getAccountSettings: async () => {
        const data = await ClaudeHandler._fetchAccountData();
        return data?.settings || null;
    },
    getAccountInfo: async () => {
        return await ClaudeHandler._fetchAccountData();
    },
    getProjectFiles: async (projectUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects/${projectUuid}/docs`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            return [];
        }
    },
    getProjectFileContent: async (projectUuid, fileUuid) => {
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return null;
        try {
            const response = await fetch(`${ClaudeHandler.getBaseUrl()}/api/organizations/${userId}/projects/${projectUuid}/docs/${fileUuid}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.content || data;
        } catch (error) {
            return null;
        }
    },
    exportAll: async (btn, controlsArea) => {
        if (typeof fflate === 'undefined' || typeof fflate.zip !== 'function' || typeof fflate.strToU8 !== 'function') {
            const errorMsg = i18n.currentLang === 'zh'
                ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
            alert(errorMsg);
            return;
        }
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return;

        const original = btn.innerHTML;
        Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

        let allConvs;
        try {
            allConvs = await ClaudeHandler.getAllConversations();
            if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
        } catch (error) {
            ErrorHandler.handle(error, 'Detect conversations');
            Utils.restoreButton(btn, original);
            return;
        }

        const totalCount = allConvs.length;
        Utils.restoreButton(btn, original);

        const promptMsg = `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;
        const userInput = prompt(promptMsg, totalCount.toString());

        if (userInput === null) {
            alert(i18n.t('exportCancelled'));
            return;
        }

        let exportCount = totalCount;
        const trimmedInput = userInput.trim();

        if (trimmedInput !== '' && trimmedInput !== '0') {
            const parsed = parseInt(trimmedInput, 10);
            if (isNaN(parsed) || parsed < 0) {
                alert(i18n.t('invalidNumber'));
                return;
            }
            exportCount = Math.min(parsed, totalCount);
        }

        const progress = Utils.createProgressElem(controlsArea);
        progress.textContent = i18n.t('preparing');
        Utils.setButtonLoading(btn, i18n.t('exporting'));

        const accountInfo = await ClaudeHandler.getAccountInfo();
        const accountName = Utils.sanitizeFilename(accountInfo?.display_name || accountInfo?.full_name || 'claude');

        try {
            const includeImages = document.getElementById(Config.IMAGE_SWITCH_ID)?.checked || false;
            let exported = 0;
            const convsToExport = allConvs.slice(0, exportCount);
            const zipEntries = {};

            const BATCH_SIZE = 25;
            for (let i = 0; i < convsToExport.length; i += BATCH_SIZE) {
                const batch = convsToExport.slice(i, i + BATCH_SIZE);
                progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}-${Math.min(i + BATCH_SIZE, convsToExport.length)}/${convsToExport.length}${includeImages ? i18n.t('withImages') : ''}`;

                const results = await Promise.allSettled(
                    batch.map(conv => ClaudeHandler.getConversation(conv.uuid, includeImages, userId).then(data => ({ conv, data })))
                );

                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.data) {
                        const { conv, data } = result.value;
                        if (conv.project_uuid) data.project_uuid = conv.project_uuid;
                        if (conv.project) data.project = conv.project;
                        const title = Utils.sanitizeFilename(data.name || conv.uuid);
                        const filename = `claude_${conv.uuid.substring(0, 8)}_${title}.json`;
                        zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                        exported++;
                    }
                }

                if (i + BATCH_SIZE < convsToExport.length) {
                    await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                }
            }

            progress.textContent = i18n.currentLang === 'zh' ? '正在获取项目数据...' : 'Fetching project data...';
            const projectsMeta = { exported_at: new Date().toISOString(), organization_id: userId, user_instructions: null, global_memory: null, projects: [] };

            try {
                const profile = await ClaudeHandler.getUserProfile();
                if (profile?.conversation_preferences) projectsMeta.user_instructions = profile.conversation_preferences;
            } catch (e) {}

            try {
                const globalMem = await ClaudeHandler.getGlobalMemory();
                if (globalMem) projectsMeta.global_memory = globalMem;
            } catch (e) {}

            try {
                const projects = await ClaudeHandler.getAllProjects();
                if (projects && Array.isArray(projects)) {
                    const projectResults = await Promise.allSettled(
                        projects.map(async (proj) => {
                            const [detail, memory, files] = await Promise.all([
                                ClaudeHandler.getProjectDetail(proj.uuid),
                                ClaudeHandler.getProjectMemory(proj.uuid),
                                ClaudeHandler.getProjectFiles(proj.uuid)
                            ]);
                            const knowledgeFiles = [];
                            if (files && files.length > 0) {
                                const fileResults = await Promise.allSettled(
                                    files.map((file, fileIdx) =>
                                        ClaudeHandler.getProjectFileContent(proj.uuid, file.uuid).then(content => ({ file, fileIdx, content }))
                                    )
                                );
                                for (const result of fileResults) {
                                    if (result.status === 'fulfilled' && result.value.content) {
                                        const { file, fileIdx, content } = result.value;
                                        const rawName = file.file_name || file.uuid;
                                        const ext = rawName.match(/\.([^.]+)$/)?.[1] || 'txt';
                                        const baseName = Utils.sanitizeFilename(rawName.replace(/\.[^.]+$/, '')) || 'file';
                                        const projName = Utils.sanitizeFilename(proj.name || proj.uuid.substring(0, 8));
                                        const needsPrefix = /[\u0080-\uFFFF]/.test(rawName) && !/[\u4e00-\u9fa5]/.test(rawName);
                                        const seqNum = needsPrefix ? String(fileIdx + 1).padStart(3, '0') + '_' : '';
                                        const filename = `projects/${projName}_${seqNum}${baseName}.${ext}`;
                                        zipEntries[filename] = fflate.strToU8(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
                                        knowledgeFiles.push(filename);
                                    }
                                }
                            }
                            return {
                                uuid: proj.uuid,
                                name: proj.name || '(unnamed)',
                                description: detail?.description || '',
                                instructions: detail?.prompt_template || '',
                                memory: memory?.memory || '',
                                memory_updated_at: memory?.updated_at || null,
                                archived: !!proj.archived_at,
                                knowledge_files: knowledgeFiles
                            };
                        })
                    );
                    for (const result of projectResults) {
                        if (result.status === 'fulfilled') projectsMeta.projects.push(result.value);
                    }
                }
            } catch (e) {}

            zipEntries[`projects/${userId}_projects.json`] = fflate.strToU8(JSON.stringify(projectsMeta, null, 2));

            progress.textContent = `${i18n.t('compressing')}…`;

            const zipUint8 = await new Promise((resolve, reject) => {
                fflate.zip(zipEntries, { level: 1 }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            const zipBlob = new Blob([zipUint8], { type: 'application/zip' });
            const zipFilename = `claude_${accountName}_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;

            Utils.downloadFile(zipBlob, zipFilename);
            alert(`${i18n.t('successExported')} ${exported} ${i18n.t('conversations')}`);
        } catch (error) {
            ErrorHandler.handle(error, 'Export all conversations');
        } finally {
            Utils.restoreButton(btn, original);
            if (progress.parentNode) progress.parentNode.removeChild(progress);
        }
    }
};


    const UI = {

        injectStyle: () => {
            const platformColors = {
                claude: '#141413'
            };
            const buttonColor = platformColors[State.currentPlatform] || '#4285f4';
            console.log('[Loominary] Current platform:', State.currentPlatform);
            console.log('[Loominary] Button color:', buttonColor);
            document.documentElement.style.setProperty('--loominary-button-color', buttonColor);
            console.log('[Loominary] CSS variable --loominary-button-color set to:', buttonColor);
            const linkId = 'loominary-fetch-external-css';
                                    GM_addStyle(`
                #loominary-controls {
                    position: fixed !important;
                    top: 50% !important;
                    right: 0 !important;
                    transform: translateY(-50%) translateX(10px) !important;
                    background: white !important;
                    border: 1px solid #dadce0 !important;
                    border-radius: 8px !important;
                    padding: 16px 16px 8px 16px !important;
                    width: 136px !important;
                    z-index: 999999 !important;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
                    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }

                #loominary-controls.collapsed {
                    transform: translateY(-50%) translateX(calc(100% - 35px + 6px)) !important;
                    opacity: 0.6 !important;
                    background: white !important;
                    border-color: #dadce0 !important;
                    border-radius: 8px 0 0 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    pointer-events: none !important;
                }
                #loominary-controls.collapsed .loominary-main-controls {
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                #loominary-controls:hover {
                    opacity: 1 !important;
                }

                #loominary-toggle-button {
                    position: absolute !important;
                    left: 0 !important;
                    top: 50% !important;
                    transform: translateY(-50%) translateX(-50%) !important;
                    cursor: pointer !important;
                    width: 32px !important;
                    height: 32px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: #ffffff !important;
                    color: var(--loominary-button-color) !important;
                    border-radius: 50% !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
                    border: 1px solid #dadce0 !important;
                    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    z-index: 1000 !important;
                    pointer-events: all !important;
                }

                #loominary-controls.collapsed #loominary-toggle-button {
                    z-index: 2 !important;
                    left: 16px !important;
                    transform: translateY(-50%) translateX(-50%) !important;
                    width: 21px !important;
                    height: 21px !important;
                    background: var(--loominary-button-color) !important;
                    color: white !important;
                }

                #loominary-controls.collapsed #loominary-toggle-button:hover {
                    box-shadow:
                        0 4px 12px rgba(0,0,0,0.25),
                        0 0 0 3px rgba(255,255,255,0.9) !important;
                    transform: translateY(-50%) translateX(-50%) scale(1.15) !important;
                    opacity: 0.9 !important;
                }

                .loominary-main-controls {
                    margin-left: 0px !important;
                    padding: 0 3px !important;
                    transition: opacity 0.7s !important;
                }

                .loominary-title {
                    font-size: 16px !important;
                    font-weight: 700 !important;
                    color: #202124 !important;
                    text-align: center;
                    margin-bottom: 12px !important;
                    padding-bottom: 0px !important;
                    letter-spacing: 0.3px !important;
                }

                .loominary-input-trigger {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 3px !important;
                    font-size: 10px !important;
                    margin: 10px auto 0 auto !important;
                    padding: 2px 6px !important;
                    border-radius: 3px !important;
                    background: transparent !important;
                    cursor: pointer !important;
                    transition: all 0.15s !important;
                    white-space: nowrap !important;
                    color: #5f6368 !important;
                    border: none !important;
                    font-weight: 500 !important;
                    width: fit-content !important;
                }

                .loominary-input-trigger:hover {
                    background: #f1f3f4 !important;
                    color: #202124 !important;
                }

                .loominary-button {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-start !important;
                    gap: 8px !important;
                    width: 100% !important;
                    padding: 8px 12px !important;
                    margin: 8px 0 !important;
                    border: none !important;
                    border-radius: 6px !important;
                    background: var(--loominary-button-color) !important;
                    color: white !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    letter-spacing: 0.3px !important;
                    height: 32px !important;
                    box-sizing: border-box !important;
                }
                .loominary-button svg {
                    width: 16px !important;
                    height: 16px !important;
                    flex-shrink: 0 !important;
                }
                .loominary-button:disabled {
                    opacity: 0.6 !important;
                    cursor: not-allowed !important;
                }

                .loominary-status {
                    font-size: 10px !important;
                    padding: 6px 8px !important;
                    border-radius: 4px !important;
                    margin: 4px 0 !important;
                    text-align: center !important;
                }
                .loominary-status.success {
                    background: #e8f5e9 !important;
                    color: #2e7d32 !important;
                    border: 1px solid #c8e6c9 !important;
                }
                .loominary-status.error {
                    background: #ffebee !important;
                    color: #c62828 !important;
                    border: 1px solid #ffcdd2 !important;
                }

                .loominary-toggle {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    color: #5f6368 !important;
                    margin: 3px 0 !important;
                    gap: 8px !important;
                    padding: 4px 8px !important;
                }

                .loominary-toggle:last-of-type {
                    margin-bottom: 14px !important;
                }

                .loominary-switch {
                    position: relative !important;
                    display: inline-block !important;
                    width: 32px !important;
                    height: 16px !important;
                    flex-shrink: 0 !important;
                }
                .loominary-switch input {
                    opacity: 0 !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .loominary-slider {
                    position: absolute !important;
                    cursor: pointer !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background-color: #ccc !important;
                    transition: .3s !important;
                    border-radius: 34px !important;
                    --theme-color: var(--loominary-button-color);
                }
                .loominary-slider:before {
                    position: absolute !important;
                    content: "" !important;
                    height: 12px !important;
                    width: 12px !important;
                    left: 2px !important;
                    bottom: 2px !important;
                    background-color: white !important;
                    transition: .3s !important;
                    border-radius: 50% !important;
                }
                input:checked + .loominary-slider {
                    background-color: var(--theme-color, var(--loominary-button-color)) !important;
                }
                input:checked + .loominary-slider:before {
                    transform: translateX(16px) !important;
                }

                .loominary-loading {
                    display: inline-block !important;
                    width: 14px !important;
                    height: 14px !important;
                    border: 2px solid rgba(255, 255, 255, 0.3) !important;
                    border-radius: 50% !important;
                    border-top-color: #fff !important;
                    animation: loominary-spin 0.8s linear infinite !important;
                }
                @keyframes loominary-spin {
                    to { transform: rotate(360deg); }
                }

                .loominary-progress {
                    font-size: 10px !important;
                    color: #5f6368 !important;
                    margin-top: 4px !important;
                    text-align: center !important;
                    padding: 4px !important;
                    background: #f8f9fa !important;
                    border-radius: 4px !important;
                }

                .loominary-lang-toggle {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 3px !important;
                    font-size: 10px !important;
                    margin: 4px auto 0 auto !important;
                    padding: 2px 6px !important;
                    border-radius: 3px !important;
                    background: transparent !important;
                    cursor: pointer !important;
                    transition: all 0.15s !important;
                    white-space: nowrap !important;
                    color: #5f6368 !important;
                    border: none !important;
                    font-weight: 500 !important;
                    width: fit-content !important;
                }
                .loominary-lang-toggle:hover {
                    background: #f1f3f4 !important;
                    color: #202124 !important;
                }
            `);
        },

        toggleCollapsed: () => {
            State.isPanelCollapsed = !State.isPanelCollapsed;
            localStorage.setItem('exporterCollapsed', State.isPanelCollapsed);
            const panel = document.getElementById(Config.CONTROL_ID);
            const toggle = document.getElementById(Config.TOGGLE_ID);
            if (!panel || !toggle) return;
            if (State.isPanelCollapsed) {
                panel.classList.add('collapsed');
                safeSetInnerHTML(toggle, collapseIcon);
            } else {
                panel.classList.remove('collapsed');
                safeSetInnerHTML(toggle, expandIcon);
            }
        },

        recreatePanel: () => {
            document.getElementById(Config.CONTROL_ID)?.remove();
            State.panelInjected = false;
            UI.createPanel();
        },

        createPanel: () => {
            if (document.getElementById(Config.CONTROL_ID) || State.panelInjected) return false;

            const container = document.createElement('div');
            container.id = Config.CONTROL_ID;

            const color = getComputedStyle(document.documentElement)
            .getPropertyValue('--loominary-button-color')
            .trim() || '#141413';
            container.style.setProperty('--loominary-button-color', color);

            if (State.isPanelCollapsed) container.classList.add('collapsed');

            const toggle = document.createElement('div');
            toggle.id = Config.TOGGLE_ID;
            safeSetInnerHTML(toggle, State.isPanelCollapsed ? collapseIcon : expandIcon);
            toggle.addEventListener('click', UI.toggleCollapsed);
            container.appendChild(toggle);

            const controls = document.createElement('div');
            controls.className = 'loominary-main-controls';

            const title = document.createElement('div');
            title.className = 'loominary-title';
            const titles = {
                claude: 'Claude'
            };
            title.textContent = titles[State.currentPlatform] || 'Exporter';
            controls.appendChild(title);

            if (State.currentPlatform === 'claude') {
                ClaudeHandler.addUI(controls);
                ClaudeHandler.addButtons(controls);

                const inputLabel = document.createElement('div');
                inputLabel.className = 'loominary-input-trigger';
                inputLabel.textContent = `${i18n.t('manualUserId')}`;
                inputLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterUserId'), State.capturedUserId);
                    if (newId?.trim()) {
                        State.capturedUserId = newId.trim();
                        localStorage.setItem('claudeUserId', State.capturedUserId);
                        alert(i18n.t('userIdSaved'));
                        UI.recreatePanel();
                    }
                });
                controls.appendChild(inputLabel);
            }

            const langToggle = document.createElement('div');
            langToggle.className = 'loominary-lang-toggle';
            langToggle.textContent = `🌐 ${i18n.getLanguageShort()}`;
            langToggle.addEventListener('click', () => {
                i18n.setLanguage(i18n.currentLang === 'zh' ? 'en' : 'zh');
                UI.recreatePanel();
            });
            controls.appendChild(langToggle);

            container.appendChild(controls);
            document.body.appendChild(container);
            State.panelInjected = true;

            const panel = document.getElementById(Config.CONTROL_ID);
            if (State.isPanelCollapsed) {
                panel.classList.add('collapsed');
                safeSetInnerHTML(toggle, collapseIcon);
            } else {
                panel.classList.remove('collapsed');
                safeSetInnerHTML(toggle, expandIcon);
            }

            return true;
        }
    };

    const init = () => {
        if (!State.currentPlatform) return;

        if (State.currentPlatform === 'claude') ClaudeHandler.init();

        UI.injectStyle();

        const initPanel = () => {
            UI.createPanel();
            if (['claude'].includes(State.currentPlatform)) {
                let lastUrl = window.location.href;
                new MutationObserver(() => {
                    if (window.location.href !== lastUrl) {
                        lastUrl = window.location.href;
                        setTimeout(() => {
                            if (!document.getElementById(Config.CONTROL_ID)) {
                                UI.createPanel();
                            }
                        }, 1000);
                    }
                }).observe(document.body, { childList: true, subtree: true });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(initPanel, Config.TIMING.PANEL_INIT_DELAY));
        } else {
            setTimeout(initPanel, Config.TIMING.PANEL_INIT_DELAY);
        }
    };


    init();
})();