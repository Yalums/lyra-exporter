// ==UserScript==
// @name         Claude UUID跳转工具（优化版）
// @namespace    userscript://claude-conversation-jumper
// @version      1.3
// @description  获取对话UUID并跳转到API页面，支持树形模式切换，UI更友好！
// @match        https://claude.ai/*
// @match        https://claude.ai/*
// @match        https://*.claude.ai/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 存储捕获到的用户ID
    let capturedUserId = '';

    // 拦截XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        const organizationsMatch = url.match(/api\/organizations\/([a-zA-Z0-9-]+)/);
        if (organizationsMatch && organizationsMatch[1]) {
            capturedUserId = organizationsMatch[1];
            console.log("✨ 已捕获用户ID:", capturedUserId);
        }
        return originalXHROpen.apply(this, arguments);
    };

    // 拦截fetch请求
    const originalFetch = window.fetch;
    window.fetch = function(resource, options) {
        if (typeof resource === 'string') {
            const organizationsMatch = resource.match(/api\/organizations\/([a-zA-Z0-9-]+)/);
            if (organizationsMatch && organizationsMatch[1]) {
                capturedUserId = organizationsMatch[1];
                console.log("✨ 已捕获用户ID:", capturedUserId);
            }
        }
        return originalFetch.apply(this, arguments);
    };

    const BUTTON_ID = "easychat-jump-button";
    const SWITCH_ID = "easychat-tree-mode";

    function injectCustomStyle() {
        const style = document.createElement('style');
        style.textContent = `
          .easychat-control-container {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-left: 5px;
          }
          #${BUTTON_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 5px 8px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            background-color: rgba(77, 171, 154, 0.1);
            color: #4DAB9A;
            border: 1px solid rgba(77, 171, 154, 0.2);
            transition: all 0.3s;
          }
          #${BUTTON_ID}:hover {
            background-color: rgba(77, 171, 154, 0.2);
          }
          .easychat-toggle {
            display: flex;
            align-items: center;
            font-size: 12px;
            margin-right: 5px;
          }
          .easychat-switch {
            position: relative;
            display: inline-block;
            width: 30px;
            height: 16px;
            margin: 0 5px;
          }
          .easychat-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .easychat-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
          }
          .easychat-slider:before {
            position: absolute;
            content: "";
            height: 12px;
            width: 12px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
          }
          input:checked + .easychat-slider {
            background-color: #4DAB9A;
          }
          input:checked + .easychat-slider:before {
            transform: translateX(14px);
          }
          #uuid-toast {
            position: fixed;
            bottom: 60px;
            right: 20px;
            background-color: #323232;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            z-index: 1000000;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            font-size: 13px;
          }
        `;
        document.head.appendChild(style);
    }

    function showToast(message) {
        let toast = document.getElementById("uuid-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "uuid-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = "1";
        setTimeout(() => {
            toast.style.opacity = "0";
        }, 2000);
    }

    function getCurrentChatUUID() {
        const url = window.location.href;
        const match = url.match(/\/chat\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    }

    function checkUrlForTreeMode() {
        return window.location.href.includes('?tree=True&rendering_mode=messages&render_all_tools=true') ||
               window.location.href.includes('&tree=True&rendering_mode=messages&render_all_tools=true');
    }

    function createUUIDControls() {
        // 如果按钮已存在，则不再创建
        if (document.getElementById(BUTTON_ID)) return;

        // 创建容器元素
        const controlContainer = document.createElement('div');
        controlContainer.className = 'easychat-control-container';

        // 创建模式切换开关
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'easychat-toggle';
        toggleContainer.innerHTML = `
          <span>树形</span>
          <label class="easychat-switch">
            <input type="checkbox" id="${SWITCH_ID}" ${checkUrlForTreeMode() ? 'checked' : ''}>
            <span class="easychat-slider"></span>
          </label>
        `;

        // 创建按钮
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
            <path d="M128,128a32,32,0,1,0,32,32A32,32,0,0,0,128,128Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,128,176ZM128,80a32,32,0,1,0-32-32A32,32,0,0,0,128,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,128,32Zm64,112a32,32,0,1,0,32,32A32,32,0,0,0,192,144Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,192,192Zm0-64a32,32,0,1,0-32-32A32,32,0,0,0,192,128Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,192,80ZM64,144a32,32,0,1,0,32,32A32,32,0,0,0,64,144Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,64,192Zm0-64a32,32,0,1,0-32-32A32,32,0,0,0,64,128Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,64,80Z"/>
          </svg>
          <span style="margin-left: 5px;">获取UUID</span>
        `;

        // 处理按钮点击事件
        button.addEventListener('click', () => {
            const uuid = getCurrentChatUUID();
            if (uuid) {
                if (!capturedUserId) {
                    showToast("未能捕获用户ID，请刷新页面或进行一些操作");
                    return;
                }

                navigator.clipboard.writeText(uuid).then(() => {
                    console.log("UUID 已复制:", uuid);
                    showToast("UUID已复制！");
                }).catch(err => {
                    console.error("复制失败:", err);
                    showToast("复制失败");
                });

                const treeMode = document.getElementById(SWITCH_ID).checked;
                const jumpUrl = `https://claude.ai/api/organizations/${capturedUserId}/chat_conversations/${uuid}${treeMode ? '?tree=True&rendering_mode=messages&render_all_tools=true' : ''}`;
                window.open(jumpUrl, "_blank");
            } else {
                showToast("未找到UUID！");
            }
        });

        // 将开关和按钮添加到容器
        controlContainer.appendChild(toggleContainer);
        controlContainer.appendChild(button);

        // 尝试找到工具栏并添加自定义控件
        function injectToToolbar() {
            // 尝试找到工具栏元素
            const toolbarContainer = document.querySelector('.relative.flex-1.flex.items-center.gap-2.shrink.min-w-0');
            if (toolbarContainer) {
                // 创建一个与其他工具按钮兼容的容器
                const wrapper = document.createElement('div');
                wrapper.className = 'flex shrink-0';
                wrapper.appendChild(controlContainer);

                // 添加到工具栏
                toolbarContainer.appendChild(wrapper);
                return true;
            }
            return false;
        }

        // 如果找不到工具栏，则作为浮动按钮添加
        if (!injectToToolbar()) {
            controlContainer.style.position = 'fixed';
            controlContainer.style.bottom = '20px';
            controlContainer.style.right = '20px';
            controlContainer.style.zIndex = '999999';
            controlContainer.style.backgroundColor = 'white';
            controlContainer.style.padding = '5px 10px';
            controlContainer.style.borderRadius = '8px';
            controlContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            document.body.appendChild(controlContainer);
        }
    }

    // 初始化脚本
    function initScript() {
        injectCustomStyle();
        if (/\/chat\/[a-zA-Z0-9-]+/.test(location.href)) {
            createUUIDControls();
        }

        // 监听 URL 变化（防止 SPA 页面跳转失效）
        let lastUrl = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (/\/chat\/[a-zA-Z0-9-]+/.test(lastUrl)) {
                    // 当URL变化后，尝试找到工具栏并插入按钮
                    setTimeout(createUUIDControls, 500); // 给页面一点时间加载UI
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }
})();
