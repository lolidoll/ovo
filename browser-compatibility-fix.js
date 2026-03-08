/**
 * 浏览器兼容性修复和增强
 * 支持所有主流浏览器的特殊处理
 */

const BrowserCompatibilityFix = {
    // 初始化
    init: function() {
        console.log('🔧 浏览器兼容性修复系统初始化...');
        
        this.fixIOSSafari();
        this.fixAndroidChrome();
        this.fixEdgeBrowser();
        this.fixOperaBrowser();
        this.fixUCBrowser();
        this.fixVivoBrowser();
        this.fixQQBrowser();
        this.fixWeChatBrowser();
        this.fixBaiduBrowser();
        this.fixSamsungBrowser();
        this.fixFirefox();
        this.fixCommonIssues();
        
        console.log('✅ 浏览器兼容性修复完成');
    },

    // iOS Safari修复
    fixIOSSafari: function() {
        if (!/Safari/.test(navigator.userAgent) || /Chrome/.test(navigator.userAgent)) return;
        
        console.log('🍎 应用iOS Safari修复...');
        
        // 1. 修复100dvh问题
        const setIOSHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // 使用-webkit-fill-available作为备选
            if (CSS.supports && CSS.supports('-webkit-fill-available', '100dvh')) {
                document.documentElement.style.height = '-webkit-fill-available';
            }
        };
        
        setIOSHeight();
        window.addEventListener('resize', setIOSHeight, { passive: true });
        window.addEventListener('orientationchange', setIOSHeight, { passive: true });
        
        // 2. 修复输入框焦点问题
        document.addEventListener('focus', (e) => {
            if (e.target.matches('input, textarea')) {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        }, true);
        
        // 3. 修复粘贴功能
        document.addEventListener('paste', (e) => {
            const target = e.target;
            if (target.matches('input, textarea, [contenteditable="true"]')) {
                setTimeout(() => {
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }, 10);
            }
        });
        
        // 4. 修复滚动穿透
        let lastY = 0;
        document.addEventListener('touchstart', (e) => {
            lastY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const scrollElement = e.target.closest('[data-scrollable="true"], .chat-content, .content-area');
            
            if (scrollElement) {
                const isAtTop = scrollElement.scrollTop === 0;
                const isAtBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight;
                
                if ((isAtTop && currentY > lastY) || (isAtBottom && currentY < lastY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    },

    // Android Chrome修复
    fixAndroidChrome: function() {
        if (!/Android/.test(navigator.userAgent) || !/Chrome/.test(navigator.userAgent)) return;
        
        console.log('🤖 应用Android Chrome修复...');
        
        // 1. 修复视口高度
        const setAndroidHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setAndroidHeight();
        window.addEventListener('resize', setAndroidHeight, { passive: true });
        
        // 2. 修复输入框弹出键盘时的问题
        document.addEventListener('focus', (e) => {
            if (e.target.matches('input, textarea')) {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 300);
            }
        }, true);
        
        // 3. 修复虚拟键盘问题
        const originalInnerHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            if (window.innerHeight < originalInnerHeight * 0.75) {
                // 键盘弹出
                document.body.classList.add('keyboard-visible');
            } else {
                // 键盘隐藏
                document.body.classList.remove('keyboard-visible');
            }
        }, { passive: true });
    },

    // Edge浏览器修复
    fixEdgeBrowser: function() {
        if (!/Edg/.test(navigator.userAgent)) return;
        
        console.log('🔷 应用Edge浏览器修复...');
        
        // 1. 修复视口问题
        const setEdgeHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setEdgeHeight();
        window.addEventListener('resize', setEdgeHeight, { passive: true });
        
        // 2. 修复全屏模式
        if (window.matchMedia('(display-mode: fullscreen)').matches) {
            document.documentElement.classList.add('edge-fullscreen');
        }
    },

    // Opera浏览器修复
    fixOperaBrowser: function() {
        if (!/OPR|Opera/.test(navigator.userAgent)) return;
        
        console.log('🎭 应用Opera浏览器修复...');
        
        // Opera通常基于Chromium，使用Chrome的修复
        const setOperaHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setOperaHeight();
        window.addEventListener('resize', setOperaHeight, { passive: true });
    },

    // UC浏览器修复
    fixUCBrowser: function() {
        if (!/UCBrowser/.test(navigator.userAgent)) return;
        
        console.log('🌐 应用UC浏览器修复...');
        
        // UC浏览器的特殊处理
        const setUCHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // UC浏览器可能需要额外的处理
            if (window.innerHeight < 500) {
                document.documentElement.style.setProperty('--nav-height', '40px');
            }
        };
        
        setUCHeight();
        window.addEventListener('resize', setUCHeight, { passive: true });
    },

    // Vivo浏览器修复
    fixVivoBrowser: function() {
        if (!/VivoBrowser/.test(navigator.userAgent)) return;
        
        console.log('📱 应用Vivo浏览器修复...');
        
        const setVivoHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVivoHeight();
        window.addEventListener('resize', setVivoHeight, { passive: true });
    },

    // QQ浏览器修复
    fixQQBrowser: function() {
        if (!/QQBrowser/.test(navigator.userAgent)) return;
        
        console.log('🐧 应用QQ浏览器修复...');
        
        const setQQHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setQQHeight();
        window.addEventListener('resize', setQQHeight, { passive: true });
    },

    // 微信浏览器修复
    fixWeChatBrowser: function() {
        if (!/MicroMessenger/.test(navigator.userAgent)) return;
        
        console.log('💬 应用微信浏览器修复...');
        
        // 微信浏览器的特殊处理
        document.addEventListener('WeixinJSBridgeReady', () => {
            // 隐藏微信的菜单栏
            WeixinJSBridge.call('hideMenuItems', {
                menuList: ['menuItem.share:qq', 'menuItem.share:weiboApp']
            });
        });
        
        const setWeChatHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setWeChatHeight();
        window.addEventListener('resize', setWeChatHeight, { passive: true });
    },

    // 百度浏览器修复
    fixBaiduBrowser: function() {
        if (!/BaiduBrowser/.test(navigator.userAgent)) return;
        
        console.log('🔍 应用百度浏览器修复...');
        
        const setBaiduHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setBaiduHeight();
        window.addEventListener('resize', setBaiduHeight, { passive: true });
    },

    // 三星浏览器修复
    fixSamsungBrowser: function() {
        if (!/SamsungBrowser/.test(navigator.userAgent)) return;
        
        console.log('📲 应用三星浏览器修复...');
        
        const setSamsungHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setSamsungHeight();
        window.addEventListener('resize', setSamsungHeight, { passive: true });
    },

    // Firefox修复
    fixFirefox: function() {
        if (!/Firefox/.test(navigator.userAgent)) return;
        
        console.log('🦊 应用Firefox修复...');
        
        const setFirefoxHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setFirefoxHeight();
        window.addEventListener('resize', setFirefoxHeight, { passive: true });
    },

    // 通用问题修复
    fixCommonIssues: function() {
        console.log('🔧 应用通用问题修复...');
        
        // 1. 防止字体大小自动调整
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
        
        // 2. 防止双击缩放
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 3. 防止捏合缩放
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
        
        // 4. 修复滚动性能
        const scrollElements = document.querySelectorAll('[data-scrollable="true"], .chat-content, .content-area');
        scrollElements.forEach(el => {
            el.style.webkitOverflowScrolling = 'touch';
        });
        
        // 5. 修复输入框问题
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                // 防止自动缩放
                document.body.style.zoom = 1;
            });
            
            input.addEventListener('blur', () => {
                document.body.style.zoom = 1;
            });
        });
        
        // 6. 修复模态框问题
        const modals = document.querySelectorAll('.modal, .dialog, .popup, [data-modal="true"]');
        modals.forEach(modal => {
            modal.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        });
    },

    // 获取浏览器信息
    getBrowserInfo: function() {
        const ua = navigator.userAgent;
        return {
            userAgent: ua,
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isEdge: /Edg/.test(ua),
            isChrome: /Chrome/.test(ua),
            isFirefox: /Firefox/.test(ua),
            isSafari: /Safari/.test(ua),
            isOpera: /OPR|Opera/.test(ua),
            isUC: /UCBrowser/.test(ua),
            isVivo: /VivoBrowser/.test(ua),
            isQQ: /QQBrowser/.test(ua),
            isWeChat: /MicroMessenger/.test(ua),
            isBaidu: /BaiduBrowser/.test(ua),
            isSamsung: /SamsungBrowser/.test(ua),
        };
    },
};

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        BrowserCompatibilityFix.init();
    });
} else {
    BrowserCompatibilityFix.init();
}

// 导出到全局作用域
window.BrowserCompatibilityFix = BrowserCompatibilityFix;
