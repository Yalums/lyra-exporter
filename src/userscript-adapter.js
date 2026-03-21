// Userscript Adapter Layer — replaces extension-adapter.js in GreasyFork builds
// Provides the same GM_* API surface as extension-adapter.js but uses native
// Greasemonkey/Tampermonkey/Violentmonkey APIs instead of chrome.* messaging.

if (window.self !== window.top) throw new Error('[Loominary] iframe context, skipping');

const LOOMINARY_ENV = 'userscript';
console.log('[Loominary] userscript-adapter loaded, unsafeWindow available:', typeof unsafeWindow !== 'undefined');

// ViolentMonkey with @grant declarations sandboxes the script: the default `fetch`
// becomes the extension's isolated fetch, which fails with NetworkError for
// same-origin requests because it lacks page cookies. Shadow it with the page's
// real window.fetch so all API calls are same-origin and credentials are included.
// eslint-disable-next-line no-var
var fetch = (typeof unsafeWindow !== 'undefined' && unsafeWindow.fetch)
    ? unsafeWindow.fetch.bind(unsafeWindow)
    : (typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : globalThis.fetch);

// GM_addStyle is natively available in userscript context via @grant GM_addStyle,
// but define a fallback in case it is not (e.g., @grant none mode).
if (typeof GM_addStyle === 'undefined') {
    function GM_addStyle(css) {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        return style;
    }
}

/**
 * Cross-origin fetch via native GM_xmlhttpRequest.
 * Replaces the chrome background-proxy version in extension-adapter.js.
 */
function fetchViaBackground(url, responseType) {
    return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            return reject(new Error('GM_xmlhttpRequest not available — add @grant GM_xmlhttpRequest to the userscript header'));
        }
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            responseType: responseType || 'blob',
            onload: (response) => {
                if (response.status >= 200 && response.status < 300) {
                    resolve(response.response);
                } else {
                    reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                }
            },
            onerror: (err) => reject(new Error(err.statusText || 'GM_xmlhttpRequest failed'))
        });
    });
}

/**
 * GM_xmlhttpRequest shim with the same call signature used in the codebase.
 * In a properly granted userscript context GM_xmlhttpRequest is already available
 * natively — this thin wrapper normalises the interface for the few code paths
 * that call it directly (e.g. grok.js image fetching).
 *
 * If the native API is unavailable (e.g. @grant none), falls back to fetch().
 */
if (typeof GM_xmlhttpRequest === 'undefined') {
    function GM_xmlhttpRequest(options) {
        const { method = 'GET', url, headers = {}, responseType, onload, onerror } = options;
        const fetchOptions = { method, headers, credentials: 'include' };

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
                if (onerror) onerror({ error: error.message, statusText: error.message });
            });

        return { abort: () => {} };
    }
}
