/**
 * 移动端全面适配增强系统
 * 支持安卓/iOS主流浏览器与PWA全屏模式
 */

const MobileResponsiveAdapter = {
    // 浏览器检测
    browsers: {
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        isAndroid: /Android/.test(navigator.userAgent),
        isEdge: /Edg/.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isOpera: /OPR|Opera/.test(navigator.userAgent),
        isUC: /UCBrowser/.test(navigator.userAgent),
        isVivo: /VivoBrowser|vivo/i.test(navigator.userAgent),
        isQQ: /QQBrowser/.test(navigator.userAgent),
        isWeChat: /MicroMessenger/.test(navigator.userAgent),
        isBaidu: /BaiduBrowser/.test(navigator.userAgent),
        isSamsung: /SamsungBrowser/.test(navigator.userAgent),
    },

    // 设备检测
    devices: {
        isTablet: function() {
            const ua = navigator.userAgent;
            return /iPad|Android(?!.*Mobile)/.test(ua);
        },
        isPhone: function() {
            const ua = navigator.userAgent;
            return /iPhone|Android.*Mobile|Windows Phone/.test(ua);
        },
        isSmallPhone: function() {
            return window.innerWidth <= 375;
        },
        isMediumPhone: function() {
            return window.innerWidth > 375 && window.innerWidth <= 414;
        },
        isLargePhone: function() {
            return window.innerWidth > 414 && window.innerWidth <= 480;
        },
        isLargeTablet: function() {
            return window.innerWidth > 480;
        },
    },

    // 显示模式检测
    displayModes: {
        isStandalone: function() {
            const mediaStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
            const mediaFullscreen = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
            const iosStandalone = window.navigator.standalone === true;
            return Boolean(mediaStandalone || mediaFullscreen || iosStandalone);
        },
        isFullscreen: function() {
            return Boolean(window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);
        },
        isPWA: function() {
            return this.isStandalone() || this.isFullscreen();
        },
        isBrowserMode: function() {
            return !this.isPWA();
        },
    },

    // 屏幕方向
    orientation: {
        isPortrait: function() {
            return window.matchMedia('(orientation: portrait)').matches;
        },
        isLandscape: function() {
            return window.matchMedia('(orientation: landscape)').matches;
        },
    },

    state: {
        initialized: false,
        listenersBound: false,
        viewportFramePending: false,
        baseInnerHeight: window.innerHeight || 0,
        chatResizeObserver: null,
        chatMutationObserver: null,
        editableFocusBound: false,
        displayModeListenersBound: false,
    },

    // 初始化
    init: function() {
        if (this.state.initialized) {
            return;
        }

        this.state.initialized = true;
        console.log('🚀 移动端全面适配系统初始化...');

        this.setDeviceClasses();
        this.setBrowserClasses();
        this.setDisplayModeClasses();
        this.applyAdaptationScheme();

        this.setupViewportHeight();
        this.updateChatLayoutMetrics();
        this.observeChatLayout();
        this.setupEventListeners();
        this.fixCommonIssues();

        console.log('✅ 移动端适配系统初始化完成');
    },

    isEditableElement: function(element) {
        if (!element) return false;
        if (element.isContentEditable) return true;

        const tag = (element.tagName || '').toLowerCase();
        if (tag === 'textarea') return true;

        if (tag === 'input') {
            const blockedTypes = ['button', 'checkbox', 'radio', 'file', 'submit', 'reset', 'range', 'color', 'hidden'];
            const inputType = (element.type || 'text').toLowerCase();
            return !blockedTypes.includes(inputType);
        }

        return false;
    },

    // 统一更新视口相关变量
    updateViewportMetrics: function() {
        const root = document.documentElement;
        const body = document.body;
        const visualViewport = window.visualViewport;
        const isPWA = this.displayModes.isPWA();

        const innerHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const innerWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const visualHeight = visualViewport ? visualViewport.height : innerHeight;
        const visualTop = visualViewport ? (visualViewport.offsetTop || 0) : 0;
        const viewportWidth = Math.max(320, Math.round(innerWidth || 0));

        this.state.baseInnerHeight = Math.max(this.state.baseInnerHeight, innerHeight);

        let keyboardDelta = visualViewport
            ? Math.max(0, Math.round(innerHeight - visualHeight - visualTop))
            : Math.max(0, Math.round(this.state.baseInnerHeight - innerHeight));

        // iOS standalone often reports minor visualViewport deltas even when keyboard is closed.
        if (this.browsers.isIOS && isPWA && keyboardDelta <= 90) {
            keyboardDelta = 0;
        }

        const keyboardOpen = this.isEditableElement(document.activeElement) && keyboardDelta > 90;
        const viewportHeight = (this.browsers.isIOS && isPWA && !keyboardOpen)
            ? Math.max(320, Math.round(innerHeight || visualHeight || 0))
            : Math.max(320, Math.round(visualHeight || innerHeight || 0));

        const vh = viewportHeight * 0.01;
        root.style.setProperty('--vh', `${vh}px`);
        root.style.setProperty('--app-height', `${viewportHeight}px`);
        root.style.setProperty('--window-height', `${innerHeight}px`);
        root.style.setProperty('--screen-height', `${window.screen.height || viewportHeight}px`);
        root.style.setProperty('--viewport-width', `${viewportWidth}px`);
        root.style.setProperty('--visual-viewport-height', `${Math.round(visualHeight || innerHeight || 0)}px`);
        root.style.setProperty('--chat-viewport-height', `${viewportHeight}px`);
        root.style.setProperty('--keyboard-height', keyboardOpen ? `${keyboardDelta}px` : '0px');
        root.style.setProperty('--chat-keyboard-offset', keyboardOpen ? `${keyboardDelta}px` : '0px');

        root.classList.toggle('keyboard-open', keyboardOpen);
        if (body) {
            body.classList.toggle('keyboard-open', keyboardOpen);
        }

        const chatPage = document.getElementById('chat-page');
        if (chatPage) {
            chatPage.classList.toggle('keyboard-open', keyboardOpen);
            chatPage.style.setProperty('height', `${viewportHeight}px`, 'important');
            chatPage.style.setProperty('max-height', `${viewportHeight}px`, 'important');
        }

        if (window.__DEBUG_VIEWPORT__) {
            console.log('[Viewport]', {
                innerHeight,
                visualHeight,
                visualTop,
                keyboardDelta,
                keyboardOpen,
                viewportHeight,
            });
        }
    },

    scheduleViewportUpdate: function() {
        if (this.state.viewportFramePending) {
            return;
        }

        this.state.viewportFramePending = true;
        requestAnimationFrame(() => {
            this.state.viewportFramePending = false;
            this.setDisplayModeClasses();
            this.applyAdaptationScheme();
            this.updateViewportMetrics();
            this.updateChatLayoutMetrics();
        });
    },

    // 设置视口高度
    setupViewportHeight: function() {
        this.updateViewportMetrics();
    },

    // 更新聊天布局测量值
    updateChatLayoutMetrics: function() {
        const root = document.documentElement;

        const chatNav = document.querySelector('.chat-nav');
        const chatInputArea = document.querySelector('.chat-input-area');
        const chatToolbar = document.getElementById('chat-toolbar') || document.querySelector('.chat-toolbar');

        const navHeight = chatNav ? Math.round(chatNav.getBoundingClientRect().height) : 50;
        const inputAreaHeight = chatInputArea ? Math.round(chatInputArea.getBoundingClientRect().height) : 40;
        const toolbarHeight = chatToolbar ? Math.round(chatToolbar.getBoundingClientRect().height) : 52;

        root.style.setProperty('--chat-nav-height', `${Math.max(44, navHeight)}px`);
        root.style.setProperty('--chat-input-area-height', `${Math.max(36, inputAreaHeight)}px`);
        root.style.setProperty('--chat-toolbar-height', `${Math.max(44, toolbarHeight)}px`);
        root.style.setProperty('--chat-bottom-stack-height', `${Math.max(80, inputAreaHeight + toolbarHeight)}px`);
    },

    observeChatLayout: function() {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observeTargets = () => {
            const chatNav = document.querySelector('.chat-nav');
            const chatInputArea = document.querySelector('.chat-input-area');
            const chatToolbar = document.getElementById('chat-toolbar') || document.querySelector('.chat-toolbar');

            if (!this.state.chatResizeObserver) {
                this.state.chatResizeObserver = new ResizeObserver(() => {
                    this.updateChatLayoutMetrics();
                    this.scheduleViewportUpdate();
                });
            }

            if (chatNav) this.state.chatResizeObserver.observe(chatNav);
            if (chatInputArea) this.state.chatResizeObserver.observe(chatInputArea);
            if (chatToolbar) this.state.chatResizeObserver.observe(chatToolbar);
        };

        observeTargets();

        if (typeof MutationObserver !== 'undefined' && !this.state.chatMutationObserver) {
            this.state.chatMutationObserver = new MutationObserver(() => {
                observeTargets();
                this.scheduleViewportUpdate();
            });

            this.state.chatMutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class'],
            });
        }
    },

    // 设置设备标识类
    setDeviceClasses: function() {
        const html = document.documentElement;

        if (this.devices.isPhone()) {
            html.classList.add('is-phone');
            if (this.devices.isSmallPhone()) html.classList.add('is-small-phone');
            if (this.devices.isMediumPhone()) html.classList.add('is-medium-phone');
            if (this.devices.isLargePhone()) html.classList.add('is-large-phone');
        }

        if (this.devices.isTablet()) {
            html.classList.add('is-tablet');
            if (this.devices.isLargeTablet()) html.classList.add('is-large-tablet');
        }

        if (this.browsers.isIOS) html.classList.add('is-ios');
        if (this.browsers.isAndroid) html.classList.add('is-android');
    },

    // 设置浏览器标识类
    setBrowserClasses: function() {
        const html = document.documentElement;

        if (this.browsers.isEdge) html.classList.add('is-edge');
        if (this.browsers.isChrome) html.classList.add('is-chrome');
        if (this.browsers.isFirefox) html.classList.add('is-firefox');
        if (this.browsers.isSafari) html.classList.add('is-safari');
        if (this.browsers.isOpera) html.classList.add('is-opera');
        if (this.browsers.isUC) html.classList.add('is-uc');
        if (this.browsers.isVivo) html.classList.add('is-vivo');
        if (this.browsers.isQQ) html.classList.add('is-qq');
        if (this.browsers.isWeChat) html.classList.add('is-wechat');
        if (this.browsers.isBaidu) html.classList.add('is-baidu');
        if (this.browsers.isSamsung) html.classList.add('is-samsung');
    },

    // 设置显示模式标识
    setDisplayModeClasses: function() {
        const html = document.documentElement;

        const isStandalone = this.displayModes.isStandalone();
        const isFullscreen = this.displayModes.isFullscreen();
        const isPWA = this.displayModes.isPWA();

        html.classList.toggle('is-pwa', isPWA);
        html.classList.toggle('is-standalone', isStandalone);
        html.classList.toggle('is-fullscreen', isFullscreen);

        if (this.browsers.isIOS) {
            html.classList.toggle('ios-standalone', isPWA);
        }

        html.classList.toggle('is-portrait', this.orientation.isPortrait());
        html.classList.toggle('is-landscape', this.orientation.isLandscape());
    },

    // 应用适配方案（自动）
    applyAdaptationScheme: function() {
        const root = document.documentElement;
        const computedStyle = window.getComputedStyle(root);

        const navHeight = parseInt(computedStyle.getPropertyValue('--nav-height'), 10) || 45;
        const safeTop = parseInt(computedStyle.getPropertyValue('--safe-area-inset-top'), 10) || 0;
        const isPWA = this.displayModes.isPWA();

        const navSafeTop = isPWA ? safeTop : 0;
        const navTotalHeight = navHeight + navSafeTop;

        root.style.setProperty('--top-padding', `${navHeight}px`);
        root.style.setProperty('--nav-safe-top', `${navSafeTop}px`);
        root.style.setProperty('--nav-total-height', `${navTotalHeight}px`);
        root.setAttribute('data-adapt-mode', 'auto');
    },

    // 监听事件
    setupEventListeners: function() {
        if (this.state.listenersBound) {
            return;
        }

        this.state.listenersBound = true;

        const onViewportChange = () => {
            this.scheduleViewportUpdate();
        };

        const onViewportChangeDelayed = () => {
            setTimeout(() => {
                this.scheduleViewportUpdate();
            }, 120);
        };

        window.addEventListener('resize', onViewportChange, { passive: true });
        window.addEventListener('orientationchange', onViewportChangeDelayed, { passive: true });
        window.addEventListener('pageshow', onViewportChange, { passive: true });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                onViewportChangeDelayed();
            }
        });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onViewportChange, { passive: true });
            window.visualViewport.addEventListener('scroll', onViewportChange, { passive: true });
        }

        if (!this.state.displayModeListenersBound && window.matchMedia) {
            this.state.displayModeListenersBound = true;

            const standaloneMedia = window.matchMedia('(display-mode: standalone)');
            const fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');

            if (typeof standaloneMedia.addEventListener === 'function') {
                standaloneMedia.addEventListener('change', onViewportChange);
                fullscreenMedia.addEventListener('change', onViewportChange);
            } else if (typeof standaloneMedia.addListener === 'function') {
                standaloneMedia.addListener(onViewportChange);
                fullscreenMedia.addListener(onViewportChange);
            }
        }
    },

    // 修复常见问题
    fixCommonIssues: function() {
        if (this.browsers.isIOS) {
            this.fixIOSInputIssues();
        }

        if (this.browsers.isAndroid) {
            this.fixAndroidInputIssues();
        }

        this.fix100dvhIssue();
        this.fixFixedPositioning();
        this.fixFontSizeAdjustment();
    },

    // 修复iOS输入框问题
    fixIOSInputIssues: function() {
        if (this.state.editableFocusBound) {
            return;
        }

        this.state.editableFocusBound = true;

        document.addEventListener('focusin', (event) => {
            if (!this.isEditableElement(event.target)) {
                return;
            }

            this.scheduleViewportUpdate();

            setTimeout(() => {
                this.scheduleViewportUpdate();
            }, 260);
        });

        document.addEventListener('focusout', () => {
            setTimeout(() => {
                this.scheduleViewportUpdate();
            }, 120);
        });
    },

    // 修复Android输入框问题
    fixAndroidInputIssues: function() {
        document.addEventListener('focusin', (event) => {
            if (!this.isEditableElement(event.target)) {
                return;
            }

            setTimeout(() => {
                this.scheduleViewportUpdate();
            }, 120);
        });

        document.addEventListener('focusout', () => {
            setTimeout(() => {
                this.scheduleViewportUpdate();
            }, 80);
        });
    },

    // 修复100dvh问题
    fix100dvhIssue: function() {
        this.scheduleViewportUpdate();
    },

    // 修复固定定位问题
    fixFixedPositioning: function() {
        const styleId = 'mobile-responsive-fixed-position-fix';

        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @supports (padding: max(0px)) {
                .is-pwa .chat-nav,
                .is-standalone .chat-nav,
                .is-pwa .chat-input-area,
                .is-standalone .chat-input-area,
                .is-pwa .chat-toolbar,
                .is-standalone .chat-toolbar {
                    padding-left: max(var(--safe-area-inset-left, 0px), 0px);
                    padding-right: max(var(--safe-area-inset-right, 0px), 0px);
                }
            }
        `;

        document.head.appendChild(style);
    },

    // 保留接口（兼容旧调用）
    fixZoomIssues: function() {},

    // 修复字体大小自动调整
    fixFontSizeAdjustment: function() {
        const styleId = 'mobile-responsive-font-adjust-fix';

        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            html, body {
                -webkit-text-size-adjust: 100%;
                -moz-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
                text-size-adjust: 100%;
            }
        `;

        document.head.appendChild(style);
    },

    // 获取设备信息
    getDeviceInfo: function() {
        return {
            browsers: this.browsers,
            devices: {
                isPhone: this.devices.isPhone(),
                isTablet: this.devices.isTablet(),
                isSmallPhone: this.devices.isSmallPhone(),
                isMediumPhone: this.devices.isMediumPhone(),
                isLargePhone: this.devices.isLargePhone(),
                isLargeTablet: this.devices.isLargeTablet(),
            },
            displayModes: {
                isPWA: this.displayModes.isPWA(),
                isStandalone: this.displayModes.isStandalone(),
                isFullscreen: this.displayModes.isFullscreen(),
                isBrowserMode: this.displayModes.isBrowserMode(),
            },
            orientation: {
                isPortrait: this.orientation.isPortrait(),
                isLandscape: this.orientation.isLandscape(),
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                devicePixelRatio: window.devicePixelRatio,
                visualViewportHeight: window.visualViewport ? window.visualViewport.height : window.innerHeight,
            },
        };
    },

    // 调试信息
    logDeviceInfo: function() {
        const info = this.getDeviceInfo();
        console.group('📱 设备信息');
        console.log('浏览器:', info.browsers);
        console.log('设备类型:', info.devices);
        console.log('显示模式:', info.displayModes);
        console.log('方向:', info.orientation);
        console.log('视口:', info.viewport);
        console.groupEnd();
    },
};

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MobileResponsiveAdapter.init();
    });
} else {
    MobileResponsiveAdapter.init();
}

// 导出到全局作用域
window.MobileResponsiveAdapter = MobileResponsiveAdapter;
