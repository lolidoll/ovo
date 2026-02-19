/**
 * 移动端性能优化模块
 * 解决手机端浏览器点击按钮没反应、加载慢、页面切换不流畅等问题
 * 
 * @module MobilePerformanceOptimizer
 * @version 1.0.0
 */

(function() {
    'use strict';

    console.log('🚀 移动端性能优化模块加载');

    // ========== 检测移动设备 ==========
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isSafari = /Safari/i.test(navigator.userAgent) && /Apple Computer/i.test(navigator.vendor);

    if (!isMobile) {
        console.log('⏭️ 非移动设备，跳过移动端优化');
        return;
    }

    console.log(`📱 移动设备检测: iOS=${isIOS}, Android=${isAndroid}, Safari=${isSafari}`);

    // ========== 防抖函数 ==========
    function debounce(func, delay = 150) {
        let timer = null;
        return function debounced(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ========== 节流函数 ==========
    function throttle(func, interval = 100) {
        let lastTime = 0;
        let timer = null;
        return function throttled(...args) {
            const now = Date.now();
            const remaining = interval - (now - lastTime);
            
            if (remaining <= 0) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                lastTime = now;
                func.apply(this, args);
            } else if (!timer) {
                timer = setTimeout(() => {
                    lastTime = Date.now();
                    timer = null;
                    func.apply(this, args);
                }, remaining);
            }
        };
    }

    // ========== 触摸事件优化类 ==========
    class TouchOptimizer {
        constructor() {
            this.touchStartTime = 0;
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.hasMoved = false;
            this.activeElements = new WeakSet();
            this.setupStyles();
        }

        setupStyles() {
            // 注入优化样式
            const style = document.createElement('style');
            style.id = 'mobile-performance-styles';
            style.textContent = `
                /* 移除点击高亮延迟 */
                * {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                }

                /* 可点击元素优化 */
                .clickable-optimized {
                    touch-action: manipulation;
                    -webkit-user-select: none;
                    user-select: none;
                    cursor: pointer;
                    will-change: transform, opacity;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }

                /* 点击反馈动画 */
                .clickable-optimized:active {
                    opacity: 0.7;
                    transform: translateZ(0) scale(0.98);
                    transition: transform 0.1s ease, opacity 0.1s ease;
                }

                /* 底部标签栏优化 */
                .tab-item {
                    touch-action: manipulation;
                    will-change: opacity;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    position: relative;
                    isolation: isolate;
                }

                .tab-item:active {
                    opacity: 0.6;
                    transform: translateZ(0) scale(0.95);
                    transition: opacity 0.1s ease, transform 0.1s ease;
                }

                .tab-item.active {
                    opacity: 1;
                }

                /* 页面切换优化 */
                .main-content {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    contain: layout style paint;
                }

                .main-content.active {
                    display: flex;
                    animation: fadeIn 0.15s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateZ(0) scale(0.99); }
                    to { opacity: 1; transform: translateZ(0) scale(1); }
                }

                /* 按钮优化 */
                button, .btn, [role="button"] {
                    touch-action: manipulation;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    will-change: transform;
                }

                button:active, .btn:active, [role="button"]:active {
                    transform: translateZ(0) scale(0.97);
                    transition: transform 0.05s ease;
                }

                /* 侧边栏优化 - 不覆盖原始滑入滑出动画 */
                .side-menu {
                    will-change: transform;
                    backface-visibility: hidden;
                }

                /* 遮罩层优化 */
                .mask {
                    transform: translateZ(0);
                    will-change: opacity;
                    backface-visibility: hidden;
                }

                /* 输入框优化 */
                input, textarea, [contenteditable="true"] {
                    touch-action: manipulation;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }

                /* 弹窗优化 */
                .add-popup, .sub-page {
                    transform: translateZ(0);
                    will-change: transform, opacity;
                    backface-visibility: hidden;
                }

                /* 列表滚动优化 */
                .msg-list, .friend-list, .chat-messages {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    transform: translateZ(0);
                    will-change: scroll-position;
                    contain: layout style paint;
                }

                /* 卡片项优化 */
                .msg-item, .friend-item, .chat-bubble {
                    will-change: transform;
                    transform: translateZ(0);
                    contain: layout style;
                }

                /* 防止过度滚动 */
                body, html {
                    overscroll-behavior: none;
                }

                /* 性能关键类 */
                .gpu-accelerated {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }

                /* 减少重排重绘 */
                .contain-layout {
                    contain: layout;
                }

                .contain-style {
                    contain: style;
                }

                .contain-paint {
                    contain: paint;
                }

                .contain-all {
                    contain: layout style paint;
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * 为元素添加优化的点击处理
         * @param {HTMLElement} element - 目标元素
         * @param {Function} handler - 点击处理函数
         * @param {Object} options - 配置选项
         */
        addOptimizedClick(element, handler, options = {}) {
            if (!element) return;

            const {
                debounceDelay = 0,
                throttleDelay = 0,
                preventDefault = true
            } = options;

            // 添加优化类
            element.classList.add('clickable-optimized');
            this.activeElements.add(element);

            let clickHandler = handler;

            // 应用防抖
            if (debounceDelay > 0) {
                clickHandler = debounce(clickHandler, debounceDelay);
            }

            // 应用节流
            if (throttleDelay > 0) {
                clickHandler = throttle(clickHandler, throttleDelay);
            }

            // 移除可能存在的旧事件监听
            element.removeEventListener('click', handler);

            // 添加优化后的点击监听
            element.addEventListener('click', function(e) {
                if (preventDefault) {
                    e.preventDefault();
                }
                clickHandler.call(this, e);
            }, { passive: !preventDefault });

            // iOS Safari 特殊处理
            if (isIOS) {
                element.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    clickHandler.call(this, e);
                }, { passive: false });
            }
        }

        /**
         * 批量为选择器匹配的元素添加优化点击
         * @param {string} selector - CSS选择器
         * @param {Function} handler - 点击处理函数
         * @param {Object} options - 配置选项
         */
        optimizeSelector(selector, handler, options = {}) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => this.addOptimizedClick(el, handler, options));
            return elements;
        }
    }

    // ========== 页面切换优化器 ==========
    class PageSwitchOptimizer {
        constructor() {
            this.isSwitching = false;
            this.switchQueue = [];
            this.lastSwitchTime = 0;
            this.minSwitchInterval = 100; // 最小切换间隔
        }

        /**
         * 优化的页面切换函数
         * @param {string} tabId - 目标标签ID
         * @param {Function} originalSwitchFn - 原始切换函数
         */
        optimizedSwitch(tabId, originalSwitchFn) {
            const now = Date.now();
            const timeSinceLastSwitch = now - this.lastSwitchTime;

            // 防止过快切换
            if (this.isSwitching || timeSinceLastSwitch < this.minSwitchInterval) {
                if (!this.isSwitching) {
                    this.switchQueue.push({ tabId, originalSwitchFn });
                    this.processQueue();
                }
                return;
            }

            this.isSwitching = true;
            this.lastSwitchTime = now;

            // 使用 requestAnimationFrame 优化切换
            requestAnimationFrame(() => {
                try {
                    originalSwitchFn(tabId);
                } catch (e) {
                    console.error('页面切换错误:', e);
                }

                setTimeout(() => {
                    this.isSwitching = false;
                    this.processQueue();
                }, 50);
            });
        }

        processQueue() {
            if (this.switchQueue.length > 0 && !this.isSwitching) {
                const { tabId, originalSwitchFn } = this.switchQueue.shift();
                this.optimizedSwitch(tabId, originalSwitchFn);
            }
        }
    }

    // ========== 滚动性能优化器 ==========
    class ScrollOptimizer {
        constructor() {
            this.scrollHandlers = new Map();
            this.init();
        }

        init() {
            // 优化所有滚动容器
            this.optimizeScrollContainers();
        }

        optimizeScrollContainers() {
            const selectors = [
                '.msg-list',
                '.friend-list',
                '.chat-messages',
                '.menu-list',
                '.moments-list',
                '.shopping-list'
            ];

            selectors.forEach(selector => {
                const containers = document.querySelectorAll(selector);
                containers.forEach(container => {
                    // 添加被动事件监听
                    container.addEventListener('scroll', throttle(() => {
                        this.handleScroll(container);
                    }, 50), { passive: true });
                });
            });
        }

        handleScroll(container) {
            // 滚动处理逻辑（如果有需要）
        }
    }

    // ========== 全局初始化 ==========
    const touchOptimizer = new TouchOptimizer();
    const pageSwitchOptimizer = new PageSwitchOptimizer();
    const scrollOptimizer = new ScrollOptimizer();

    // ========== Monkey Patch 原始 switchTab 函数 ==========
    function patchSwitchTab() {
        // 等待原始函数加载
        const checkInterval = setInterval(() => {
            if (typeof window.switchTab === 'function' || 
                (window.AppState && typeof window.switchTab === 'undefined')) {
                clearInterval(checkInterval);
                
                // 尝试从全局作用域获取原始函数
                setTimeout(() => {
                    // 查找原始switchTab函数
                    const scripts = document.querySelectorAll('script:not([src])');
                    scripts.forEach(script => {
                        // 原始函数会在app.js中定义，我们通过重写事件监听来优化
                    });
                    
                    // 直接优化底部标签栏
                    optimizeTabBar();
                }, 100);
            }
        }, 100);

        setTimeout(() => clearInterval(checkInterval), 5000);
    }

    // ========== 优化底部标签栏 ==========
    function optimizeTabBar() {
        console.log('🔧 优化底部标签栏点击...');

        const tabItems = document.querySelectorAll('.tab-item');
        
        tabItems.forEach(tab => {
            const tabId = tab.dataset.tab;
            if (!tabId) return;

            // 移除原始事件监听（通过克隆节点）
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            // 添加优化后的点击处理
            newTab.addEventListener('click', function(e) {
                e.preventDefault();
                
                const now = Date.now();
                if (newTab._lastClick && now - newTab._lastClick < 150) {
                    return; // 防止重复点击
                }
                newTab._lastClick = now;

                // 震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }

                // 添加视觉反馈
                newTab.style.transform = 'translateZ(0) scale(0.95)';
                newTab.style.opacity = '0.7';
                
                setTimeout(() => {
                    newTab.style.transform = '';
                    newTab.style.opacity = '';
                }, 100);

                // 调用原始switchTab函数
                if (typeof window.switchTab === 'function') {
                    window.switchTab(tabId);
                } else if (window.AppState) {
                    // 从AppState获取函数
                    const event = new CustomEvent('tabchange', { detail: { tabId } });
                    document.dispatchEvent(event);
                }
            }, { passive: false });

            // 触摸结束额外处理（iOS）
            if (isIOS) {
                newTab.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    newTab.click();
                }, { passive: false });
            }
        });

        console.log(`✅ 已优化 ${tabItems.length} 个底部标签`);
    }

    // ========== 优化所有按钮 ==========
    function optimizeButtons() {
        console.log('🔧 优化所有按钮...');

        const buttonSelectors = [
            'button',
            '.btn',
            '[role="button"]',
            '.back-btn',
            '.func-item',
            '.menu-item',
            '.add-btn',
            '.msg-item',
            '.friend-item'
        ];

        const totalButtons = [];
        
        buttonSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(btn => {
                if (!touchOptimizer.activeElements.has(btn)) {
                    btn.classList.add('clickable-optimized');
                    totalButtons.push(btn);
                }
            });
        });

        console.log(`✅ 已优化 ${totalButtons.length} 个按钮`);
    }

    // ========== 优化搜索输入 ==========
    function optimizeSearchInputs() {
        console.log('🔧 优化搜索输入...');

        const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
        
        searchInputs.forEach(input => {
            // 添加防抖
            let debounceTimer;
            const originalHandler = input.oninput;
            
            input.addEventListener('input', function(e) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (originalHandler) {
                        originalHandler.call(input, e);
                    }
                }, 150);
            }, { passive: true });
        });

        console.log(`✅ 已优化 ${searchInputs.length} 个搜索输入框`);
    }

    // ========== 添加性能监控 ==========
    function setupPerformanceMonitoring() {
        if (!window.performance) return;

        // 监控页面加载性能
        window.addEventListener('load', function() {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                
                console.log(`📊 页面性能: 加载=${pageLoadTime}ms, DOM就绪=${domReadyTime}ms`);
            }, 0);
        });

        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn(`⚠️ 检测到长任务: ${entry.duration}ms`);
                        }
                    }
                });
                observer.observe({ entryTypes: ['measure', 'longtask'] });
            } catch (e) {
                // PerformanceObserver 不支持 longtask
            }
        }
    }

    // ========== DOM变化监听 ==========
    function observeDOMChanges() {
        // 监听DOM变化，为新元素添加优化
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // 为新添加的按钮添加优化
                            if (node.matches && node.matches('button, .btn, [role="button"]')) {
                                node.classList.add('clickable-optimized');
                            }
                            // 检查子元素
                            const buttons = node.querySelectorAll ? 
                                node.querySelectorAll('button, .btn, [role="button"]') : [];
                            buttons.forEach(btn => btn.classList.add('clickable-optimized'));
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ DOM变化监听已启动');
    }

    // ========== 导出API ==========
    window.MobilePerformanceOptimizer = {
        touchOptimizer,
        pageSwitchOptimizer,
        scrollOptimizer,
        
        // 快速优化方法
        optimizeTabBar,
        optimizeButtons,
        optimizeSearchInputs,
        
        // 工具函数
        debounce,
        throttle,
        
        // 版本
        version: '1.0.0'
    };

    // ========== 初始化 ==========
    function init() {
        console.log('🚀 初始化移动端性能优化...');
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // 执行优化
        patchSwitchTab();
        optimizeTabBar();
        optimizeButtons();
        optimizeSearchInputs();
        setupPerformanceMonitoring();
        observeDOMChanges();

        // 延迟优化（等待动态内容加载）
        setTimeout(() => {
            optimizeButtons();
            optimizeSearchInputs();
        }, 1000);

        console.log('✅ 移动端性能优化完成');
    }

    // 启动
    init();

})();
