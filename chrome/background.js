// ============================================================
// Loominary - Background Service Worker
// 处理跨域请求和扩展后台任务
// ============================================================

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'LOOMINARY_FETCH') {
        // 代理 fetch 请求（解决某些 CORS 问题）
        handleFetch(request.options)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true; // 保持消息通道开放
    }

    if (request.type === 'LOOMINARY_DOWNLOAD') {
        // 处理文件下载
        handleDownload(request.options)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    if (request.type === 'LOOMINARY_OPEN_SIDEPANEL') {
        // 打开新 Tab 并传递数据
        handleOpenTab(request.data)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function handleFetch(options) {
    const { url, method = 'GET', headers = {}, body, responseType = 'json' } = options;

    // 对 JSON GET 请求，优先通过页面上下文执行 fetch（同源，cookies 完整）
    if (responseType === 'json' && method === 'GET' && !body) {
        try {
            const urlOrigin = new URL(url).origin;
            const allTabs = await chrome.tabs.query({});
            console.log('[Loominary Background] Tabs found:', allTabs.length, 'looking for:', urlOrigin);
            const matchingTab = allTabs.find(t => t.url && t.url.startsWith(urlOrigin + '/'));
            if (matchingTab) {
                console.log('[Loominary Background] Using scripting.executeScript on tab:', matchingTab.id, matchingTab.url);
                const results = await chrome.scripting.executeScript({
                    target: { tabId: matchingTab.id },
                    func: (fetchUrl) => fetch(fetchUrl)
                        .then(async r => {
                            if (!r.ok) return { success: false, status: r.status, error: `HTTP ${r.status}` };
                            return r.json().then(data => ({ success: true, data }));
                        })
                        .catch(err => ({ success: false, error: err.message })),
                    args: [url]
                });
                const result = results?.[0]?.result;
                console.log('[Loominary Background] Script result:', result?.success, result?.status, result?.error);
                if (result?.success || result?.status) return result;
            } else {
                console.warn('[Loominary Background] No matching tab for:', urlOrigin, '- falling through to direct fetch');
                // 不 return，让它 fall through 到下面的直接 fetch
            }
        } catch (e) {
            console.warn('[Loominary Background] executeScript failed, falling back to direct fetch:', e.message);
        }
    }

    try {
        // Chrome background SW 有 host_permissions CORS 豁免，可以用 credentials: 'include'
        // Firefox background script 不豁免 CORS，include + ACAO:* 会失败，需要回退到 omit
        const isImageFetch = responseType === 'blob' || responseType === 'arraybuffer';
        const fetchOptions = {
            method,
            headers,
            credentials: isImageFetch ? 'include' : 'include'
        };

        if (body) {
            fetchOptions.body = body;
        }

        let response;
        try {
            response = await fetch(url, fetchOptions);
        } catch (e) {
            // Firefox CORS 失败时，回退到 credentials: 'omit'
            if (isImageFetch) {
                fetchOptions.credentials = 'omit';
                response = await fetch(url, fetchOptions);
            } else {
                throw e;
            }
        }

        console.log('[Loominary Background] Direct fetch response:', response.status, response.headers.get('content-type'), url.substring(0, 80));

        let data;
        if (responseType === 'blob') {
            const blob = await response.blob();
            // 将 blob 转换为 base64 以便传输
            const reader = new FileReader();
            data = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else if (responseType === 'json') {
            data = await response.json();
        } else if (responseType === 'arraybuffer') {
            const buffer = await response.arrayBuffer();
            data = Array.from(new Uint8Array(buffer));
        } else {
            data = await response.text();
        }

        return {
            success: true,
            status: response.status,
            statusText: response.statusText,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function handleDownload(options) {
    const { url, filename } = options;

    try {
        await chrome.downloads.download({
            url,
            filename,
            saveAs: true
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleOpenTab(data) {
    try {
        const label = data?.files ? `[${data.files.length} files]` : data?.filename;
        console.log('[Loominary Background] Received data to open tab:', label);

        // Support both single-file { content, filename } and multi-file { files: [...] }
        if (!data?.files) {
            console.log('[Loominary Background] content type:', typeof data?.content);
            console.log('[Loominary Background] content length:', typeof data?.content === 'string' ? data.content.length : JSON.stringify(data?.content)?.length);
        }

        // Store as-is, preserving whatever format was sent
        await chrome.storage.local.set({
            loominary_pending_data: { ...data, timestamp: Date.now() }
        });

        // Verify storage
        const verify = await chrome.storage.local.get(['loominary_pending_data']);
        if (verify.loominary_pending_data?.files) {
            console.log('[Loominary Background] Storage verify - files count:', verify.loominary_pending_data.files.length);
        } else {
            console.log('[Loominary Background] Storage verify - content type:', typeof verify.loominary_pending_data?.content);
            console.log('[Loominary Background] Storage verify - content length:', typeof verify.loominary_pending_data?.content === 'string' ? verify.loominary_pending_data.content.length : 'not string');
        }
        console.log('[Loominary Background] Data stored successfully');

        // 打开新 Tab
        await chrome.tabs.create({ url: chrome.runtime.getURL('app/index.html') });
        console.log('[Loominary Background] Tab opened successfully');

        return { success: true };
    } catch (error) {
        console.error('[Loominary Background] Error opening tab:', error);
        throw error;
    }
}

// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        console.log('[Loominary Extension] Installed successfully');
    } else if (details.reason === 'update') {
        console.log('[Loominary Extension] Updated to version', chrome.runtime.getManifest().version);
    }

    // Firefox MV3: host_permissions 不会自动授予，检查并提示用户
    try {
        const manifest = chrome.runtime.getManifest();
        const origins = manifest.host_permissions || [];
        if (origins.length) {
            const granted = await chrome.permissions.contains({ origins });
            if (!granted) {
                // 在扩展图标上显示提示，引导用户点击授权
                chrome.action.setBadgeText({ text: '!' });
                chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
                chrome.action.setTitle({ title: 'Loominary - Click to grant permissions / 点击授予权限' });
            }
        }
    } catch (e) {
        // Chrome 中无需此操作
    }
});

// 权限变更时清除 badge
chrome.permissions.onAdded?.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Open Loominary' });
});
