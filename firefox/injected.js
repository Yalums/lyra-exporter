// ============================================================
// Loominary - Fetch Script
// ============================================================

(function() {
    'use strict';

    function captureClaudeUserId(url) {
        const match = url.match(/\/api\/organizations\/([a-f0-9-]+)\//);
        if (match && match[1]) {
            localStorage.setItem('claudeUserId', match[1]);
            window.postMessage({
                type: 'LOOMINARY_USER_ID_CAPTURED',
                userId: match[1]
            }, '*');
        }
    }

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        if (arguments[1]) {
            captureClaudeUserId(arguments[1]);
        }
        return originalXHROpen.apply(this, arguments);
    };

    const originalFetch = window.fetch;
    window.fetch = function(resource) {
        const url = typeof resource === 'string' ? resource : (resource.url || '');
        if (url) {
            captureClaudeUserId(url);
        }
        return originalFetch.apply(this, arguments);
    };

})();
