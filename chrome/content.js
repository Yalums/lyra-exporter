// ============================================================
// Loominary - Content Script
// Version: 26.3.1
// Built: 2026-03-22T03:33:54.131873
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

/**
 * 通过 background service worker 代理跨域请求（绕过 content script CORS 限制）
 * 仅用于 blob: 以外的跨域 URL（如 Gemini 图片 CDN）
 */
function fetchViaBackground(url, responseType) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: 'LOOMINARY_FETCH', options: { url, responseType } },
            (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                if (!response || !response.success) {
                    return reject(new Error(response?.error || 'Background fetch failed'));
                }
                if (responseType === 'blob') {
                    // background 返回 data URL 字符串，转回 Blob
                    fetch(response.data).then(r => r.blob()).then(resolve).catch(reject);
                } else {
                    resolve(response.data);
                }
            }
        );
    });
}

// 处理来自 background.js 的代理 fetch 请求
// 在页面上下文中执行，确保 SameSite cookies 可随同源请求发送
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type !== 'LOOMINARY_CONTENT_FETCH') return;
    const { url } = request;
    fetch(url)
        .then(async r => {
            if (!r.ok) return { success: false, status: r.status, error: `HTTP ${r.status}` };
            const data = await r.json();
            return { success: true, data };
        })
        .catch(err => ({ success: false, error: err.message }))
        .then(sendResponse);
    return true;
});

function GM_xmlhttpRequest(options) {
    const { method = 'GET', url, headers = {}, responseType, onload, onerror } = options;

    // 扩展环境中，跨域 URL（非 blob:、非同域）走 background 代理，避免 CORS 错误
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    const isCrossOrigin = url && !url.startsWith('blob:') && !url.startsWith(window.location.origin);

    if (isExtension && isCrossOrigin) {
        fetchViaBackground(url, responseType || 'blob')
            .then(data => {
                if (onload) {
                    onload({ status: 200, statusText: 'OK', response: data, responseText: '' });
                }
            })
            .catch(error => {
                if (onerror) {
                    onerror({ error: error.message, statusText: error.message });
                }
            });

        return { abort: () => {} };
    }

    // 同域或 blob: URL：直接 fetch（content script 有权限）
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
            try {
                if (trustedPolicy) {
                    element.innerHTML = trustedPolicy.createHTML(html);
                    return;
                }
                element.innerHTML = html;
            } catch (e) {
                // Trusted Types blocked innerHTML (e.g. Gemini CSP) — parse via DOMParser instead
                try {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    element.replaceChildren(...doc.body.childNodes);
                } catch (e2) {
                    element.textContent = html;
                }
            }
        }

        const Config = {
            CONTROL_ID: 'loominary-controls',
            TOGGLE_ID: 'loominary-toggle-button',
            LANG_SWITCH_ID: 'loominary-lang-switch',
            TREE_SWITCH_ID: 'loominary-tree-mode-switch',
            IMAGE_SWITCH_ID: 'loominary-image-switch',
            // #platform: chatgpt,copilot
            CANVAS_SWITCH_ID: 'loominary-canvas-switch',
            WORKSPACE_TYPE_ID: 'loominary-workspace-type',
            MANUAL_ID_BTN: 'loominary-manual-id-btn',
            // #endplatform

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
                // #platform: chatgpt
                if (host.includes('chatgpt') || host.includes('openai')) {
                    console.log('[Loominary] Platform detected: chatgpt');
                    return 'chatgpt';
                }
                // #endplatform
                // #platform: grok
                if (host.includes('grok.com')) {
                    console.log('[Loominary] Platform detected: grok');
                    return 'grok';
                }
                // #endplatform
                // #platform: copilot
                if (host.includes('copilot.microsoft.com')) {
                    console.log('[Loominary] Platform detected: copilot');
                    return 'copilot';
                }
                // #endplatform
                // #platform: gemini
                if (host.includes('gemini')) {
                    console.log('[Loominary] Platform detected: gemini');
                    return 'gemini';
                }

                if (host.includes('aistudio')) {
                    console.log('[Loominary] Platform detected: aistudio');
                    return 'aistudio';
                }
                // #endplatform
                console.log('[Loominary] Platform detected: null (unknown)');
                return null;
            })(),
            isPanelCollapsed: localStorage.getItem('exporterCollapsed') !== 'false',
            includeImages: localStorage.getItem('includeImages') === 'true',
            capturedUserId: localStorage.getItem('claudeUserId') || '',
            // #platform: chatgpt
            chatgptAccessToken: null,
            chatgptUserId: localStorage.getItem('chatGPTUserId') || '',
            chatgptWorkspaceId: localStorage.getItem('chatGPTWorkspaceId') || '',
            chatgptWorkspaceType: localStorage.getItem('chatGPTWorkspaceType') || 'user',
            // #endplatform
            panelInjected: false,
            // #platform: chatgpt,copilot
            includeCanvas: localStorage.getItem('includeCanvas') === 'true'
            // #endplatform
        };

        // #platform: gemini
        let collectedData = new Map();
        // #endplatform
        // #platform: chatgpt,copilot,gemini
        const Flags = {
            hasRetryWithoutToolButton: false,
            lastCanvasContent: null,
            lastCanvasMessageIndex: -1
        };
        // #endplatform

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
                    // #platform: chatgpt
                    workspaceType: '团队空间', userWorkspace: '个人区', teamWorkspace: '工作区',
                    manualWorkspaceId: '手动设置工作区ID', enterWorkspaceId: '请输入工作区ID (工作空间设置/工作空间 ID):',
                    workspaceIdSaved: '工作区ID已保存!', tokenNotFound: '未找到访问令牌!',
                    // #endplatform
                    viewOnline: '预览对话',
                    loadFailed: '加载失败: ',
                    cannotOpenExporter: '无法打开 Loominary,请检查弹窗拦截',
                    versionTracking: '实时',
                    detectingConversations: '正在探测对话数量...',
                    foundConversations: '检测到',
                    selectExportCount: '请输入要导出最近的多少个对话 (输入 0 或留空导出全部):',
                    invalidNumber: '输入无效，请输入有效的数字',
                    exportCancelled: '已取消导出',
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
                    // #platform: chatgpt
                    workspaceType: 'Workspace', userWorkspace: 'Personal', teamWorkspace: 'Team',
                    manualWorkspaceId: 'Set Workspace ID', enterWorkspaceId: 'Enter Workspace ID(Workspace settings/Workspace ID):',
                    workspaceIdSaved: 'Workspace ID saved!', tokenNotFound: 'Access token not found!',
                    // #endplatform
                    viewOnline: 'Preview',
                    loadFailed: 'Load failed: ',
                    cannotOpenExporter: 'Cannot open Loominary, please check popup blocker',
                    versionTracking: 'Realtime',
                    detectingConversations: 'Detecting conversations...',
                    foundConversations: 'Found',
                    selectExportCount: 'How many recent conversations to export? (Enter 0 or leave empty for all):',
                    invalidNumber: 'Invalid input, please enter a valid number',
                    exportCancelled: 'Export cancelled',
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
                    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '') // 移除非法字符
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

    // #platform: gemini
    // Simple hash function for better deduplication
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Extract canvas content from a DOM element
     * Supports code blocks, artifacts, interactive elements, and text content
     * @param {Element} root - The root element to extract canvas from (typically a model-response container)
     * @returns {Array} Array of canvas objects with type, content, and metadata
     */
    function extractCanvasFromElement(root) {
        const canvasData = [];
        const seen = new Set();
        if (!root || !(root instanceof Element)) return canvasData;

        // Enhanced code block detection with multiple selectors
        const codeBlockSelectors = [
            'code-block',
            'pre code',
            '.code-block',
            '[data-code-block]',
            '.artifact-code',
            'code-execution-result code'
        ];

        codeBlockSelectors.forEach((selector) => {
            const blocks = root.querySelectorAll(selector);
            blocks.forEach((block) => {
                const codeContent = block.textContent || block.innerText;
                if (!codeContent) return;
                const trimmed = codeContent.trim();
                if (!trimmed || trimmed.length < 5) return; // Skip very short content

                const hash = simpleHash(trimmed);
                if (seen.has(hash)) return;
                seen.add(hash);

                // Try to detect language from multiple sources
                let language = 'unknown';
                const langAttr = block.querySelector('[data-lang]');
                if (langAttr) {
                    language = langAttr.getAttribute('data-lang') || 'unknown';
                } else if (block.className) {
                    const match = block.className.match(/language-(\w+)/);
                    if (match) language = match[1];
                }

                canvasData.push({
                    type: 'code',
                    content: trimmed,
                    language: language,
                    selector: selector
                });
            });
        });

        // Artifact detection (Gemini's interactive components)
        const artifactSelectors = [
            '[data-artifact]',
            '.artifact-container',
            'artifact-element',
            '.interactive-canvas'
        ];

        artifactSelectors.forEach((selector) => {
            const artifacts = root.querySelectorAll(selector);
            artifacts.forEach((artifact) => {
                const content = artifact.textContent || artifact.innerText;
                if (!content) return;
                const trimmed = content.trim();
                if (!trimmed || trimmed.length < 5) return;

                const hash = simpleHash(trimmed);
                if (seen.has(hash)) return;
                seen.add(hash);

                canvasData.push({
                    type: 'artifact',
                    content: trimmed,
                    selector: selector
                });
            });
        });

        // Canvas element detection (actual HTML5 canvas)
        const canvasElements = root.querySelectorAll('canvas');
        canvasElements.forEach((canvas) => {
            // Try to get canvas context or data
            const canvasId = canvas.id || canvas.className || 'unnamed-canvas';
            const hash = simpleHash(canvasId + canvas.width + canvas.height);
            if (seen.has(hash)) return;
            seen.add(hash);

            canvasData.push({
                type: 'canvas_element',
                content: `Canvas element: ${canvasId} (${canvas.width}x${canvas.height})`,
                metadata: {
                    id: canvasId,
                    width: canvas.width,
                    height: canvas.height
                }
            });
        });

        return canvasData;
    }

    function extractGlobalCanvasContent() {
        const canvasData = [];
        const seen = new Set();


        const codeBlocks = document.querySelectorAll('code-block, pre code, .code-block');
        codeBlocks.forEach((block) => {
            const codeContent = block.textContent || block.innerText;
            if (!codeContent) return;
            const trimmed = codeContent.trim();
            if (!trimmed) return;
            const key = trimmed.substring(0, 100);
            if (seen.has(key)) return;
            seen.add(key);

            const langAttr = block.querySelector('[data-lang]');
            const language = langAttr ? langAttr.getAttribute('data-lang') || 'unknown' : 'unknown';
            canvasData.push({
                type: 'code',
                content: trimmed,
                language: language
            });
        });

        const responseElements = document.querySelectorAll('response-element, .model-response-text, .markdown');
        responseElements.forEach((element) => {
            if (element.closest('code-block') || element.querySelector('code-block')) return;
            let clone;
            try {
                clone = element.cloneNode(true);
                clone.querySelectorAll('button.retry-without-tool-button').forEach(btn => btn.remove());
            } catch (e) {
                clone = element;
            }
            let md = '';
            try {
                md = htmlToMarkdown(clone).trim();
            } catch (e) {
                const textContent = element.textContent || element.innerText;
                md = textContent ? textContent.trim() : '';
            }
            if (!md) return;
            const key = md.substring(0, 100);
            if (seen.has(key)) return;
            seen.add(key);
            canvasData.push({
                type: 'text',
                content: md
            });
        });

        return canvasData;
    }
    // #endplatform
        const Communicator = {
            open: async (jsonData, filename, extraData) => {
                const defaultFilename = filename || `${State.currentPlatform}_export_${new Date().toISOString().slice(0,10)}.json`;

                // Userscript mode: open GitHub Pages viewer and transfer data via postMessage
                if (typeof LOOMINARY_ENV !== 'undefined' && LOOMINARY_ENV === 'userscript') {
                    const GITHUB_PAGES_URL = 'https://Laumss.github.io/react';
                    // Use unsafeWindow.open so the new tab's window.opener = actual page window,
                    // not the ViolentMonkey sandbox proxy. This allows github.io to postMessage back.
                    const _opener = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
                    const newWin = _opener.open(GITHUB_PAGES_URL, '_blank');
                    if (!newWin) {
                        alert(i18n.t('cannotOpenExporter'));
                        return false;
                    }
                    return new Promise((resolve) => {
                        // Poll with LOOMINARY_HANDSHAKE until the GitHub Pages app signals it is ready
                        const interval = setInterval(() => {
                            try {
                                newWin.postMessage({ type: 'LOOMINARY_HANDSHAKE' }, 'https://Laumss.github.io');
                            } catch (e) { /* page may not be loaded yet */ }
                        }, 500);
                        const timeout = setTimeout(() => {
                            clearInterval(interval);
                            _opener.removeEventListener('message', handler);
                            console.warn('[Loominary] Timed out waiting for GitHub Pages viewer to respond');
                            resolve(false);
                        }, 15000);
                        function handler(event) {
                            if (event.source !== newWin || event.data?.type !== 'LOOMINARY_READY') return;
                            clearInterval(interval);
                            clearTimeout(timeout);
                            _opener.removeEventListener('message', handler);
                            // Viewer sends back its saved export config — save it to local storage so
                            // content-script exports use the same settings as the React viewer.
                            if (event.data.config && typeof event.data.config === 'object') {
                                const cfgStr = JSON.stringify(event.data.config);
                                console.log('[Loominary] LOOMINARY_READY: syncing config from viewer:', cfgStr);
                                try { localStorage.setItem('loominary_export_config', cfgStr); } catch (e) {}
                            }
                            // Detect page theme via color-scheme CSS property
                            const pageTheme = getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim();
                            const detectedTheme = (pageTheme === 'light') ? 'light' : 'dark';
                            newWin.postMessage({
                                type: 'LOOMINARY_LOAD_DATA',
                                data: { content: jsonData, filename: defaultFilename, lang: i18n.currentLang, theme: detectedTheme, ...extraData }
                            }, 'https://Laumss.github.io');
                            resolve(true);
                        }
                        _opener.addEventListener('message', handler);
                    });
                }

                // Extension mode: open side panel via background service worker
                try {
                    if (State.capturedUserId) {
                        chrome.storage.local.set({ loominary_browse_context: {
                            baseUrl: window.location.origin,
                            userId: State.capturedUserId
                        }});
                    }

                    // Detect page theme and sync lang before opening tab
                    const _extPageTheme = getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim();
                    const _extDetectedTheme = (_extPageTheme === 'light') ? 'light' : 'dark';
                    chrome.storage.local.set({ loominary_lang: i18n.currentLang, loominary_page_theme: _extDetectedTheme });

                    chrome.runtime.sendMessage({
                        type: 'LOOMINARY_OPEN_SIDEPANEL',
                        data: {
                            content: jsonData,
                            filename: defaultFilename,
                            lang: i18n.currentLang,
                            theme: _extDetectedTheme,
                            ...extraData
                        }
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('[Loominary Extension] Send message error:', chrome.runtime.lastError);
                            alert(i18n.t('cannotOpenExporter') + ': ' + chrome.runtime.lastError.message);
                        } else {
                            console.log('[Loominary Extension] Side panel opened successfully');
                        }
                    });

                    return true;
                } catch (error) {
                    alert(`${i18n.t('cannotOpenExporter')}: ${error.message}`);
                    return false;
                }
            }
        };

        // Listen for settings updates posted back from the viewer tab (github.io SettingsPanel)
        // Must use unsafeWindow in userscript mode: ViolentMonkey sandbox `window` is a proxy;
        // the actual postMessage from github.io goes to the real page window (unsafeWindow).
        const _msgTarget = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        console.log('[Loominary] settings listener registered on', typeof unsafeWindow !== 'undefined' ? 'unsafeWindow' : 'window');
        _msgTarget.addEventListener('message', (event) => {
            if (event.data?.type !== 'LOOMINARY_SETTINGS_UPDATE') return;
            if (!event.data.config || typeof event.data.config !== 'object') return;
            const config = event.data.config;
            console.log('[Loominary] LOOMINARY_SETTINGS_UPDATE received, saving config:', JSON.stringify(config));
            if (typeof LOOMINARY_ENV !== 'undefined' && LOOMINARY_ENV === 'userscript') {
                try { localStorage.setItem('loominary_export_config', JSON.stringify(config)); } catch (e) {}
            } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ loominary_export_config: config });
            }
        });

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
function _attachGeminiImages(msg, images) {
    if (!Array.isArray(images) || !images.length) return;
    msg.images = images.map(img => ({
        link: 'data:' + (img.format || 'image/png') + ';base64,' + img.data,
        is_embedded_image: true
    }));
}

