/**
 * 移动端全面适配增强系统
 * 支持所有手机浏览器、平板、PWA全屏模式
 * 包括：iOS Safari、Android Chrome、Edge、Opera、Vivo浏览器、UC浏览器等
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
        isVivo: /VivoBrowser/.test(navigator.userAgent),
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
        isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
                      window.matchMedia('(display-mode: fullscreen)').matches ||
                      window.navigator.standalone === true,
        isFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
        isPWA: function() {
            return this.isStandalone || this.isFullscreen;
        },
        isBrowserMode: function() {
            return !this.isPWA();
        },
    },

    // 屏幕方向
    orientation: {
        isPortrait: window.matchMedia('(orientation: portrait)').matches,
        isLandscape: window.matchMedia('(orientation: landscape)').matches,
    },

    // 初始化
    init: function() {
        console.log('🚀 移动端全面适配系统初始化...');
        
        // 设置视口高度
        this.setupViewportHeight();
        
        // 设置设备标识
        this.setDeviceClasses();
        
        // 设置浏览器标识
        this.setBrowserClasses();
        
        // 设置显示模式标识
        this.setDisplayModeClasses();
        
        // 应用适配方案
        this.applyAdaptationScheme();
        
        // 监听事件
        this.setupEventListeners();
        
        // 修复常见问题
        this.fixCommonIssues();
        
        console.log('✅ 移动端适配系统初始化完成');
    },

    // 设置视口高度 - 统一使用100dvh适配所有浏览器
    setupViewportHeight: function() {
        // 100dvh已经能够很好地适配所有浏览器，不需要额外修复
        // 只需要确保CSS变量正确设置
        document.documentElement.style.setProperty('--app-height', '100dvh');
        
        console.log('📱 视口高度已设置为100dvh');
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
        
        if (this.displayModes.isStandalone) {
            html.classList.add('is-pwa');
            html.classList.add('is-standalone');
        }
        
        if (this.displayModes.isFullscreen) {
            html.classList.add('is-fullscreen');
        }
        
        if (this.orientation.isPortrait) {
            html.classList.add('is-portrait');
        } else if (this.orientation.isLandscape) {
            html.classList.add('is-landscape');
        }
    },

    // 应用适配方案（现在只使用自动适配）
    applyAdaptationScheme: function() {
        // 强制使用自动适配模式
        const savedMode = 'auto';
        let topPadding = 45;
        
        // 自动模式：根据设备和浏览器自动选择
        if (this.displayModes.isPWA()) {
            topPadding = 0; // PWA模式使用safe-area
        } else if (this.browsers.isIOS) {
            topPadding = 45; // iOS浏览器
        } else if (this.browsers.isAndroid) {
            topPadding = 45; // Android浏览器
        } else {
            topPadding = 45; // 其他浏览器
        }
        
        // 更新CSS变量
        document.documentElement.style.setProperty('--top-padding', `${topPadding}px`);
        
        // 同时更新导航栏的CSS变量，确保正确显示
        const navHeight = topPadding; // 导航栏高度等于顶部间距
        const navSafeTop = this.browsers.isIOS && this.displayModes.isPWA() ? 
                           parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')) : 0;
        const navTotalHeight = navHeight + navSafeTop;
        
        document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
        document.documentElement.style.setProperty('--nav-safe-top', `${navSafeTop}px`);
        document.documentElement.style.setProperty('--nav-total-height', `${navTotalHeight}px`);
        
        document.documentElement.setAttribute('data-adapt-mode', 'auto');
    },

    // 监听事件
    setupEventListeners: function() {
        // 监听方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.setDisplayModeClasses();
                this.applyAdaptationScheme();
            }, 200);
        }, { passive: true });
        
        // 监听显示模式变化
        window.matchMedia('(display-mode: standalone)').addListener(() => {
            this.setDisplayModeClasses();
            this.applyAdaptationScheme();
        });
        
        // 监听可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    this.setupViewportHeight();
                }, 100);
            }
        });
    },

    // 修复常见问题
    fixCommonIssues: function() {
        // 1. 修复iOS Safari输入框问题
        if (this.browsers.isIOS) {
            this.fixIOSInputIssues();
        }
        
        // 2. 修复Android输入框问题
        if (this.browsers.isAndroid) {
            this.fixAndroidInputIssues();
        }
        
        // 3. 修复100dvh问题
        this.fix100dvhIssue();
        
        // 4. 修复固定定位问题
        this.fixFixedPositioning();
        
        // 5. 修复缩放问题
        this.fixZoomIssues();
        
        // 6. 修复字体大小自动调整
        this.fixFontSizeAdjustment();
    },

    // 修复iOS输入框问题
    fixIOSInputIssues: function() {
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                // 防止iOS Safari自动缩放
                document.body.style.zoom = 1;
                
                // 延迟滚动到输入框
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
            
            input.addEventListener('blur', () => {
                document.body.style.zoom = 1;
            });
        });
    },

    // 修复Android输入框问题
    fixAndroidInputIssues: function() {
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Android某些浏览器会改变视口
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 300);
            });
        });
    },

    // 修复100dvh问题
    fix100dvhIssue: function() {
        const updateVh = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        updateVh();
        window.addEventListener('resize', updateVh, { passive: true });
        window.addEventListener('orientationchange', updateVh, { passive: true });
    },

    // 修复固定定位问题
    fixFixedPositioning: function() {
        // 在PWA模式下，fixed元素需要特殊处理
        if (this.displayModes.isPWA()) {
            const style = document.createElement('style');
            style.textContent = `
                /* PWA模式下的fixed元素适配 */
                @supports (padding: max(0px)) {
                    .chat-nav, .chat-input-area, [data-fixed="true"] {
                        padding-top: max(var(--nav-safe-top, 0px), env(safe-area-inset-top));
                        padding-bottom: max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom));
                        padding-left: max(var(--safe-area-inset-left, 0px), env(safe-area-inset-left));
                        padding-right: max(var(--safe-area-inset-right, 0px), env(safe-area-inset-right));
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    // 修复缩放问题
    fixZoomIssues: function() {
        // 防止双击缩放
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 防止捏合缩放
        let lastDistance = 0;
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                
                if (lastDistance > 0) {
                    if (Math.abs(distance - lastDistance) > 10) {
                        e.preventDefault();
                    }
                }
                lastDistance = distance;
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            lastDistance = 0;
        }, { passive: true });
    },

    // 修复字体大小自动调整
    fixFontSizeAdjustment: function() {
        const style = document.createElement('style');
        style.textContent = `
            * {
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
                isStandalone: this.displayModes.isStandalone,
                isFullscreen: this.displayModes.isFullscreen,
                isBrowserMode: this.displayModes.isBrowserMode(),
            },
            orientation: this.orientation,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                devicePixelRatio: window.devicePixelRatio,
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
