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