function _parseGemini(d) {
    const platform = d.platform || 'gemini';
    const platLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
    const meta = { title: d.title || 'Untitled', created_at: _fmtDate(d.exportedAt), uuid: platform + '_' + Date.now(), platform };
    const history = [];
    let idx = 0;

    (d.conversation || []).forEach((item, turnIdx) => {
        // 多分支版本格式（VersionTracker 输出）
        if (item.turnIndex !== undefined && (item.human?.versions || item.assistant?.versions)) {
            (item.human?.versions || []).forEach(hv => {
                const msg = _blankMsg(idx++, `h_t${turnIdx}_v${hv.version}`, '', 'human', 'User', meta.created_at);
                msg.display_text = hv.text || '';
                if (hv.version > 0) msg.is_branch_point = true;
                _attachGeminiImages(msg, hv.images);
                history.push(msg);
            });

            (item.assistant?.versions || []).forEach(av => {
                const parentUuid = `h_t${turnIdx}_v${av.userVersion ?? 0}`;
                const msg = _blankMsg(idx++, `a_t${turnIdx}_v${av.version}`, parentUuid, 'assistant', platLabel, meta.created_at);
                msg.display_text = av.text || '';
                if (av.version > 0) msg.is_branch_point = true;
                if (av.thinking) msg.thinking = av.thinking;
                _attachGeminiImages(msg, av.images);
                history.push(msg);
            });
        } else {
            // 普通格式（scraper 输出）
            if (item.human) {
                const hc = typeof item.human === 'string' ? { text: item.human } : item.human;
                const msg = _blankMsg(idx++, 'h_' + idx, '', 'human', 'User', meta.created_at);
                msg.display_text = hc.text || '';
                _attachGeminiImages(msg, hc.images);
                history.push(msg);
            }
            if (item.assistant) {
                const ac = typeof item.assistant === 'string' ? { text: item.assistant } : item.assistant;
                const msg = _blankMsg(idx++, 'a_' + idx, '', 'assistant', platLabel, meta.created_at);
                msg.display_text = ac.text || '';
                if (ac.thinking) msg.thinking = ac.thinking;
                _attachGeminiImages(msg, ac.images);
                history.push(msg);
            }
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
        if (cfg.includeNumbering !== false && cfg.numberingFormat !== 'none') {
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


const ClaudeHandler = {
    _cache: {
        baseUrl: null,
        accountData: null,
        allConversations: null,
        allConversationsTime: 0,
    },
    init: () => {
        // 扩展模式下 injected.js 已通过 script.src 注入（符合 CSP），不需要 inline script
        const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        if (!isExtension) {
            // Userscript 模式：通过 unsafeWindow 直接拦截 fetch/XHR 以捕获 userId
            // CSP 阻止内联 script 注入，但 unsafeWindow 可以直接修改页面的 window 对象
            function captureUserId(url) {
                const match = url && url.match(/\/api\/organizations\/([a-f0-9-]+)\//);
                if (match && match[1] && !State.capturedUserId) {
                    State.capturedUserId = match[1];
                    localStorage.setItem('claudeUserId', match[1]);
                }
            }
            const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            const origFetch = uw.fetch;
            uw.fetch = function(resource) {
                const url = typeof resource === 'string' ? resource : (resource && resource.url || '');
                captureUserId(url);
                return origFetch.apply(uw, arguments);
            };
            const origXHROpen = uw.XMLHttpRequest.prototype.open;
            uw.XMLHttpRequest.prototype.open = function() {
                if (arguments[1]) captureUserId(arguments[1]);
                return origXHROpen.apply(this, arguments);
            };
        } else {
            // 扩展模式：injected.js 通过 postMessage 发送 LOOMINARY_USER_ID_CAPTURED
            // build.py 的 header 已在 content.js 顶部监听并写入 localStorage
            // 这里直接从 localStorage 读取已捕获的 userId（延迟读取，首次使用时通过 ensureUserId 获取）
        }
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

                    // 读取导出配置并收集 exportContext（project 信息 / 用户记忆）
                    const exportCfg = await _readExportConfig();
                    const ctx = {};
                    const projectUuid = data.project_uuid;

                    if (exportCfg.includeProjectInfo && projectUuid) {
                        const [detail, memory, files] = await Promise.all([
                            ClaudeHandler.getProjectDetail(projectUuid),
                            ClaudeHandler.getProjectMemory(projectUuid),
                            ClaudeHandler.getProjectFiles(projectUuid)
                        ]);
                        const knowledgeFiles = [];
                        if (files && files.length > 0) {
                            const fileResults = await Promise.allSettled(
                                files.map(f => ClaudeHandler.getProjectFileContent(projectUuid, f.uuid)
                                    .then(content => ({ name: f.file_name || f.uuid, content })))
                            );
                            for (const r of fileResults) {
                                if (r.status === 'fulfilled' && r.value.content) {
                                    const c = r.value.content;
                                    knowledgeFiles.push({ name: r.value.name, content: typeof c === 'string' ? c : JSON.stringify(c) });
                                }
                            }
                        }
                        ctx.projectInfo = {
                            name: detail?.name || data.project?.name || '',
                            description: detail?.description || '',
                            instructions: detail?.prompt_template || '',
                            memory: memory?.memory || '',
                            knowledgeFiles
                        };
                    }

                    if (exportCfg.includeUserMemory) {
                        const [profile, globalMem] = await Promise.all([
                            ClaudeHandler.getUserProfile(),
                            ClaudeHandler.getGlobalMemory()
                        ]);
                        ctx.userMemory = {
                            preferences: profile?.conversation_preferences || '',
                            memories: globalMem?.memory || ''
                        };
                    }

                    const exportContext = Object.keys(ctx).length ? ctx : undefined;
                    const jsonString = JSON.stringify(data, null, 2);
                    const filename = `claude_${data.name || 'conversation'}_${uuid.substring(0, 8)}.json`;
                    await Communicator.open(jsonString, filename, exportContext ? { exportContext } : undefined);
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

                    // 读取导出配置（extension 从 chrome.storage，userscript 从 localStorage）
                    const exportCfg = await _readExportConfig();
                    const exportContext = {};
                    const projectUuid = data.project_uuid;

                    if (exportCfg.includeProjectInfo && projectUuid) {
                        const [detail, memory, files] = await Promise.all([
                            ClaudeHandler.getProjectDetail(projectUuid),
                            ClaudeHandler.getProjectMemory(projectUuid),
                            ClaudeHandler.getProjectFiles(projectUuid)
                        ]);
                        const knowledgeFiles = [];
                        if (files && files.length > 0) {
                            const fileResults = await Promise.allSettled(
                                files.map(f => ClaudeHandler.getProjectFileContent(projectUuid, f.uuid)
                                    .then(content => ({ name: f.file_name || f.uuid, content })))
                            );
                            for (const r of fileResults) {
                                if (r.status === 'fulfilled' && r.value.content) {
                                    const c = r.value.content;
                                    knowledgeFiles.push({ name: r.value.name, content: typeof c === 'string' ? c : JSON.stringify(c) });
                                }
                            }
                        }
                        exportContext.projectInfo = {
                            name: detail?.name || data.project?.name || '',
                            description: detail?.description || '',
                            instructions: detail?.prompt_template || '',
                            memory: memory?.memory || '',
                            knowledgeFiles
                        };
                    }

                    if (exportCfg.includeUserMemory) {
                        const [profile, globalMem] = await Promise.all([
                            ClaudeHandler.getUserProfile(),
                            ClaudeHandler.getGlobalMemory()
                        ]);
                        exportContext.userMemory = {
                            preferences: profile?.conversation_preferences || '',
                            memories: globalMem?.memory || ''
                        };
                    }

                    const title = data.name || uuid.substring(0, 8);
                    const filename = `claude_${Utils.sanitizeFilename(title)}_${uuid.substring(0, 8)}`;
                    await loominaryExportMarkdown(data, filename, exportCfg, Object.keys(exportContext).length ? exportContext : null);
                } catch (error) {
                    ErrorHandler.handle(error, 'Export conversation markdown');
                } finally {
                    Utils.restoreButton(btn, original);
                }
            }
        ));
        controlsArea.appendChild(Utils.createButton(
            `${zipIcon} ${i18n.t('exportAllConversations')}`,
            async (btn) => {
                return ClaudeHandler.exportAll(btn, controlsArea);
            }
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
        const userId = await ClaudeHandler.ensureUserId();
        if (!userId) return;

        // 检查导出模式配置
        const isExtensionMode = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        let exportAllMode = 'zip';
        try {
            let exportCfg = {};
            if (isExtensionMode) {
                exportCfg = await new Promise(resolve =>
                    chrome.storage.local.get(['loominary_export_config'], r => resolve(r.loominary_export_config || {}))
                );
            } else {
                const raw = localStorage.getItem('loominary_export_config') || '{}';
                exportCfg = JSON.parse(raw);
            }
            exportAllMode = exportCfg.exportAllMode || 'zip';
        } catch (e) {}

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

        // app 模式：发送对话列表元数据到 React App
        if (exportAllMode === 'app') {
            const conversations = allConvs.map(conv => ({
                uuid: conv.uuid,
                name: conv.name || conv.uuid,
                created_at: conv.created_at || null,
                updated_at: conv.updated_at || null,
                project_uuid: conv.project_uuid || null,
                project: conv.project || null,
            }));
            const baseUrl = ClaudeHandler.getBaseUrl();
            await Communicator.open(null, 'browse_all', {
                action: 'browse_all',
                conversations,
                userId,
                baseUrl
            });
            return;
        }

        // zip 模式：检查压缩库
        if (typeof fflate === 'undefined' || typeof fflate.zip !== 'function' || typeof fflate.strToU8 !== 'function') {
            const errorMsg = i18n.currentLang === 'zh'
                ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
            alert(errorMsg);
            return;
        }

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

        // 读取 popup 导出配置
        let includeProjectInfo = true, includeUserMemory = true;
        const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        try {
            let exportCfg = {};
            if (isExtension) {
                exportCfg = await new Promise(resolve =>
                    chrome.storage.local.get(['loominary_export_config'], r => resolve(r.loominary_export_config || {}))
                );
            } else {
                const raw = localStorage.getItem('loominary_export_config') || '{}';
                exportCfg = JSON.parse(raw);
            }
            includeProjectInfo = exportCfg.includeProjectInfo !== false;
            includeUserMemory = exportCfg.includeUserMemory !== false;
        } catch (e) {}

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

            if (includeProjectInfo || includeUserMemory) {
            progress.textContent = i18n.currentLang === 'zh' ? '正在获取项目数据...' : 'Fetching project data...';
            const projectsMeta = { exported_at: new Date().toISOString(), organization_id: userId, user_instructions: null, global_memory: null, projects: [] };

            if (includeUserMemory) {
            try {
                const profile = await ClaudeHandler.getUserProfile();
                if (profile?.conversation_preferences) projectsMeta.user_instructions = profile.conversation_preferences;
            } catch (e) {}

            try {
                const globalMem = await ClaudeHandler.getGlobalMemory();
                if (globalMem) projectsMeta.global_memory = globalMem;
            } catch (e) {}
            }

            if (includeProjectInfo) {
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
            } // end includeProjectInfo

            zipEntries[`projects/${userId}_projects.json`] = fflate.strToU8(JSON.stringify(projectsMeta, null, 2));
            } // end includeProjectInfo || includeUserMemory

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


    // Helper function to fetch images via GM_xmlhttpRequest (bypass CORS)
    function fetchViaGM(url, headers = {}) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                fetch(url, { headers }).then(r => {
                    if (r.ok) return r.blob();
                    return Promise.reject(new Error(`Status: ${r.status}`));
                }).then(resolve).catch(reject);
                return;
            }
            GM_xmlhttpRequest({
                method: "GET",
                url,
                headers,
                responseType: "blob",
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        resolve(r.response);
                    } else {
                        reject(new Error(`Status: ${r.status}`));
                    }
                },
                onerror: e => reject(new Error(e.statusText || 'Network error'))
            });
        });
    }

    // Process image element and return base64 data
    async function processImageElement(imgElement, accessToken = null) {
        if (!imgElement) return null;
        const url = imgElement.src;
        if (!url || url.startsWith('data:')) return null;

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
                const headers = {};
                if (url.includes('backend-api') && accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`;
                }

                const blob = await fetchViaGM(url, headers);
                base64Data = await Utils.blobToBase64(blob);
                mimeType = blob.type;
                size = blob.size;

                // Fix MIME type if it's octet-stream or empty
                if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
                    if (url.includes('.jpg') || url.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (url.includes('.png')) {
                        mimeType = 'image/png';
                    } else if (url.includes('.gif')) {
                        mimeType = 'image/gif';
                    } else if (url.includes('.webp')) {
                        mimeType = 'image/webp';
                    } else {
                        // Detect from base64 magic bytes
                        const firstBytes = base64Data.substring(0, 20);
                        if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
                        else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
                        else mimeType = 'image/png';
                    }
                }
            }

            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
        } catch (e) {
            console.error('[ChatGPT] Failed to process image:', url.substring(0, 80));
            return null;
        }
    }

    const ChatGPTHandler = {
        init: () => {
            const rawFetch = window.fetch;
            window.fetch = async function(resource, options) {
                const headers = options?.headers;
                if (headers) {
                    let authHeader = null;
                    if (typeof headers === 'string') {
                        authHeader = headers;
                    } else if (headers instanceof Headers) {
                        authHeader = headers.get('Authorization');
                    } else {
                        authHeader = headers.Authorization || headers.authorization;
                    }

                    if (authHeader?.startsWith('Bearer ')) {
                        const token = authHeader.slice(7);
                        if (token && token.toLowerCase() !== 'dummy') {
                            State.chatgptAccessToken = token;
                        }
                    }
                }

                return rawFetch.apply(this, arguments);
            };
        },

        ensureAccessToken: async () => {
            if (State.chatgptAccessToken) return State.chatgptAccessToken;

            try {
                const response = await fetch('/api/auth/session?unstable_client=true');
                const session = await response.json();
                if (session.accessToken) {
                    State.chatgptAccessToken = session.accessToken;
                    return session.accessToken;
                }
            } catch (error) {
                console.error('Failed to get access token:', error);
            }

            return null;
        },

        getOaiDeviceId: () => {
            const cookieString = document.cookie;
            const match = cookieString.match(/oai-did=([^;]+)/);
            return match ? match[1] : null;
        },

        getCurrentConversationId: () => {
            const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
            return match ? match[1] : null;
        },

        getAllConversations: async () => {
            const token = await ChatGPTHandler.ensureAccessToken();
            if (!token) throw new Error(i18n.t('tokenNotFound'));

            const deviceId = ChatGPTHandler.getOaiDeviceId();
            if (!deviceId) throw new Error('Cannot get device ID');

            const headers = {
                'Authorization': `Bearer ${token}`,
                'oai-device-id': deviceId
            };

            if (State.chatgptWorkspaceType === 'team' && State.chatgptWorkspaceId) {
                headers['ChatGPT-Account-Id'] = State.chatgptWorkspaceId;
            }

            const allConversations = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(`/backend-api/conversations?offset=${offset}&limit=28&order=updated`, { headers });
                if (!response.ok) throw new Error('Failed to fetch conversation list');

                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    allConversations.push(...data.items);
                    hasMore = data.items.length === 28;
                    offset += data.items.length;
                } else {
                    hasMore = false;
                }
            }

            return allConversations;
        },

        // Extract images from DOM for current conversation
        extractImagesFromDOM: async (conversationId, includeImages, accessToken = null) => {
            if (!includeImages) return {};

            const currentId = ChatGPTHandler.getCurrentConversationId();
            if (currentId !== conversationId) {
                console.log('[ChatGPT] Not current conversation, skipping DOM image extraction');
                return {};
            }

            const imageMap = {};
            let lastUserMessageId = null;  // 追踪最后的用户消息 ID，用于关联孤立的助手图片

            const messageGroups = document.querySelectorAll('[data-testid^="conversation-turn-"]');

            for (const group of messageGroups) {
                // 查找整个 group 中所有可能的 message-id
                const findMessageId = (container) => {
                    if (!container) return null;
                    return container.getAttribute('data-message-id') ||
                           container.closest('[data-message-id]')?.getAttribute('data-message-id') ||
                           group.querySelector('[data-message-id]')?.getAttribute('data-message-id');
                };

                // User messages - look for uploaded images
                const userContainer = group.querySelector('[data-message-author-role="user"]');
                if (userContainer) {
                    // 记录用户消息 ID，即使没有图片也要记录（用于关联后续的助手生成图片）
                    const userMessageId = findMessageId(userContainer);
                    if (userMessageId) {
                        lastUserMessageId = userMessageId;
                    }

                    // Find images in user message
                    const userImages = userContainer.querySelectorAll('img[src*="backend-api"], img[src*="files.oaiusercontent.com"], img[src*="oaiusercontent"]');
                    if (userImages.length > 0) {
                        const images = [];
                        for (const img of userImages) {
                            const imageData = await processImageElement(img, accessToken);
                            if (imageData) images.push(imageData);
                        }
                        if (images.length > 0 && lastUserMessageId) {
                            if (!imageMap[lastUserMessageId]) imageMap[lastUserMessageId] = {};
                            imageMap[lastUserMessageId].user = images;
                        }
                    }
                }

                // Assistant messages - look for generated images (including DALL-E generated images)
                const assistantContainer = group.querySelector('[data-message-author-role="assistant"]');
                
                // Collect all candidate assistant images from multiple sources
                const candidateImages = [];
                const seenSrcs = new Set();
                
                // Helper to add images without duplicates
                const addImages = (imgs) => {
                    for (const img of imgs) {
                        if (img.src && !seenSrcs.has(img.src)) {
                            seenSrcs.add(img.src);
                            candidateImages.push(img);
                        }
                    }
                };
                
                // 1. Images in assistant container
                if (assistantContainer) {
                    addImages(assistantContainer.querySelectorAll('img'));
                }
                
                // 2. AI-generated images - find by id pattern (image-xxxx)
                addImages(group.querySelectorAll('[id^="image-"] img'));
                
                // 3. Images with estuary/content URLs (generated content)
                addImages(group.querySelectorAll('img[src*="estuary/content"], img[src*="estuary"]'));
                
                // 4. Images with "已生成图片" or "Generated" alt text
                addImages(group.querySelectorAll('img[alt*="生成"], img[alt*="Generated"], img[alt*="generated"]'));
                
                // 5. Find imagegen containers by iterating through elements (handles class names with /)
                group.querySelectorAll('div').forEach(div => {
                    const classList = div.className || '';
                    if (classList.includes('imagegen') || classList.includes('image-gen')) {
                        addImages(div.querySelectorAll('img'));
                    }
                });
                
                // 6. Find by aria-label
                addImages(group.querySelectorAll('img[aria-label*="图片"], img[aria-label*="image"]'));
                
                // Exclude user images
                const userImgSrcs = new Set();
                group.querySelectorAll('[data-message-author-role="user"] img').forEach(img => userImgSrcs.add(img.src));
                
                const uniqueImages = candidateImages.filter(img => !userImgSrcs.has(img.src));

                if (uniqueImages.length > 0) {
                    const images = [];
                    for (const img of uniqueImages) {
                        // Skip loading/placeholder images (blurred intermediate images during generation)
                        // Check blur on img itself
                        const imgStyle = window.getComputedStyle(img);
                        const imgFilter = imgStyle.filter || imgStyle.webkitFilter || '';
                        if (imgFilter.includes('blur')) continue;

                        // Check blur on parent element (ChatGPT applies blur to parent div)
                        const parent = img.parentElement;
                        if (parent) {
                            const parentStyle = window.getComputedStyle(parent);
                            const parentFilter = parentStyle.filter || parentStyle.webkitFilter || '';
                            if (parentFilter.includes('blur')) continue;
                        }

                        // Skip images with loading/placeholder/pulse classes
                        const classList = img.className || '';
                        if (classList.includes('loading') || classList.includes('placeholder') ||
                            classList.includes('skeleton') || classList.includes('pulse')) continue;

                        // Skip images with loading aria attributes
                        if (img.getAttribute('aria-busy') === 'true' || img.getAttribute('data-loading') === 'true') continue;

                        // Wait for image to load if needed
                        if (!img.complete) {
                            await new Promise(r => {
                                img.onload = img.onerror = r;
                                setTimeout(r, 3000);
                            });
                        }

                        // Skip small images (icons/UI elements)
                        const width = img.naturalWidth || img.width || 0;
                        const height = img.naturalHeight || img.height || 0;
                        if (width < 50 || height < 50) continue;

                        const imageData = await processImageElement(img, accessToken);
                        if (imageData) images.push(imageData);
                    }
                    
                    if (images.length > 0) {
                        // 尝试多种方式获取 messageId
                        let messageId = findMessageId(assistantContainer);
                        
                        // 如果 assistantContainer 没有 messageId，尝试查找 group 中的任何 assistant 相关的 messageId
                        if (!messageId) {
                            // 方法1: 查找所有 data-message-id 属性
                            const allMessageIds = group.querySelectorAll('[data-message-id]');
                            for (const el of allMessageIds) {
                                const role = el.getAttribute('data-message-author-role');
                                if (role === 'assistant') {
                                    messageId = el.getAttribute('data-message-id');
                                    break;
                                }
                            }
                        }
                        
                        // 方法2: 在同一 group 中查找用户消息
                        if (!messageId) {
                            const userContainer = group.querySelector('[data-message-author-role="user"]');
                            const userMessageId = findMessageId(userContainer);
                            if (userMessageId) {
                                if (!imageMap[userMessageId]) imageMap[userMessageId] = {};
                                imageMap[userMessageId].assistant_generated = images;
                                continue;
                            }
                        }

                        // 方法3: 使用之前遍历过的用户消息 ID（跨 group 查找）
                        if (!messageId && lastUserMessageId) {
                            if (!imageMap[lastUserMessageId]) imageMap[lastUserMessageId] = {};
                            imageMap[lastUserMessageId].assistant_generated = images;
                            continue;
                        }

                        if (messageId) {
                            if (!imageMap[messageId]) imageMap[messageId] = {};
                            imageMap[messageId].assistant = images;
                        }
                    }
                }
            }

            return imageMap;
        },

        getConversation: async (conversationId, includeImages = false) => {
            const token = await ChatGPTHandler.ensureAccessToken();
            if (!token) {
                console.error('[ChatGPT] Token not found');
                throw new Error(i18n.t('tokenNotFound'));
            }

            const deviceId = ChatGPTHandler.getOaiDeviceId();
            if (!deviceId) {
                console.error('[ChatGPT] Device ID not found in cookies');
                throw new Error('Cannot get device ID');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'oai-device-id': deviceId
            };

            if (State.chatgptWorkspaceType === 'team' && State.chatgptWorkspaceId) {
                headers['ChatGPT-Account-Id'] = State.chatgptWorkspaceId;
            }

            const response = await fetch(`/backend-api/conversation/${conversationId}`, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ChatGPT] Fetch failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    conversationId,
                    workspaceType: State.chatgptWorkspaceType
                });

                let errorMessage = `Failed to fetch conversation (${response.status}): ${errorText || response.statusText}`;
                if (response.status === 404) {
                    const currentMode = State.chatgptWorkspaceType === 'team' ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
                    const suggestMode = State.chatgptWorkspaceType === 'team' ? i18n.t('userWorkspace') : i18n.t('teamWorkspace');
                    errorMessage += `\n\n当前模式: ${currentMode}\n建议尝试切换到: ${suggestMode}`;
                    if (State.chatgptWorkspaceType === 'team') {
                        errorMessage += '并手动填写工作区ID';
                    } else {
                        errorMessage += '并手动填写个人ID';
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Extract and merge images from DOM if requested
            if (includeImages) {
                const imageMap = await ChatGPTHandler.extractImagesFromDOM(conversationId, includeImages, token);

                // Merge images into conversation data
                if (data.mapping && Object.keys(imageMap).length > 0) {
                    const messageIdToNodeId = {};
                    for (const nodeId in data.mapping) {
                        const node = data.mapping[nodeId];
                        if (node?.message?.id) {
                            messageIdToNodeId[node.message.id] = nodeId;
                        }
                    }

                    for (const [messageId, images] of Object.entries(imageMap)) {
                        const nodeId = messageIdToNodeId[messageId];
                        if (nodeId && data.mapping[nodeId]) {
                            if (!data.mapping[nodeId].loominary_images) {
                                data.mapping[nodeId].loominary_images = {};
                            }
                            if (images.user) {
                                data.mapping[nodeId].loominary_images.user = images.user;
                            }
                            if (images.assistant) {
                                data.mapping[nodeId].loominary_images.assistant = images.assistant;
                            }
                            if (images.assistant_generated) {
                                data.mapping[nodeId].loominary_images.assistant_generated = images.assistant_generated;
                            }
                        }
                    }
                }
            }

            return data;
        },

        previewConversation: async () => {
            const conversationId = ChatGPTHandler.getCurrentConversationId();
            if (!conversationId) {
                alert(i18n.t('uuidNotFound'));
                return;
            }

            try {
                const includeImages = State.includeImages || false;
                const data = await ChatGPTHandler.getConversation(conversationId, includeImages);
                const jsonString = JSON.stringify(data, null, 2);
                const filename = `chatgpt_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
                await Communicator.open(jsonString, filename);
            } catch (error) {
                ErrorHandler.handle(error, 'Preview conversation', {
                    userMessage: `${i18n.t('loadFailed')} ${error.message}`
                });
            }
        },

        exportCurrent: async (btn) => {
            const conversationId = ChatGPTHandler.getCurrentConversationId();
            if (!conversationId) {
                alert(i18n.t('uuidNotFound'));
                return;
            }

            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                const includeImages = State.includeImages || false;
                const data = await ChatGPTHandler.getConversation(conversationId, includeImages);

                const filename = prompt(i18n.t('enterFilename'), data.title || i18n.t('untitledChat'));
                if (!filename) {
                    Utils.restoreButton(btn, original);
                    return;
                }

                const baseName = `chatgpt_${Utils.sanitizeFilename(filename)}_${new Date().toISOString().slice(0, 10)}`;
                Utils.downloadJSON(JSON.stringify(data, null, 2), `${baseName}.json`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export conversation');
            } finally {
                Utils.restoreButton(btn, original);
            }
        },

        exportAll: async (btn, controlsArea) => {
            if (typeof fflate === 'undefined' || typeof fflate.zipSync !== 'function' || typeof fflate.strToU8 !== 'function') {
                const errorMsg = i18n.currentLang === 'zh'
                    ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                    : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
                alert(errorMsg);
                return;
            }

            // 先探测对话数量
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

            let allConvs;
            try {
                allConvs = await ChatGPTHandler.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
            } catch (error) {
                ErrorHandler.handle(error, 'Detect conversations');
                Utils.restoreButton(btn, original);
                return;
            }

            const totalCount = allConvs.length;
            Utils.restoreButton(btn, original);

            // 弹出确认框让用户选择导出数量
            const promptMsg = i18n.currentLang === 'zh'
                ? `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`
                : `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;

            const userInput = prompt(promptMsg, totalCount.toString());

            // 用户取消
            if (userInput === null) {
                alert(i18n.t('exportCancelled'));
                return;
            }

            // 解析用户输入
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

            // 开始导出
            const progress = Utils.createProgressElem(controlsArea);
            progress.textContent = i18n.t('preparing');
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                let exported = 0;
                const zipEntries = {};

                const includeImages = State.includeImages || false;
                const currentConvId = ChatGPTHandler.getCurrentConversationId();

                // 只导出最近的 exportCount 个对话
                const convsToExport = allConvs.slice(0, exportCount);
                console.log(`Starting export of ${convsToExport.length} conversations (out of ${totalCount} total)`);

                for (let i = 0; i < convsToExport.length; i++) {
                    const conv = convsToExport[i];
                    progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}/${convsToExport.length}`;

                    if (i > 0 && i % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, Config.TIMING.BATCH_EXPORT_YIELD));
                    } else if (i > 0) {
                        await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                    }

                    try {
                        // Note: DOM image extraction only works for the currently open conversation
                        const shouldExtractImages = includeImages && conv.id === currentConvId;
                        const data = await ChatGPTHandler.getConversation(conv.id, shouldExtractImages);
                        if (data) {
                            const title = Utils.sanitizeFilename(data.title || conv.id);
                            const filename = `chatgpt_${conv.id.substring(0, 8)}_${title}.json`;
                            zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                            exported++;
                        }
                    } catch (error) {
                        console.error(`Failed to process ${conv.id}:`, error);
                    }
                }

                progress.textContent = `${i18n.t('compressing')}…`;
                const zipUint8 = fflate.zipSync(zipEntries, { level: 1 });
                const zipBlob = new Blob([zipUint8], { type: 'application/zip' });

                const zipFilename = `chatgpt_export_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;
                Utils.downloadFile(zipBlob, zipFilename);
                alert(`${i18n.t('successExported')} ${exported} ${i18n.t('conversations')}`);
            } catch (error) {
                ErrorHandler.handle(error, 'Export all conversations');
            } finally {
                Utils.restoreButton(btn, original);
                if (progress.parentNode) progress.parentNode.removeChild(progress);
            }
        },

        addUI: (controls) => {
            // Image inclusion toggle
            const imageToggle = Utils.createToggle(
                i18n.t('includeImages'),
                Config.IMAGE_SWITCH_ID,
                State.includeImages
            );

            const imageToggleInput = imageToggle.querySelector('input');
            imageToggleInput.addEventListener('change', (e) => {
                State.includeImages = e.target.checked;
                localStorage.setItem('includeImages', State.includeImages);
                console.log('[ChatGPT] Include images:', State.includeImages);
            });

            controls.appendChild(imageToggle);

            // Workspace type toggle
            const initialLabel = State.chatgptWorkspaceType === 'team' ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
            const workspaceToggle = Utils.createToggle(
                initialLabel,
                Config.WORKSPACE_TYPE_ID,
                State.chatgptWorkspaceType === 'team'
            );

            const toggleInput = workspaceToggle.querySelector('input');
            const toggleLabel = workspaceToggle.querySelector('.loominary-toggle-label');

            toggleInput.addEventListener('change', (e) => {
                State.chatgptWorkspaceType = e.target.checked ? 'team' : 'user';
                localStorage.setItem('chatGPTWorkspaceType', State.chatgptWorkspaceType);
                if (toggleLabel) toggleLabel.textContent = e.target.checked ? i18n.t('teamWorkspace') : i18n.t('userWorkspace');
                console.log('[ChatGPT] Workspace type changed to:', State.chatgptWorkspaceType);
                UI.recreatePanel();
            });

            controls.appendChild(workspaceToggle);
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                () => ChatGPTHandler.previewConversation()
            ));

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                (btn) => ChatGPTHandler.exportCurrent(btn)
            ));

            controls.appendChild(Utils.createButton(
                `${zipIcon} ${i18n.t('exportAllConversations')}`,
                (btn) => ChatGPTHandler.exportAll(btn, controls)
            ));

            const idLabel = document.createElement('div');
            idLabel.className = 'loominary-input-trigger';

            if (State.chatgptWorkspaceType === 'user') {
                idLabel.textContent = `${i18n.t('manualUserId')}`;
                idLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterUserId'));
                    if (newId?.trim()) {
                        State.chatgptUserId = newId.trim();
                        localStorage.setItem('chatGPTUserId', State.chatgptUserId);
                        alert(i18n.t('userIdSaved'));
                    }
                });
            } else {
                idLabel.textContent = `${i18n.t('manualWorkspaceId')}`;
                idLabel.addEventListener('click', () => {
                    const newId = prompt(i18n.t('enterWorkspaceId'));
                    if (newId?.trim()) {
                        State.chatgptWorkspaceId = newId.trim();
                        localStorage.setItem('chatGPTWorkspaceId', State.chatgptWorkspaceId);
                        alert(i18n.t('workspaceIdSaved'));
                    }
                });
            }

            controls.appendChild(idLabel);
        }
    };

    // Helper function to fetch images via GM_xmlhttpRequest (routes through background proxy in extension)
    function grok_fetchViaGM(url, headers = {}) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                return reject(new Error('GM_xmlhttpRequest not available'));
            }
            GM_xmlhttpRequest({
                method: "GET",
                url,
                headers,
                responseType: "blob",
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        resolve(r.response);
                    } else {
                        reject(new Error(`Status: ${r.status}`));
                    }
                },
                onerror: e => reject(new Error(e.statusText || 'Network error')),
                ontimeout: () => reject(new Error('Request timeout'))
            });
        });
    }

    // Fetch image URL via GM proxy and return base64 data (bypasses canvas, gets original file)
    async function grok_fetchImageAsData(url) {
        const blob = await grok_fetchViaGM(url);
        const base64Data = await Utils.blobToBase64(blob);
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
            const firstBytes = base64Data.substring(0, 20);
            if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
            else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
            else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
            else mimeType = 'image/jpeg';
        }
        return { type: 'image', format: mimeType, size: blob.size, data: base64Data, original_src: url };
    }

    // Process image element and return base64 data
    async function grok_processImageElement(imgElement) {
        if (!imgElement) return null;

        const url = imgElement.src;
        if (!url || url.startsWith('data:')) return null;

        try {
            let base64Data, mimeType, size;

            if (url.startsWith('blob:')) {
                try {
                    const blob = await fetch(url).then(r => r.ok ? r.blob() : Promise.reject());
                    base64Data = await Utils.blobToBase64(blob);
                    mimeType = blob.type;
                    size = blob.size;
                } catch (blobError) {
                    // Canvas fallback for blob URLs
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
                // Try Canvas method first (more reliable for already-loaded images)
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgElement.naturalWidth || imgElement.width;
                    canvas.height = imgElement.naturalHeight || imgElement.height;

                    if (canvas.width === 0 || canvas.height === 0) {
                        throw new Error('Image not loaded or has zero dimensions');
                    }

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imgElement, 0, 0);

                    const isPhoto = canvas.width * canvas.height > 50000;
                    const dataURL = isPhoto ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');

                    mimeType = isPhoto ? 'image/jpeg' : 'image/png';
                    base64Data = dataURL.split(',')[1];
                    size = Math.round((base64Data.length * 3) / 4);
                } catch (canvasError) {
                    // Fallback to GM_xmlhttpRequest if Canvas fails (CORS issues)
                    console.warn('[Grok] Canvas method failed, using GM_xmlhttpRequest fallback:', canvasError.message);

                    const blob = await grok_fetchViaGM(url);
                    base64Data = await Utils.blobToBase64(blob);
                    mimeType = blob.type;
                    size = blob.size;
                }

                // Fix MIME type if it's octet-stream or empty
                if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
                    if (url.includes('.jpg') || url.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (url.includes('.png')) {
                        mimeType = 'image/png';
                    } else if (url.includes('.gif')) {
                        mimeType = 'image/gif';
                    } else if (url.includes('.webp')) {
                        mimeType = 'image/webp';
                    } else {
                        // Detect from base64 magic bytes
                        const firstBytes = base64Data.substring(0, 20);
                        if (firstBytes.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
                        else if (firstBytes.startsWith('/9j/')) mimeType = 'image/jpeg';
                        else if (firstBytes.startsWith('R0lGOD')) mimeType = 'image/gif';
                        else if (firstBytes.startsWith('UklGR')) mimeType = 'image/webp';
                        else mimeType = 'image/png';
                    }
                }
            }

            return { type: 'image', format: mimeType, size, data: base64Data, original_src: url };
        } catch (e) {
            console.error('[Grok] Failed to process image:', e);
            return null;
        }
    }

    const GrokHandler = {
        init: () => {
            // Grok doesn't require special initialization like token capture
            console.log('[Loominary] GrokHandler initialized');
        },

        getCurrentConversationId: () => {
            // Grok URL: https://grok.com/{conversationId} - ID is the last segment of path
            const pathSegments = window.location.pathname.split('/').filter(s => s);
            const lastSegment = pathSegments[pathSegments.length - 1];
            // Grok conversation IDs are typically UUID-like (36 chars) or similar long strings
            if (lastSegment && lastSegment.length >= 20) {
                return lastSegment;
            }
            return null;
        },

        getAllConversations: async () => {
            try {
                const response = await fetch('/rest/app-chat/conversations', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.status}`);
                const data = await response.json();
                return data.conversations || [];
            } catch (error) {
                console.error('[Loominary] Get all conversations error:', error);
                return null;
            }
        },

        getConversation: async (conversationId) => {
            try {
                // Step 1: Get all response nodes with tree structure
                const nodeUrl = `/rest/app-chat/conversations/${conversationId}/response-node?includeThreads=true`;
                const nodeResponse = await fetch(nodeUrl, {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                if (!nodeResponse.ok) throw new Error(`Failed to get response nodes: ${nodeResponse.status}`);
                const nodeData = await nodeResponse.json();
                const responseNodes = nodeData.responseNodes || [];
                const responseIds = responseNodes.map(node => node.responseId);

                if (!responseIds.length) {
                    return { conversationId, responses: [], title: null, conversationTree: null };
                }

                // Step 2: Load full conversation content
                const loadUrl = `/rest/app-chat/conversations/${conversationId}/load-responses`;
                const loadResponse = await fetch(loadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ responseIds })
                });
                if (!loadResponse.ok) throw new Error(`Failed to load responses: ${loadResponse.status}`);
                const conversationData = await loadResponse.json();

                // Step 3: Build tree structure map
                const nodeMap = new Map();
                responseNodes.forEach(node => {
                    nodeMap.set(node.responseId, {
                        responseId: node.responseId,
                        parentResponseId: node.parentResponseId || null,
                        childResponseIds: node.childResponseIds || [],
                        threadId: node.threadId || null
                    });
                });

                // Step 4: Process and structure the data
                const processedResponses = (conversationData.responses || [])
                    .filter(r => !r.partial)
                    .sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
                    .map(r => {
                        const processed = {
                            responseId: r.responseId,
                            sender: r.sender,
                            createTime: r.createTime,
                            message: r.message || ''
                        };

                        // Add tree structure information
                        const nodeInfo = nodeMap.get(r.responseId);
                        if (nodeInfo) {
                            processed.parentResponseId = nodeInfo.parentResponseId;
                            processed.childResponseIds = nodeInfo.childResponseIds;
                            if (nodeInfo.threadId) {
                                processed.threadId = nodeInfo.threadId;
                            }
                        }

                        // Process citations if present
                        if (r.sender === 'assistant' && r.cardAttachmentsJson && r.webSearchResults) {
                            const citations = [];
                            try {
                                r.cardAttachmentsJson.forEach(cardStr => {
                                    const card = JSON.parse(cardStr);
                                    if (card.cardType === 'citation_card' && card.url) {
                                        const searchResult = r.webSearchResults.find(sr => sr.url === card.url);
                                        citations.push({
                                            id: card.id,
                                            url: card.url,
                                            title: searchResult?.title || 'Source'
                                        });
                                    }
                                });
                            } catch (e) {
                                console.warn('[Loominary] Failed to parse cardAttachmentsJson:', e);
                            }
                            if (citations.length > 0) {
                                processed.citations = citations;
                            }
                            if (r.webSearchResults) {
                                processed.webSearchResults = r.webSearchResults;
                            }
                        }

                        // Include other potentially useful fields
                        if (r.attachments) processed.attachments = r.attachments;
                        if (r.cardAttachmentsJson) processed.cardAttachmentsJson = r.cardAttachmentsJson;
                        if (r.imageAttachments) processed.imageAttachments = r.imageAttachments;
                        if (r.fileAttachments) processed.fileAttachments = r.fileAttachments;

                        return processed;
                    });

                // Try to get conversation title from list if available
                let title = null;
                try {
                    const allConvs = await GrokHandler.getAllConversations();
                    const conv = allConvs?.find(c => c.conversationId === conversationId);
                    title = conv?.title || null;
                } catch (e) {
                    console.warn('[Loominary] Could not fetch title:', e);
                }

                // Step 5: Capture images from DOM if State.includeImages is true
                if (State.includeImages) {
                    const processedUrls = new Set();

                    // Helper: resolve DOM response container to a processedResponse entry
                    function resolveContainer(el) {
                        const container = el.closest('[id^="response-"]');
                        if (!container) return null;
                        const responseId = container.id.replace('response-', '');
                        return processedResponses.find(r => r.responseId === responseId) || null;
                    }

                    // Method 1: AI-generated images — start from the img element, walk up to find response
                    const allGeneratedImgs = document.querySelectorAll('[data-testid="image-viewer"] img[src*="assets.grok.com"]');

                    for (const img of allGeneratedImgs) {
                        // Skip blurred background images (check both inline style and computed)
                        const parentStyle = img.parentElement?.style;
                        if (parentStyle && parentStyle.filter && parentStyle.filter.includes('blur')) continue;

                        if (processedUrls.has(img.src)) continue;
                        processedUrls.add(img.src);

                        try {
                            // Use GM fetch directly to get original file (bypasses canvas thumbnail capture)
                            const imageData = await grok_fetchImageAsData(img.src);
                            if (!imageData) continue;

                            // Prefer DOM-position match; fallback to last assistant response
                            let target = resolveContainer(img);
                            if (!target) {
                                const assistants = processedResponses.filter(r => r.sender === 'assistant');
                                target = assistants[assistants.length - 1] || null;
                            }

                            if (target) {
                                if (!target.capturedImages) target.capturedImages = [];
                                target.capturedImages.push({ ...imageData, source: 'ai_generated' });
                                console.log(`[Grok] Captured AI image for response ${target.responseId}`);
                            }
                        } catch (e) {
                            console.error('[Grok] Failed to process AI image:', e);
                        }
                    }

                    // Method 2: User-uploaded images — figure elements with preview-image URLs
                    const allUserImages = document.querySelectorAll('figure img[src*="assets.grok.com"][src*="preview-image"]');

                    for (const img of allUserImages) {
                        if (processedUrls.has(img.src)) continue;
                        processedUrls.add(img.src);

                        try {
                            // Strip /preview-image suffix to get full-size URL, fallback to thumbnail
                            const thumbnailUrl = img.src;
                            const fullSizeUrl = thumbnailUrl.includes('/preview-image')
                                ? thumbnailUrl.split('/preview-image')[0]
                                : thumbnailUrl;
                            if (fullSizeUrl !== thumbnailUrl) processedUrls.add(fullSizeUrl);

                            let imageData = null;
                            if (fullSizeUrl !== thumbnailUrl) {
                                try {
                                    imageData = await grok_fetchImageAsData(fullSizeUrl);
                                } catch (e) {
                                    console.warn('[Grok] Full-size fetch failed, using thumbnail:', e.message);
                                }
                            }
                            if (!imageData) {
                                imageData = await grok_fetchImageAsData(thumbnailUrl);
                            }
                            if (!imageData) continue;

                            // Prefer DOM-position match; fallback to last human with any attachments
                            let target = resolveContainer(img);
                            if (!target) {
                                const humanResponses = processedResponses.filter(r =>
                                    r.sender === 'human' &&
                                    ((r.fileAttachments && r.fileAttachments.length > 0) ||
                                     (r.imageAttachments && r.imageAttachments.length > 0))
                                );
                                target = humanResponses[humanResponses.length - 1] || null;
                            }

                            if (target) {
                                if (!target.capturedImages) target.capturedImages = [];
                                target.capturedImages.push({ ...imageData, source: 'user_upload' });
                                console.log(`[Grok] Captured user-uploaded image for response ${target.responseId}`);
                            } else {
                                console.warn('[Grok] No matching response found for user-uploaded image');
                            }
                        } catch (e) {
                            console.error('[Grok] Failed to process user image:', e);
                        }
                    }
                }

                return {
                    conversationId,
                    title,
                    responses: processedResponses,
                    conversationTree: {
                        nodes: Array.from(nodeMap.values()),
                        rootNodeId: responseNodes.find(n => !n.parentResponseId)?.responseId || null
                    },
                    exportTime: new Date().toISOString(),
                    platform: 'grok'
                };
            } catch (error) {
                console.error('[Loominary] Get conversation error:', error);
                throw error;
            }
        },

        addUI: (controls) => {
            // Initialize includeImages to true by default for Grok if not set
            if (localStorage.getItem('includeImages') === null) {
                State.includeImages = true;
                localStorage.setItem('includeImages', 'true');
                console.log('[Grok] Initialized includeImages to true by default');
            }

            // Add "Include Images" toggle
            const imageToggle = Utils.createToggle(
                i18n.t('includeImages'),
                'loominary-include-images-toggle',
                State.includeImages
            );
            const imageToggleInput = imageToggle.querySelector('input');
            imageToggleInput.addEventListener('change', (e) => {
                State.includeImages = e.target.checked;
                localStorage.setItem('includeImages', State.includeImages);
                console.log('[Grok] Include images:', State.includeImages);
            });
            controls.appendChild(imageToggle);
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                async (btn) => {
                    const conversationId = GrokHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('loading'));
                    try {
                        const data = await GrokHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        const jsonString = JSON.stringify(data, null, 2);
                        const filename = `grok_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
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

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                async (btn) => {
                    const conversationId = GrokHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('exporting'));
                    try {
                        const data = await GrokHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        const title = data.title || conversationId.substring(0, 8);
                        const filename = `grok_${Utils.sanitizeFilename(title)}_${conversationId.substring(0, 8)}`;
                        await loominaryExportMarkdown(data, filename);
                    } catch (error) {
                        ErrorHandler.handle(error, 'Export conversation');
                    } finally {
                        Utils.restoreButton(btn, original);
                    }
                }
            ));

            controls.appendChild(Utils.createButton(
                `${zipIcon} ${i18n.t('exportAllConversations')}`,
                (btn) => GrokHandler.exportAll(btn, controls)
            ));
        },

        exportAll: async (btn, controlsArea) => {
            if (typeof fflate === 'undefined' || typeof fflate.zipSync !== 'function' || typeof fflate.strToU8 !== 'function') {
                const errorMsg = i18n.currentLang === 'zh'
                    ? '批量导出功能需要压缩库支持。\n\n由于当前平台的安全策略限制,该功能暂时不可用。\n建议使用"导出当前"功能单个导出对话。'
                    : 'Batch export requires compression library.\n\nThis feature is currently unavailable due to platform security policies.\nPlease use "Export" button to export conversations individually.';
                alert(errorMsg);
                return;
            }

            // 先探测对话数量
            const original = btn.innerHTML;
            Utils.setButtonLoading(btn, i18n.t('detectingConversations'));

            let allConvs;
            try {
                allConvs = await GrokHandler.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs)) throw new Error(i18n.t('fetchFailed'));
            } catch (error) {
                ErrorHandler.handle(error, 'Detect conversations');
                Utils.restoreButton(btn, original);
                return;
            }

            const totalCount = allConvs.length;
            Utils.restoreButton(btn, original);

            // 弹出确认框让用户选择导出数量
            const promptMsg = i18n.currentLang === 'zh'
                ? `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`
                : `${i18n.t('foundConversations')} ${totalCount} ${i18n.t('conversations')}\n\n${i18n.t('selectExportCount')}`;

            const userInput = prompt(promptMsg, totalCount.toString());

            // 用户取消
            if (userInput === null) {
                alert(i18n.t('exportCancelled'));
                return;
            }

            // 解析用户输入
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

            // 开始导出
            const progress = Utils.createProgressElem(controlsArea);
            progress.textContent = i18n.t('preparing');
            Utils.setButtonLoading(btn, i18n.t('exporting'));

            try {
                let exported = 0;
                const zipEntries = {};

                // 只导出最近的 exportCount 个对话
                const convsToExport = allConvs.slice(0, exportCount);
                console.log(`[Grok] Starting export of ${convsToExport.length} conversations (out of ${totalCount} total)`);

                for (let i = 0; i < convsToExport.length; i++) {
                    const conv = convsToExport[i];
                    progress.textContent = `${i18n.t('gettingConversation')} ${i + 1}/${convsToExport.length}`;

                    if (i > 0 && i % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, Config.TIMING.BATCH_EXPORT_YIELD));
                    } else if (i > 0) {
                        await Utils.sleep(Config.TIMING.BATCH_EXPORT_SLEEP);
                    }

                    try {
                        const data = await GrokHandler.getConversation(conv.conversationId);
                        if (data) {
                            const title = Utils.sanitizeFilename(data.title || conv.conversationId);
                            const filename = `grok_${conv.conversationId.substring(0, 8)}_${title}.json`;
                            zipEntries[filename] = fflate.strToU8(JSON.stringify(data, null, 2));
                            exported++;
                        }
                    } catch (error) {
                        console.error(`[Lyra] Failed to process ${conv.conversationId}:`, error);
                    }
                }

                progress.textContent = `${i18n.t('compressing')}…`;
                const zipUint8 = fflate.zipSync(zipEntries, { level: 1 });
                const zipBlob = new Blob([zipUint8], { type: 'application/zip' });

                const zipFilename = `grok_export_${exportCount === totalCount ? 'all' : 'recent_' + exportCount}_${new Date().toISOString().slice(0, 10)}.zip`;
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


    const CopilotHandler = {
        init: () => {
            // Copilot doesn't require special initialization like token capture
            console.log('[Loominary] CopilotHandler initialized');
        },

        getCurrentConversationId: () => {
            // Copilot URL patterns:
            // https://copilot.microsoft.com/chats/{conversationId}
            // https://copilot.microsoft.com/sl/{conversationId}
            const pathSegments = window.location.pathname.split('/').filter(s => s);

            // Check for /chats/ or /sl/ pattern
            const chatsIndex = pathSegments.indexOf('chats');
            const slIndex = pathSegments.indexOf('sl');

            if (chatsIndex !== -1 && pathSegments[chatsIndex + 1]) {
                return pathSegments[chatsIndex + 1];
            }
            if (slIndex !== -1 && pathSegments[slIndex + 1]) {
                return pathSegments[slIndex + 1];
            }

            // Fallback: try last segment if it looks like an ID
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment && lastSegment.length >= 10 && !['copilot', 'chats', 'sl'].includes(lastSegment)) {
                return lastSegment;
            }

            return null;
        },


        getConversation: async (conversationId) => {
            try {
                // Always try to extract from DOM for Copilot
                // API endpoints often return empty messages
                console.log('[Copilot] Extracting conversation from DOM...');
                const conversationData = await CopilotHandler.extractFromDOM();

                if (!conversationData) {
                    throw new Error('Could not extract conversation data from DOM');
                }

                // Get messages from the conversation data
                let messages = conversationData.messages || conversationData.responses || [];

                // Simple format without responseId and createTime
                const processedResponses = messages.map(msg => ({
                    sender: msg.sender || msg.author || (msg.role === 'user' ? 'human' : 'assistant'),
                    message: msg.message || msg.content || msg.text || ''
                }));

                console.log('[Copilot] Processed responses count:', processedResponses.length);

                return {
                    conversationId,
                    title: conversationData.title || CopilotHandler.extractTitle() || '未命名对话',
                    responses: processedResponses,
                    exportTime: new Date().toISOString(),
                    platform: 'copilot'
                };
            } catch (error) {
                console.error('[Loominary] Get conversation error:', error);
                throw error;
            }
        },

        extractFromDOM: async () => {
            console.log('[Copilot] Starting DOM extraction...');

            // Get text with Markdown formatting from DOM
            const getFormattedText = (root) => {
                let texts = [];

                // Context for tracking list state
                const listStack = []; // Stack of { type: 'ul'|'ol', index: number }

                const getIndent = () => '    '.repeat(Math.max(0, listStack.length - 1));

                const walk = (node) => {
                    if (!node) return;

                    // Text node
                    if (node.nodeType === 3) {
                        const text = node.textContent || '';
                        if (text.trim()) {
                            // Normalize whitespace but preserve single spaces
                            texts.push(text.replace(/\s+/g, ' '));
                        }
                        return;
                    }

                    // Element node
                    if (node.nodeType === 1) {
                        const tag = node.tagName ? node.tagName.toUpperCase() : '';
                        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return;

                        // Handle specific HTML tags to preserve formatting
                        switch (tag) {
                            case 'BR':
                                texts.push('\n');
                                return;

                            case 'P':
                            case 'DIV':
                                // Check if this is inside a list item
                                const isInListItem = listStack.length > 0;

                                // Add line break before paragraph/div (but not if inside LI)
                                if (!isInListItem && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }

                                for (const child of node.childNodes) {
                                    walk(child);
                                }

                                // Add line break after paragraph/div (but not if inside LI)
                                if (!isInListItem && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                return;

                            case 'UL':
                                // Start unordered list
                                // Only add newline if this is a top-level list (not nested)
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                listStack.push({ type: 'ul', index: 0 });
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                listStack.pop();
                                // Add newline after top-level list
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                return;

                            case 'OL':
                                // Start ordered list
                                // Only add newline if this is a top-level list (not nested)
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                const startAttr = node.getAttribute('start');
                                const startIndex = startAttr ? parseInt(startAttr, 10) : 1;
                                listStack.push({ type: 'ol', index: startIndex });
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                listStack.pop();
                                // Add newline after top-level list
                                if (listStack.length === 0 && texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                return;

                            case 'LI':
                                // Handle list item based on parent list type
                                const currentList = listStack[listStack.length - 1];
                                const indent = getIndent();

                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }

                                if (currentList && currentList.type === 'ol') {
                                    // Ordered list: use number
                                    texts.push(`${indent}${currentList.index}. `);
                                    currentList.index++;
                                } else {
                                    // Unordered list or no parent list: use bullet
                                    texts.push(`${indent}- `);
                                }

                                // Process children, handling nested lists separately
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                return;

                            case 'STRONG':
                            case 'B':
                                texts.push('**');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('**');
                                return;

                            case 'EM':
                            case 'I':
                                texts.push('*');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('*');
                                return;

                            case 'DEL':
                            case 'S':
                                texts.push('~~');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('~~');
                                return;

                            case 'CODE':
                                // Inline code
                                const codeText = node.textContent || '';
                                if (codeText.trim()) {
                                    // Use backticks, escape if content contains backticks
                                    if (codeText.includes('`')) {
                                        texts.push('`` ' + codeText + ' ``');
                                    } else {
                                        texts.push('`' + codeText + '`');
                                    }
                                }
                                return;

                            case 'PRE':
                                // Code block
                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                const codeEl = node.querySelector('code');
                                const preText = (codeEl || node).textContent || '';
                                // Try to detect language from class
                                let lang = '';
                                const langClass = (codeEl || node).className.match(/language-(\w+)/);
                                if (langClass) lang = langClass[1];
                                texts.push('```' + lang + '\n' + preText.trim() + '\n```\n');
                                return;

                            case 'A':
                                // Links
                                const href = node.getAttribute('href');
                                const linkText = node.textContent || '';
                                if (href && linkText.trim()) {
                                    texts.push(`[${linkText.trim()}](${href})`);
                                } else if (linkText.trim()) {
                                    texts.push(linkText);
                                }
                                return;

                            case 'H1':
                            case 'H2':
                            case 'H3':
                            case 'H4':
                            case 'H5':
                            case 'H6':
                                const level = parseInt(tag[1], 10);
                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                texts.push('#'.repeat(level) + ' ');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('\n');
                                return;

                            case 'BLOCKQUOTE':
                                if (texts.length > 0 && !texts[texts.length - 1].endsWith('\n')) {
                                    texts.push('\n');
                                }
                                texts.push('> ');
                                for (const child of node.childNodes) {
                                    walk(child);
                                }
                                texts.push('\n');
                                return;

                            case 'HR':
                                texts.push('\n---\n');
                                return;
                        }

                        // Check shadow DOM
                        if (node.shadowRoot) {
                            walk(node.shadowRoot);
                        }

                        // Default: process children
                        for (const child of node.childNodes) {
                            walk(child);
                        }
                    }
                };

                walk(root);
                return texts.join('');
            };

            // Find the main conversation container
            // Try to locate the actual conversation area, not the entire body
            const conversationSelectors = [
                // Copilot specific selectors (most specific first)
                '[class*="conversation"]',
                '[class*="chat"]',
                '[class*="messages"]',
                'article[role="article"]',
                'section[role="region"]',
                // Generic selectors (fallback)
                'main[role="main"]',
                '[role="main"]',
                'main',
                'body'
            ];

            let conversationRoot = null;
            for (const selector of conversationSelectors) {
                const candidate = document.querySelector(selector);
                if (candidate) {
                    // Verify this container has actual message content
                    const text = candidate.textContent || '';
                    // Must contain at least one message marker
                    if (text.includes('你说') || text.includes('You') || text.includes('Copilot')) {
                        conversationRoot = candidate;
                        console.log('[Copilot] Using conversation root:', selector);
                        break;
                    }
                }
            }

            // Fallback to body if no suitable container found
            if (!conversationRoot) {
                conversationRoot = document.body;
                console.log('[Copilot] Using fallback: document.body');
            }

            const fullText = getFormattedText(conversationRoot || document.body);
            console.log('[Copilot] Total text length:', fullText.length);
            console.log('[Copilot] Text preview:', fullText.substring(0, 1000));

            // Parse messages using regex patterns
            const messages = [];

            // Match patterns - support both with and without # markers
            // Pattern matches: "你说", "You", "Copilot 说", "Copilot said", etc.
            // Also supports heading markers like "##### 你说" or "###### Copilot 说"
            const pattern = /(?:^|\n)(?:#{1,6}\s*)?(你说|You\s*(?:said)?|Copilot\s*说|Copilot\s*(?:said)?)/gim;

            const matches = [];
            let match;
            while ((match = pattern.exec(fullText)) !== null) {
                const marker = match[1].trim();
                matches.push({
                    // Store the full match start (including ### markers)
                    matchStart: match.index,
                    // Store where the actual marker text starts
                    markerStart: match.index + match[0].indexOf(match[1]),
                    marker: marker,
                    fullMatch: match[0],
                    isUser: marker.includes('你说') || marker.toLowerCase().startsWith('you')
                });
            }

            console.log('[Copilot] Found markers:', matches.length);
            matches.forEach(m => console.log(`  - "${m.marker}" at ${m.markerStart} (${m.isUser ? 'user' : 'assistant'})`));

            // Extract content between markers
            for (let i = 0; i < matches.length; i++) {
                const current = matches[i];
                const next = matches[i + 1];

                // Extract content: start after current marker, end before next marker's FULL match (including ###)
                const startIndex = current.markerStart + current.marker.length;
                const endIndex = next ? next.matchStart : fullText.length;
                const content = fullText.substring(startIndex, endIndex).trim();

                if (content) {
                    messages.push({
                        sender: current.isUser ? 'human' : 'assistant',
                        message: content,
                        createTime: new Date().toISOString()
                    });
                }
            }

            console.log(`[Copilot] Extracted ${messages.length} raw messages`);

            // Merge consecutive messages from the same sender
            const mergedMessages = [];
            for (const msg of messages) {
                const lastMsg = mergedMessages[mergedMessages.length - 1];
                if (lastMsg && lastMsg.sender === msg.sender) {
                    // Same sender, merge content
                    lastMsg.message += '\n' + msg.message;
                } else {
                    // Different sender or first message
                    mergedMessages.push({
                        sender: msg.sender,
                        message: msg.message
                    });
                }
            }

            // Post-process messages to add markdown formatting
            for (const msg of mergedMessages) {
                let text = msg.message;
                // Convert "第N步：XXX" patterns to headings
                text = text.replace(/^(第[一二三四五六七八九十\d]+步[：:]\s*.+)$/gm, '\n## $1');
                // Ensure patterns like "第N周：" are bold if not already
                text = text.replace(/^- (第[一二三四五六七八九十\d]+周[：:]\s*)(?!\*\*)/gm, '- **$1**');
                text = text.replace(/^- (前[一二三四五六七八九十两\d]+小时[：:]\s*)(?!\*\*)/gm, '- **$1**');
                text = text.replace(/^- (后[一二三四五六七八九十两\d]+小时[：:]\s*)(?!\*\*)/gm, '- **$1**');
                text = text.replace(/^- (每周[末日][：:]\s*)(?!\*\*)/gm, '- **$1**');
                msg.message = text;
            }

            // Clean UI elements from all messages, especially the last one
            const uiPatterns = [
                /\n*向 Copilot 发送消息[\s\S]*$/i,
                /\n*Send a message to Copilot[\s\S]*$/i,
                /\n*Smart\n*预览对话[\s\S]*$/i,
                /\n*Smart\n*🌐[\s\S]*$/i,
                /\n*预览对话\n*导出中[\s\S]*$/i,
                /\n*🌐\s*简体中文\**\s*$/i,
                /\n*深度思考\s*$/i
            ];

            for (const msg of mergedMessages) {
                let cleaned = msg.message;
                for (const pattern of uiPatterns) {
                    cleaned = cleaned.replace(pattern, '');
                }
                // Clean up trailing whitespace and newlines
                cleaned = cleaned.replace(/[\s\n]+$/, '').trim();
                if (cleaned !== msg.message) {
                    console.log('[Copilot] Cleaned UI elements from message');
                }
                msg.message = cleaned;
            }

            // Remove empty messages after cleaning
            const finalMessages = mergedMessages.filter(msg => msg.message.length > 0);
            if (finalMessages.length < mergedMessages.length) {
                console.log('[Copilot] Removed empty messages after cleaning');
            }

            console.log(`[Copilot] Final message count: ${finalMessages.length}`);
            if (finalMessages.length > 0) {
                console.log('[Copilot] Sample messages:', finalMessages.slice(0, 2));
            } else {
                console.warn('[Copilot] No messages found! Check console logs above for text content.');
            }

            return {
                messages: finalMessages,
                title: CopilotHandler.extractTitle() || document.title || '未命名对话'
            };
        },

        extractTitle: () => {
            // Try to extract conversation title
            const titleSelectors = [
                '[data-testid="conversation-title"]',
                '.conversation-title',
                'h1',
                'h2',
                '.title'
            ];

            for (const selector of titleSelectors) {
                const titleEl = document.querySelector(selector);
                if (titleEl && titleEl.textContent.trim()) {
                    return titleEl.textContent.trim();
                }
            }

            // Use first user message as title
            return null;
        },

        addUI: () => {
            // No additional UI needed for Copilot
        },

        addButtons: (controls) => {
            controls.appendChild(Utils.createButton(
                `${previewIcon} ${i18n.t('viewOnline')}`,
                async (btn) => {
                    const conversationId = CopilotHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('loading'));
                    try {
                        const data = await CopilotHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        const jsonString = JSON.stringify(data, null, 2);
                        const filename = `copilot_${data.title || 'conversation'}_${conversationId.substring(0, 8)}.json`;
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

            controls.appendChild(Utils.createButton(
                `${exportIcon} ${i18n.t('exportCurrentJSON')}`,
                async (btn) => {
                    const conversationId = CopilotHandler.getCurrentConversationId();
                    if (!conversationId) {
                        alert(i18n.t('uuidNotFound'));
                        return;
                    }
                    const filename = prompt(i18n.t('enterFilename'), Utils.sanitizeFilename(`copilot_${conversationId.substring(0, 8)}`));
                    if (!filename?.trim()) return;
                    const original = btn.innerHTML;
                    Utils.setButtonLoading(btn, i18n.t('exporting'));
                    try {
                        const data = await CopilotHandler.getConversation(conversationId);
                        if (!data) throw new Error(i18n.t('fetchFailed'));
                        Utils.downloadJSON(JSON.stringify(data, null, 2), `${filename.trim()}.json`);
                    } catch (error) {
                        ErrorHandler.handle(error, 'Export conversation');
                    } finally {
                        Utils.restoreButton(btn, original);
                    }
                }
            ));
        }
    };


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


    const UI = {

        injectStyle: () => {
            const platformColors = {
                claude: '#141413',
                // #platform: chatgpt
                chatgpt: '#10A37F',
                // #endplatform
                // #platform: grok
                grok: '#000000',
                // #endplatform
                // #platform: copilot
                copilot: '#151a28',
                // #endplatform
                // #platform: gemini
                gemini: '#1a73e8',

                aistudio: '#777779'
                // #endplatform
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

            // #platform: gemini
            if (State.currentPlatform === 'gemini') {
                Object.assign(container.style, {
                    position: 'fixed',
                    top: '50%',
                    right: '0',
                    transform: 'translateY(-50%) translateX(10px)',
                    background: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '8px',
                    padding: '16px 16px 8px 16px',
                    width: '136px',
                    zIndex: '999999',
                    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                    transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    boxSizing: 'border-box'
                });
            }
            // #endplatform

            const toggle = document.createElement('div');
            toggle.id = Config.TOGGLE_ID;
            safeSetInnerHTML(toggle, State.isPanelCollapsed ? collapseIcon : expandIcon);
            toggle.addEventListener('click', UI.toggleCollapsed);
            container.appendChild(toggle);

            const controls = document.createElement('div');
            controls.className = 'loominary-main-controls';

            // #platform: gemini
            if (State.currentPlatform === 'gemini') {
                Object.assign(controls.style, {
                    marginLeft: '0px',
                    padding: '0 3px',
                    transition: 'opacity 0.7s'
                });
            }
            // #endplatform

            const title = document.createElement('div');
            title.className = 'loominary-title';
            const titles = {
                claude: 'Claude',
                // #platform: chatgpt
                chatgpt: 'ChatGPT',
                // #endplatform
                // #platform: grok
                grok: 'Grok',
                // #endplatform
                // #platform: copilot
                copilot: 'Copilot',
                // #endplatform
                // #platform: gemini
                gemini: 'Gemini', aistudio: 'AI Studio',
                // #endplatform
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
            // #platform: chatgpt
            if (State.currentPlatform === 'chatgpt') {
                ChatGPTHandler.addUI(controls);
                ChatGPTHandler.addButtons(controls);
            }
            // #endplatform
            // #platform: grok
            if (State.currentPlatform === 'grok') {
                GrokHandler.addUI(controls);
                GrokHandler.addButtons(controls);
            }
            // #endplatform
            // #platform: copilot
            if (State.currentPlatform === 'copilot') {
                CopilotHandler.addUI(controls);
                CopilotHandler.addButtons(controls);
            }
            // #endplatform
            // #platform: gemini
            if (['gemini', 'aistudio'].includes(State.currentPlatform)) {
                ScraperHandler.addButtons(controls, State.currentPlatform);
            }
            // #endplatform

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
        // #platform: chatgpt
        if (State.currentPlatform === 'chatgpt') ChatGPTHandler.init();
        // #endplatform
        // #platform: grok
        if (State.currentPlatform === 'grok') GrokHandler.init();
        // #endplatform
        // #platform: copilot
        if (State.currentPlatform === 'copilot') CopilotHandler.init();
        // #endplatform
        // #platform: gemini
        if (State.currentPlatform === 'aistudio') AiStudioXHR.init();
        // #endplatform

        UI.injectStyle();

        const initPanel = () => {
            UI.createPanel();
            if (['claude'/* #platform: chatgpt */, 'chatgpt'/* #endplatform *//* #platform: grok */, 'grok'/* #endplatform *//* #platform: copilot */, 'copilot'/* #endplatform *//* #platform: gemini */, 'gemini', 'aistudio'/* #endplatform */].includes(State.currentPlatform)) {
                let lastUrl = window.location.href;
                let panelCheckTimer = null;
                new MutationObserver(() => {
                    // URL 变化时重建面板
                    if (window.location.href !== lastUrl) {
                        lastUrl = window.location.href;
                        setTimeout(() => {
                            if (!document.getElementById(Config.CONTROL_ID)) {
                                State.panelInjected = false;
                                UI.createPanel();
                            }
                        }, 1000);
                    }
                    // SPA 框架可能在初始化时移除我们的面板，防抖检测并重建
                    if (State.panelInjected && !document.getElementById(Config.CONTROL_ID)) {
                        clearTimeout(panelCheckTimer);
                        panelCheckTimer = setTimeout(() => {
                            if (!document.getElementById(Config.CONTROL_ID)) {
                                State.panelInjected = false;
                                UI.createPanel();
                            }
                        }, 500);
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