// ==UserScript==
// @name         通用网页墨水屏优化脚本 - 翻页与全屏按钮
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  为所有网页添加墨水屏优化的翻页按钮和全屏功能，提供高对比度显示和平滑滚动体验
// @author       墨水屏通用优化版
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('通用网页墨水屏优化脚本已启动');

    // 排除的网站列表（这些网站可能有冲突）
    const EXCLUDED_DOMAINS = [
        'youtube.com',
        'netflix.com',
        'twitch.tv',
        'video.qq.com',
        'bilibili.com'
    ];

    // 检查是否应该在当前网站运行
    function shouldRunOnCurrentSite() {
        const hostname = window.location.hostname.toLowerCase();
        return !EXCLUDED_DOMAINS.some(domain => hostname.includes(domain));
    }

    // 如果在排除列表中，则不运行脚本
    if (!shouldRunOnCurrentSite()) {
        console.log('当前网站在排除列表中，脚本不运行');
        return;
    }

    // 墨水屏优化样式 - 使用更强的CSS选择器
    GM_addStyle(`
        /* 墨水屏优化：强制高对比度文字 - 覆盖所有可能的选择器 */
        html *, html *:before, html *:after,
        body, body *, p, p *, div, div *, span, span *, 
        article, article *, section, section *, main, main *,
        .content, .content *, .post, .post *, .article, .article *, 
        .text, .text *, .markdown, .markdown *,
        [role="main"], [role="main"] *, [role="article"], [role="article"] *,
        /* 特殊类名 */
        .threadlist_title, .threadlist_title *, .threadlist_abs, .threadlist_abs *,
        .d_post_content, .d_post_content *, .post_content, .post_content *,
        .p_content, .p_content *, .d_post_content_main, .d_post_content_main *,
        .threadlist_rep_num, .threadlist_rep_num *, .frs-content, .frs-content *,
        /* 其他常见网站类名 */
        .entry-content, .entry-content *, .post-content, .post-content *,
        .comment, .comment *, .reply, .reply *, .message, .message *,
        .forum-post, .forum-post *, .topic-content, .topic-content * {
            font-weight: 700 !important;
            color: #000000 !important;
            text-shadow: none !important;
        }
        
        /* 强制标题显示 */
        h1, h1 *, h2, h2 *, h3, h3 *, h4, h4 *, h5, h5 *, h6, h6 *,
        .title, .title *, .subject, .subject *, .threadlist_title, .threadlist_title * {
            font-weight: 800 !important;
            color: #000000 !important;
            text-shadow: none !important;
        }
        
        /* 强制链接显示 */
        a, a *, a:link, a:visited, a:hover, a:active {
            color: #0000CC !important;
            text-decoration: underline !important;
            font-weight: 600 !important;
        }
        
        /* 优化代码块显示 */
        pre, pre *, code, code *, .code, .code *, .highlight, .highlight * {
            background-color: #f5f5f5 !important;
            color: #000000 !important;
            border: 1px solid #cccccc !important;
            font-weight: 600 !important;
        }
        
        /* 优化按钮对比度 */
        button, button *, .button, .button *, .btn, .btn * {
            border: 2px solid #666666 !important;
            font-weight: 700 !important;
            color: #000000 !important;
        }
        
        /* 优化表格显示 */
        table, table *, td, td *, th, th * {
            border: 1px solid #666666 !important;
            color: #000000 !important;
            font-weight: 600 !important;
        }
        
        /* 优化输入框显示 */
        input, input *, textarea, textarea *, select, select * {
            border: 2px solid #666666 !important;
            color: #000000 !important;
            background-color: #ffffff !important;
            font-weight: 600 !important;
        }
        
        /* 特殊处理：强制覆盖内联样式 */
        [style*="color"] {
            color: #000000 !important;
        }
        
        /* 隐藏可能干扰的动画和过渡效果 */
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-delay: -0.01ms !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0.01ms !important;
        }
        
        /* 特殊优化 */
        .threadlist_lz, .threadlist_lz * {
            font-weight: 700 !important;
            color: #000000 !important;
        }
    `);

    // 按钮配置
    const BUTTON_CONFIG = {
        HEIGHT: '54px',
        WIDTH: '54px',
        GAP: '12px',
        FONT_SIZE: '26px',
        BORDER_RADIUS: '6px',
        EDGE_OFFSET: '12px'
    };

    // 全局变量
    let buttons = {
        pageUp: null,
        pageDown: null,
        fullscreen: null,
        togglePosition: null,
        toTop: null,
        debug: null
    };
    let isFullscreenListenerAttached = false;
    let isButtonsOnLeft = true;

    // 从localStorage读取按钮位置偏好
    try {
        const savedPosition = localStorage.getItem('universal-eink-buttons-position');
        if (savedPosition !== null) {
            isButtonsOnLeft = savedPosition === 'left';
        }
    } catch (e) {
        console.error('读取按钮位置偏好失败:', e);
    }

    // 通用滚动容器查找 - 增强版
    function getScrollableElement() {
        console.log('开始查找滚动容器...');
        
        // 网站特定的滚动容器选择器
        const siteSpecificSelectors = {
            'tieba.baidu.com': [
                '.frs-content',
                '.threadlist_bright',
                '.threadlist_lz',
                '.thread_list_bottom',
                '.tbui_frs_list',
                '#frs-list-pager'
            ],
            'zhihu.com': [
                '.List-item',
                '.ContentItem',
                '.Card'
            ],
            'reddit.com': [
                '.Post',
                '[data-testid="post-container"]'
            ]
        };

        // 通用滚动容器选择器 - 扩展版
        const commonSelectors = [
            // 最常见的主要内容区域
            '[role="main"]',
            'main',
            '.main',
            '.content', 
            '.container',
            '.wrapper',
            '.page',
            '.article',
            '.post',
            '#content',
            '#main',
            '.main-content',
            '.page-content',
            '.site-content',
            // 滚动相关类名
            '.overflow-y-auto',
            '.overflow-y-scroll',
            '.overflow-auto',
            '.scroll',
            '.scrollable',
            // 百度系列网站
            '.result-op',
            '.frs-content',
            '.threadlist_bright',
            // 其他常见类名
            '.list',
            '.feed',
            '.timeline',
            '.posts',
            '.comments'
        ];

        // 获取当前域名的特定选择器
        const hostname = window.location.hostname;
        const specificSelectors = siteSpecificSelectors[hostname] || [];
        
        // 组合所有选择器，优先使用网站特定的
        const allSelectors = [...specificSelectors, ...commonSelectors];

        // 首先尝试找到最佳的滚动容器
        for (const selector of allSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && 
                        element.scrollHeight > element.clientHeight && 
                        element.clientHeight > 100) { // 降低最小高度要求
                        console.log('找到滚动容器:', selector, element);
                        return element;
                    }
                }
            } catch (e) {
                console.warn('选择器查询失败:', selector, e);
            }
        }

        // 智能查找：遍历所有元素找最大的可滚动区域
        console.log('使用智能查找...');
        const allElements = document.querySelectorAll('*');
        let bestCandidate = null;
        let maxScrollableArea = 0;
        let candidates = [];

        for (const element of allElements) {
            try {
                const style = window.getComputedStyle(element);
                const overflowY = style.overflowY;
                const rect = element.getBoundingClientRect();
                
                // 检查是否可滚动
                if ((overflowY === 'auto' || overflowY === 'scroll' || 
                     element.scrollHeight > element.clientHeight) &&
                    element.clientHeight > 50 && // 最小高度
                    rect.width > 200) { // 最小宽度
                    
                    const scrollableArea = element.clientWidth * element.clientHeight;
                    candidates.push({
                        element: element,
                        area: scrollableArea,
                        selector: element.className || element.tagName,
                        scrollHeight: element.scrollHeight,
                        clientHeight: element.clientHeight
                    });
                    
                    if (scrollableArea > maxScrollableArea) {
                        maxScrollableArea = scrollableArea;
                        bestCandidate = element;
                    }
                }
            } catch (e) {
                // 忽略错误，继续查找
            }
        }

        if (candidates.length > 0) {
            console.log('找到的滚动候选:', candidates);
            if (bestCandidate) {
                console.log('选择最佳滚动候选:', bestCandidate);
                return bestCandidate;
            }
        }

        // 强制检查window滚动
        console.log('检查window滚动能力...');
        if (window.innerHeight && 
            (document.documentElement.scrollHeight > window.innerHeight ||
             document.body.scrollHeight > window.innerHeight)) {
            console.log('使用window滚动 via documentElement');
            return document.documentElement;
        }

        // 最后的回退
        console.log('使用最后回退：document.documentElement');
        return document.documentElement || document.body || window;
    }

    // 通用header查找
    function getHeaderElement() {
        const headerSelectors = [
            'header',
            '.header',
            '#header',
            '[role="banner"]',
            '.top-bar',
            '.navbar',
            '.nav-bar',
            '.navigation',
            '.site-header',
            '.page-header',
            '.main-header'
        ];

        for (const selector of headerSelectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetHeight > 0) {
                return element;
            }
        }
        return null;
    }

    // 全屏功能
    function handleFullscreenChange() {
        const headerElement = getHeaderElement();
        if (!headerElement) return;

        const isCurrentlyFullscreen = !!(document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement);

        if (isCurrentlyFullscreen) {
            if (!headerElement.dataset.originalDisplay) {
                headerElement.dataset.originalDisplay = window.getComputedStyle(headerElement).display;
            }
            headerElement.style.display = 'none';
        } else {
            const originalDisplay = headerElement.dataset.originalDisplay || '';
            if (originalDisplay) {
                headerElement.style.display = originalDisplay;
            } else {
                headerElement.style.display = '';
            }
        }
    }

    function toggleFullScreen() {
        const docEl = document.documentElement;
        const isFullscreen = !!(document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement);

        if (!isFullscreen) {
            const requestFullscreen = docEl.requestFullscreen || 
                docEl.webkitRequestFullscreen || 
                docEl.mozRequestFullScreen || 
                docEl.msRequestFullscreen;
            
            if (requestFullscreen) {
                requestFullscreen.call(docEl).catch(err => {
                    console.error(`进入全屏模式失败: ${err.message}`);
                });
            } else {
                console.warn('此浏览器不支持全屏API');
            }
        } else {
            const exitFullscreen = document.exitFullscreen || 
                document.webkitExitFullscreen || 
                document.mozCancelFullScreen || 
                document.msExitFullscreen;
            
            if (exitFullscreen) {
                exitFullscreen.call(document).catch(err => {
                    console.error(`退出全屏模式失败: ${err.message}`);
                });
            }
        }
    }

    // 回到顶部功能
    function scrollToTop() {
        const scrollElement = getScrollableElement();
        if (scrollElement) {
            smoothScroll(scrollElement, 0);
        }
    }

    // 创建按钮的通用样式
    function applyCommonButtonStyles(button, icon, title) {
        button.innerHTML = icon;
        button.style.cssText = `
            position: fixed;
            width: ${BUTTON_CONFIG.WIDTH};
            height: ${BUTTON_CONFIG.HEIGHT};
            background-color: #E9E9E9;
            color: #000000;
            border: 2px solid #ABABAB;
            border-radius: ${BUTTON_CONFIG.BORDER_RADIUS};
            font-size: ${BUTTON_CONFIG.FONT_SIZE};
            font-weight: bold;
            cursor: pointer;
            z-index: 2147483647;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            ${isButtonsOnLeft ? 'left: ' + BUTTON_CONFIG.EDGE_OFFSET : 'right: ' + BUTTON_CONFIG.EDGE_OFFSET};
        `;

        button.setAttribute('title', title);
        button.setAttribute('tabindex', '-1');
        button.setAttribute('data-universal-eink-button', 'true');

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.borderColor = '#333333';
            button.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
            button.style.backgroundColor = '#D9D9D9';
        });

        button.addEventListener('mouseleave', () => {
            button.style.borderColor = '#ABABAB';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            button.style.backgroundColor = '#E9E9E9';
        });

        // 点击效果
        button.addEventListener('mousedown', () => {
            button.style.backgroundColor = '#CCCCCC';
            button.style.transform = 'scale(0.95)';
        });

        button.addEventListener('mouseup', () => {
            button.style.backgroundColor = '#D9D9D9';
            button.style.transform = 'scale(1)';
        });
    }

    // 切换按钮位置
    function toggleButtonPosition() {
        isButtonsOnLeft = !isButtonsOnLeft;

        try {
            localStorage.setItem('universal-eink-buttons-position', isButtonsOnLeft ? 'left' : 'right');
        } catch (e) {
            console.error('保存按钮位置偏好失败:', e);
        }

        removeExistingButtons();
        createScrollButtons();
    }

    // 平滑滚动函数 - 增强版
    function smoothScroll(element, targetScrollTop) {
        console.log('开始平滑滚动:', {element, targetScrollTop});
        
        // 如果是document.documentElement或document.body，使用window.scrollTo
        if (element === document.documentElement || element === document.body) {
            console.log('使用window.scrollTo进行平滑滚动');
            try {
                window.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
                return;
            } catch (e) {
                console.log('window.scrollTo失败，尝试手动滚动:', e);
                window.scrollTo(0, targetScrollTop);
                return;
            }
        }
        
        // 对于其他元素，使用自定义动画
        const startScrollTop = element.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        
        // 如果距离很小，直接设置
        if (Math.abs(distance) < 10) {
            element.scrollTop = targetScrollTop;
            return;
        }
        
        const duration = Math.min(400, Math.abs(distance) / 2); // 根据距离调整时间
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // 使用easeInOutCubic缓动函数
            const ease = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            const newScrollTop = startScrollTop + distance * ease;
            
            try {
                element.scrollTop = newScrollTop;
            } catch (e) {
                console.log('滚动设置失败:', e);
                // 回退到window滚动
                window.scrollTo(0, newScrollTop);
            }

            if (timeElapsed < duration && progress < 1) {
                requestAnimationFrame(animation);
            } else {
                // 确保最终位置正确
                try {
                    element.scrollTop = targetScrollTop;
                } catch (e) {
                    window.scrollTo(0, targetScrollTop);
                }
                console.log('滚动完成，最终位置:', element.scrollTop);
            }
        }

        requestAnimationFrame(animation);
    }

    // 创建所有按钮
    function createScrollButtons() {
        if (Object.values(buttons).some(btn => btn !== null)) {
            console.log('按钮已存在，跳过创建');
            return;
        }

        console.log('创建通用翻页按钮...');

        // 向下翻页按钮 - 使用简化有效方法
        buttons.pageDown = document.createElement('button');
        applyCommonButtonStyles(buttons.pageDown, '↓', '向下翻页 (Page Down / Space)');
        buttons.pageDown.style.top = '50%';
        buttons.pageDown.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('点击向下翻页按钮');
            
            // 使用测试版本中有效的简单方法
            try {
                const scrollAmount = window.innerHeight * 0.6;
                console.log('使用window.scrollBy向下滚动:', scrollAmount);
                window.scrollBy({
                    top: scrollAmount,
                    behavior: 'smooth'
                });
                
                // 备用方法：如果smooth不工作，用立即滚动
                setTimeout(() => {
                    const currentY = window.pageYOffset || document.documentElement.scrollTop;
                    if (currentY === (window.pageYOffset || document.documentElement.scrollTop)) {
                        console.log('smooth滚动可能失败，尝试立即滚动');
                        window.scrollBy(0, scrollAmount);
                    }
                }, 300);
                
            } catch (e) {
                console.error('scrollBy失败，尝试scrollTo:', e);
                try {
                    const currentY = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollAmount = window.innerHeight * 0.6;
                    window.scrollTo(0, currentY + scrollAmount);
                } catch (e2) {
                    console.error('所有滚动方法都失败:', e2);
                }
            }
        });

        // 向上翻页按钮 - 使用简化有效方法
        buttons.pageUp = document.createElement('button');
        applyCommonButtonStyles(buttons.pageUp, '↑', '向上翻页 (Page Up / Shift+Space)');
        buttons.pageUp.style.top = `calc(50% - ${BUTTON_CONFIG.HEIGHT} - ${BUTTON_CONFIG.GAP})`;
        buttons.pageUp.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('点击向上翻页按钮');
            
            try {
                const scrollAmount = window.innerHeight * 0.6;
                console.log('使用window.scrollBy向上滚动:', -scrollAmount);
                window.scrollBy({
                    top: -scrollAmount,
                    behavior: 'smooth'
                });
                
                // 备用方法
                setTimeout(() => {
                    const currentY = window.pageYOffset || document.documentElement.scrollTop;
                    if (currentY === (window.pageYOffset || document.documentElement.scrollTop)) {
                        console.log('smooth向上滚动可能失败，尝试立即滚动');
                        window.scrollBy(0, -scrollAmount);
                    }
                }, 300);
                
            } catch (e) {
                console.error('向上scrollBy失败，尝试scrollTo:', e);
                try {
                    const currentY = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollAmount = window.innerHeight * 0.6;
                    const targetY = Math.max(0, currentY - scrollAmount);
                    window.scrollTo(0, targetY);
                } catch (e2) {
                    console.error('所有向上滚动方法都失败:', e2);
                }
            }
        });

        // 回到顶部按钮 - 使用简化方法
        buttons.toTop = document.createElement('button');
        applyCommonButtonStyles(buttons.toTop, '⇈', '回到顶部 (Home)');
        buttons.toTop.style.top = `calc(50% - ${BUTTON_CONFIG.HEIGHT} * 2 - ${BUTTON_CONFIG.GAP} * 2)`;
        buttons.toTop.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('点击回到顶部按钮');
            try {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                // 备用方法
                setTimeout(() => {
                    if ((window.pageYOffset || document.documentElement.scrollTop) > 50) {
                        console.log('smooth回顶部可能失败，使用立即滚动');
                        window.scrollTo(0, 0);
                    }
                }, 300);
            } catch (e) {
                console.error('回顶部失败:', e);
                window.scrollTo(0, 0);
            }
        });

        // 全屏按钮
        buttons.fullscreen = document.createElement('button');
        applyCommonButtonStyles(buttons.fullscreen, '⤢', '切换全屏模式 (F11)');
        buttons.fullscreen.style.top = `calc(50% + ${BUTTON_CONFIG.HEIGHT} + ${BUTTON_CONFIG.GAP})`;
        buttons.fullscreen.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFullScreen();
        });

        // 位置切换按钮
        buttons.togglePosition = document.createElement('button');
        applyCommonButtonStyles(buttons.togglePosition, '⇄', '切换按钮位置 (左/右)');
        buttons.togglePosition.style.top = `calc(50% + ${BUTTON_CONFIG.HEIGHT} * 2 + ${BUTTON_CONFIG.GAP} * 2)`;
        buttons.togglePosition.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleButtonPosition();
        });

        // 添加按钮到页面
        const appendButtonsToBody = () => {
            if (document.body) {
                Object.values(buttons).forEach(button => {
                    if (button) document.body.appendChild(button);
                });
                console.log('通用翻页按钮已添加到页面');
            } else {
                console.error('document.body未找到，等待重试');
                setTimeout(appendButtonsToBody, 100);
            }
        };

        appendButtonsToBody();
    }

    // 移除现有按钮
    function removeExistingButtons() {
        const existingButtons = document.querySelectorAll('button[data-universal-eink-button="true"]');
        existingButtons.forEach(btn => btn.remove());
        
        // 重置按钮引用
        Object.keys(buttons).forEach(key => {
            buttons[key] = null;
        });

        console.log('已移除现有按钮');
    }

    // 键盘快捷键支持 - 使用简化有效方法
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 避免在输入框中触发
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.isContentEditable ||
                activeElement.getAttribute('contenteditable') === 'true'
            )) {
                return;
            }

            console.log('键盘快捷键触发:', e.key);

            switch (e.key) {
                case 'PageUp':
                    e.preventDefault();
                    console.log('PageUp键触发');
                    try {
                        const upAmount = window.innerHeight * 0.6;
                        window.scrollBy({ top: -upAmount, behavior: 'smooth' });
                    } catch (e) {
                        window.scrollBy(0, -window.innerHeight * 0.6);
                    }
                    break;
                    
                case 'PageDown':
                    e.preventDefault();
                    console.log('PageDown键触发');
                    try {
                        const downAmount = window.innerHeight * 0.6;
                        window.scrollBy({ top: downAmount, behavior: 'smooth' });
                    } catch (e) {
                        window.scrollBy(0, window.innerHeight * 0.6);
                    }
                    break;
                    
                case ' ': // 空格键
                    if (!e.shiftKey) {
                        e.preventDefault();
                        console.log('空格键触发（向下）');
                        try {
                            const spaceDownAmount = window.innerHeight * 0.6;
                            window.scrollBy({ top: spaceDownAmount, behavior: 'smooth' });
                        } catch (e) {
                            window.scrollBy(0, window.innerHeight * 0.6);
                        }
                    } else {
                        e.preventDefault();
                        console.log('Shift+空格键触发（向上）');
                        try {
                            const spaceUpAmount = window.innerHeight * 0.6;
                            window.scrollBy({ top: -spaceUpAmount, behavior: 'smooth' });
                        } catch (e) {
                            window.scrollBy(0, -window.innerHeight * 0.6);
                        }
                    }
                    break;
                    
                case 'Home':
                    e.preventDefault();
                    console.log('Home键触发');
                    try {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } catch (e) {
                        window.scrollTo(0, 0);
                    }
                    break;
                    
                case 'End':
                    e.preventDefault();
                    console.log('End键触发');
                    try {
                        const maxScrollEnd = document.documentElement.scrollHeight - window.innerHeight;
                        window.scrollTo({ top: maxScrollEnd, behavior: 'smooth' });
                    } catch (e) {
                        window.scrollTo(0, document.documentElement.scrollHeight);
                    }
                    break;
                    
                case 'F11':
                    e.preventDefault();
                    console.log('F11键触发');
                    toggleFullScreen();
                    break;
            }
        });
        
        console.log('键盘快捷键已设置（使用简化方法）');
    }

    // 初始化脚本
    function initializeExtension() {
        console.log('初始化通用墨水屏优化脚本...');
        
        removeExistingButtons();
        createScrollButtons();
        setupKeyboardShortcuts();

        // 添加全屏监听器（只添加一次）
        if (!isFullscreenListenerAttached) {
            const fullscreenEvents = [
                'fullscreenchange', 
                'webkitfullscreenchange',
                'mozfullscreenchange', 
                'MSFullscreenChange'
            ];
            
            fullscreenEvents.forEach(event => {
                document.addEventListener(event, handleFullscreenChange, false);
            });
            
            isFullscreenListenerAttached = true;
            console.log('全屏监听器已添加');
        }
    }

    // 防抖初始化 - 针对不同网站调整延迟
    let initTimer = null;
    function scheduleInitialization() {
        clearTimeout(initTimer);
        
        // 根据网站调整延迟时间
        const hostname = window.location.hostname;
        let delay = 1000; // 默认延迟
        
        if (hostname.includes('baidu.com')) {
            delay = 2000; // 百度系网站需要更长时间
        } else if (hostname.includes('zhihu.com') || hostname.includes('reddit.com')) {
            delay = 1500; // 其他复杂SPA网站
        }
        
        console.log(`为 ${hostname} 设置 ${delay}ms 初始化延迟`);
        initTimer = setTimeout(initializeExtension, delay);
    }

    // 监听页面变化（适用于SPA应用）
    function observePageChanges() {
        let lastUrl = location.href;
        
        const observer = new MutationObserver(() => {
            // 检查URL变化
            if (location.href !== lastUrl) {
                console.log('页面URL变化，重新初始化');
                lastUrl = location.href;
                scheduleInitialization();
            }
        });

        const startObserver = () => {
            if (document.body) {
                observer.observe(document.body, { 
                    childList: true, 
                    subtree: true 
                });
                console.log('页面变化监听器已启动');
            } else {
                setTimeout(startObserver, 500);
            }
        };

        startObserver();
    }

    // 启动脚本
    if (document.readyState === 'complete') {
        scheduleInitialization();
    } else if (document.readyState === 'interactive') {
        setTimeout(scheduleInitialization, 500);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(scheduleInitialization, 500);
        }, { once: true });
    }

    // 监听页面变化
    observePageChanges();

    console.log('通用网页墨水屏优化脚本加载完成');

})();