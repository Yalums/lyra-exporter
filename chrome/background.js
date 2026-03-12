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

    try {
        const fetchOptions = {
            method,
            headers,
            credentials: 'include'
        };

        if (body) {
            fetchOptions.body = body;
        }

        const response = await fetch(url, fetchOptions);

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
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Loominary Extension] Installed successfully');
    } else if (details.reason === 'update') {
        console.log('[Loominary Extension] Updated to version', chrome.runtime.getManifest().version);
    }
});
