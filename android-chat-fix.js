/**
 * 安卓浏览器聊天页面动态修复
 * 检测安卓浏览器并应用相应的修复
 */

(function() {
    'use strict';
    
    // 检测安卓浏览器
    function isAndroidBrowser() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android/i.test(userAgent) && 
               !/iphone|ipad|ipod/i.test(userAgent) &&
               !/samsung browser/i.test(userAgent); // 排除三星浏览器（它有自己的优化）
    }
    
    // 检测特定设备
    function getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.indexOf('samsung') > -1) return 'samsung';
        if (userAgent.indexOf('xiaomi') > -1) return 'xiaomi';
        if (userAgent.indexOf('huawei') > -1) return 'huawei';
        if (userAgent.indexOf('oppo') > -1) return 'oppo';
        if (userAgent.indexOf('vivo') > -1) return 'vivo';
        if (userAgent.indexOf('oneplus') > -1) return 'oneplus';
        if (userAgent.indexOf('nexus') > -1) return 'nexus';
        if (userAgent.indexOf('pixel') > -1) return 'pixel';
        return 'generic';
    }
    
    // 检测浏览器类型
    function getBrowserType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.indexOf('chrome') > -1) return 'chrome';
        if (userAgent.indexOf('firefox') > -1) return 'firefox';
        if (userAgent.indexOf('safari') > -1) return 'safari';
        if (userAgent.indexOf('edge') > -1) return 'edge';
        if (userAgent.indexOf('opera') > -1) return 'opera';
        if (userAgent.indexOf('ucbrowser') > -1) return 'uc';
        if (userAgent.indexOf('qq') > -1) return 'qq';
        return 'unknown';
    }
    
    // 检测键盘状态
    function detectKeyboardState() {
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const keyboardHeight = window.innerHeight - viewportHeight;
        
        return {
            isOpen: keyboardHeight > 150,
            height: keyboardHeight
        };
    }
    
    // 动态设置CSS变量
    function setCSSVariables() {
        const navHeight = document.querySelector('.chat-nav')?.offsetHeight || 45;
        const inputAreaHeight = document.querySelector('.chat-input-area')?.offsetHeight || 80;
        const toolbarHeight = document.querySelector('.chat-toolbar')?.offsetHeight || 50;
        
        document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
        document.documentElement.style.setProperty('--input-area-height', `${inputAreaHeight}px`);
        document.documentElement.style.setProperty('--toolbar-height', `${toolbarHeight}px`);
        
        return { navHeight, inputAreaHeight, toolbarHeight };
    }
    
    // 处理键盘弹出
    function handleKeyboardOpen() {
        const keyboard = detectKeyboardState();
        const chatPage = document.getElementById('chat-page');
        const chatMessages = document.getElementById('chat-messages');
        const inputArea = document.querySelector('.chat-input-area');
        const toolbar = document.querySelector('.chat-toolbar');
        
        if (keyboard.isOpen) {
            console.log('[Android Fix] 键盘弹出，应用修复');
            
            // 添加键盘打开类
            document.body.classList.add('keyboard-open');
            if (chatPage) chatPage.classList.add('keyboard-open');
            
            // 计算内容区域新高度
            const { navHeight, inputAreaHeight, toolbarHeight } = setCSSVariables();
            const contentHeight = window.innerHeight - navHeight - inputAreaHeight - toolbarHeight + keyboard.height;
            
            // 调整内容区域高度
            if (chatMessages) {
                chatMessages.style.height = `${contentHeight}px`;
                chatMessages.style.paddingBottom = '20px';
            }
            
            // 调整输入区域位置
            if (inputArea) {
                inputArea.style.transform = `translateY(-${keyboard.height}px)`;
            }
            
            // 调整工具栏位置
            if (toolbar) {
                toolbar.style.transform = `translateY(-${toolbarHeight}px)`;
            }
        } else {
            console.log('[Android Fix] 键盘关闭，恢复原状');
            
            // 移除键盘打开类
            document.body.classList.remove('keyboard-open');
            if (chatPage) chatPage.classList.remove('keyboard-open');
            
            // 恢复内容区域高度
            if (chatMessages) {
                chatMessages.style.height = '';
                chatMessages.style.paddingBottom = '';
            }
            
            // 恢复输入区域位置
            if (inputArea) {
                inputArea.style.transform = '';
            }
            
            // 恢复工具栏位置
            if (toolbar) {
                toolbar.style.transform = '';
            }
        }
    }
    
    // 优化滚动性能
    function optimizeScrolling() {
        const chatMessages = document.getElementById('chat-messages');
        
        if (chatMessages) {
            // 使用requestAnimationFrame优化滚动
            let isScrolling = false;
            
            chatMessages.addEventListener('scroll', function() {
                if (!isScrolling) {
                    requestAnimationFrame(() => {
                        // 这里可以添加滚动时的优化逻辑
                        isScrolling = false;
                    });
                    isScrolling = true;
                }
            });
            
            // 防止滚动卡顿
            chatMessages.style.scrollBehavior = 'smooth';
        }
    }
    
    // 修复输入框问题
    function fixInputIssues() {
        const chatInput = document.getElementById('chat-input');
        
        if (chatInput) {
            // 修复自动聚焦问题
            chatInput.addEventListener('focus', function() {
                console.log('[Android Fix] 输入框聚焦');
                // 强制滚动到底部
                setTimeout(() => {
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }, 100);
            });
            
            // 修复自动调整大小问题
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 100) + 'px';
            });
            
            // 修复键盘弹出时的滚动问题
            chatInput.addEventListener('blur', function() {
                console.log('[Android Fix] 输入框失焦');
                setTimeout(() => {
                    handleKeyboardOpen();
                }, 100);
            });
        }
    }
    
    // 应用设备特定修复
    function applyDeviceSpecificFixes() {
        const deviceType = getDeviceType();
        const browserType = getBrowserType();
        
        console.log(`[Android Fix] 检测到设备: ${deviceType}, 浏览器: ${browserType}`);
        
        // 根据设备类型应用特定修复
        document.body.classList.add(`android-${deviceType}`);
        document.body.classList.add(`android-${browserType}`);
        
        // 三星设备特殊处理
        if (deviceType === 'samsung') {
            document.body.classList.add('samsung-device');
            // 三星设备的键盘处理可能需要额外优化
            const viewport = window.visualViewport;
            if (viewport) {
                viewport.addEventListener('resize', handleKeyboardOpen);
            }
        }
        
        // 小米设备特殊处理
        if (deviceType === 'xiaomi') {
            document.body.classList.add('xiaomi-device');
            // 小米设备的输入框样式可能需要调整
        }
    }
    
    // 初始化修复
    function initAndroidFix() {
        if (!isAndroidBrowser()) {
            console.log('[Android Fix] 非安卓设备，跳过修复');
            return;
        }
        
        console.log('[Android Fix] 安卓设备检测到，应用修复');
        
        // 添加安卓类名
        document.body.classList.add('android-browser');
        document.body.classList.add('android-optimized');
        
        // 应用设备特定修复
        applyDeviceSpecificFixes();
        
        // 设置CSS变量
        setCSSVariables();
        
        // 监听视口变化（键盘弹出/关闭）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleKeyboardOpen);
        }
        
        // 监听窗口大小变化
        window.addEventListener('resize', handleKeyboardOpen);
        
        // 优化滚动性能
        optimizeScrolling();
        
        // 修复输入框问题
        fixInputIssues();
        
        // 初始处理键盘状态
        setTimeout(handleKeyboardOpen, 100);
        
        // 监听导航栏和输入区域高度变化
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target.classList.contains('chat-nav') || 
                    entry.target.classList.contains('chat-input-area') || 
                    entry.target.classList.contains('chat-toolbar')) {
                    setCSSVariables();
                    handleKeyboardOpen();
                }
            }
        });
        
        observer.observe(document.querySelector('.chat-nav'));
        observer.observe(document.querySelector('.chat-input-area'));
        observer.observe(document.querySelector('.chat-toolbar'));
        
        console.log('[Android Fix] 安卓修复初始化完成');
    }
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAndroidFix);
    } else {
        initAndroidFix();
    }
    
    // 导出调试信息
    window.AndroidChatFix = {
        isAndroid: isAndroidBrowser,
        getDeviceType: getDeviceType,
        getBrowserType: getBrowserType,
        handleKeyboardOpen: handleKeyboardOpen,
        setCSSVariables: setCSSVariables
    };
    
})();