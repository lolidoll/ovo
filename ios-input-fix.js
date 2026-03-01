/**
 * iOS Safari 聊天输入框修复脚本
 * 完整修复iOS Safari上点击输入框导致布局错乱的问题
 * 
 * 修复问题：
 * 1. 点击输入框时，输入框和工具栏跑到顶部
 * 2. 底部导航栏暴露
 * 3. 页面被键盘向上推动
 */

(function() {
    'use strict';

    // 检测是否为iOS设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // 如果不是iOS设备，则不需要此脚本
    if (!isIOS) {
        console.log('[iOS Input Fix] 非iOS设备，跳过修复');
        return;
    }

    console.log('[iOS Input Fix] 检测到iOS设备，启用输入框修复');

    // 获取DOM元素
    const chatPage = document.getElementById('chat-page');
    const chatInput = document.getElementById('chat-input');
    const tabBar = document.getElementById('tab-bar');

    if (!chatPage || !chatInput) {
        console.warn('[iOS Input Fix] 聊天页面元素未找到');
        return;
    }

    // 键盘状态标志
    let isKeyboardVisible = false;
    let keyboardHeight = 0;
    let originalScrollPosition = 0;
    let viewportHeight = window.innerHeight;
    let isLandscape = window.orientation === 90 || window.orientation === -90;

    /**
     * 处理输入框聚焦事件
     */
    function handleInputFocus(e) {
        console.log('[iOS Input Fix] 输入框聚焦');
        
        // 阻止默认行为
        // e.preventDefault();
        
        // 添加聚焦状态类名
        chatPage.classList.add('input-focused');
        document.body.classList.add('keyboard-open');
        document.body.classList.add('input-focused');
        
        isKeyboardVisible = true;

        // 延迟执行，等待键盘弹出
        setTimeout(() => {
            // 1. 禁用页面滚动
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.top = '0';
            document.body.style.left = '0';
            document.body.style.bottom = '0';

            // 2. 强制聊天页面固定在视口
            chatPage.style.position = 'fixed';
            chatPage.style.top = '0';
            chatPage.style.left = '0';
            chatPage.style.width = '100vw';
            chatPage.style.height = '100vh';
            chatPage.style.height = '100dvh';
            chatPage.style.overflow = 'hidden';
            chatPage.style.overflowY = 'auto';

            // 3. 隐藏底部导航栏（防止暴露）
            if (tabBar) {
                tabBar.style.visibility = 'hidden';
                tabBar.style.pointerEvents = 'none';
            }

            // 4. 确保输入区域和工具栏固定在底部
            const inputArea = chatPage.querySelector('.chat-input-area');
            const toolbar = chatPage.querySelector('.chat-toolbar');
            
            if (inputArea) {
                inputArea.style.position = 'fixed';
                inputArea.style.bottom = '36px';
                inputArea.style.left = '0';
                inputArea.style.right = '0';
                inputArea.style.zIndex = '200';
                inputArea.style.width = '100%';
            }
            
            if (toolbar) {
                toolbar.style.position = 'fixed';
                toolbar.style.bottom = '0';
                toolbar.style.left = '0';
                toolbar.style.right = '0';
                toolbar.style.zIndex = '200';
                toolbar.style.width = '100%';
            }

            // 5. 调整消息区域高度
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                const navHeight = 50;
                const inputAreaHeight = 50;
                const toolbarHeight = 36;
                const availableHeight = window.innerHeight - navHeight - inputAreaHeight - toolbarHeight;
                messagesContainer.style.height = availableHeight + 'px';
                messagesContainer.style.flex = 'none';
                // 滚动到底部
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
            }

        }, 300);
    }

    /**
     * 处理输入框失焦事件
     */
    function handleInputBlur(e) {
        console.log('[iOS Input Fix] 输入框失焦');
        
        // 延迟执行，等待键盘收起
        setTimeout(() => {
            // 移除聚焦状态类名
            chatPage.classList.remove('input-focused');
            document.body.classList.remove('keyboard-open');
            document.body.classList.remove('input-focused');
            
            isKeyboardVisible = false;

            // 1. 恢复页面滚动
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.bottom = '';

            // 2. 恢复聊天页面样式
            chatPage.style.position = '';
            chatPage.style.top = '';
            chatPage.style.left = '';
            chatPage.style.width = '';
            chatPage.style.height = '';
            chatPage.style.overflow = '';
            chatPage.style.overflowY = '';

            // 3. 显示底部导航栏（如果聊天页面打开则保持隐藏）
            if (tabBar) {
                if (chatPage.classList.contains('open')) {
                    tabBar.style.visibility = 'hidden';
                    tabBar.style.pointerEvents = 'none';
                } else {
                    tabBar.style.visibility = '';
                    tabBar.style.pointerEvents = '';
                }
            }

            // 4. 恢复输入区域和工具栏样式
            const inputArea = chatPage.querySelector('.chat-input-area');
            const toolbar = chatPage.querySelector('.chat-toolbar');
            
            if (inputArea) {
                inputArea.style.position = '';
                inputArea.style.bottom = '';
                inputArea.style.left = '';
                inputArea.style.right = '';
                inputArea.style.zIndex = '';
                inputArea.style.width = '';
            }
            
            if (toolbar) {
                toolbar.style.position = '';
                toolbar.style.bottom = '';
                toolbar.style.left = '';
                toolbar.style.right = '';
                toolbar.style.zIndex = '';
                toolbar.style.width = '';
            }

            // 5. 恢复消息区域样式
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.style.height = '';
                messagesContainer.style.flex = '';
            }

        }, 200);
    }

    /**
     * 处理触摸输入事件（在键盘弹出前）
     */
    function handleTouchStart(e) {
        // 记录当前滚动位置
        originalScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    }

    /**
     * 处理视觉视口变化（iOS 15+）
     */
    function handleVisualViewportResize() {
        if (!window.visualViewport) return;
        
        const newViewportHeight = window.visualViewport.height;
        const newKeyboardHeight = window.innerHeight - newViewportHeight;
        
        viewportHeight = newViewportHeight;
        keyboardHeight = newKeyboardHeight;
        
        console.log('[iOS Input Fix] 视口变化:', {
            viewportHeight: newViewportHeight,
            keyboardHeight: newKeyboardHeight,
            isKeyboardVisible: isKeyboardVisible
        });
        
        if (newKeyboardHeight > 150) {
            // 键盘已弹出
            if (!isKeyboardVisible) {
                handleInputFocus();
            }
            
            // 调整聊天页面高度为实际可视区域
            chatPage.style.height = newViewportHeight + 'px';
            
            // 调整输入区域和工具栏位置
            const inputArea = chatPage.querySelector('.chat-input-area');
            const toolbar = chatPage.querySelector('.chat-toolbar');
            const messagesContainer = document.getElementById('chat-messages');
            
            if (inputArea && toolbar && messagesContainer) {
                const navHeight = 50;
                const inputAreaHeight = 50;
                const toolbarHeight = 36;
                const safeAreaBottom = getSafeAreaInset('bottom');
                
                // 输入区域固定在底部（工具栏上方）
                inputArea.style.position = 'fixed';
                inputArea.style.bottom = (toolbarHeight + safeAreaBottom) + 'px';
                
                // 工具栏固定在最底部
                toolbar.style.position = 'fixed';
                toolbar.style.bottom = '0';
                
                // 消息区域高度调整
                const availableHeight = newViewportHeight - navHeight - inputAreaHeight - toolbarHeight - safeAreaBottom;
                messagesContainer.style.height = availableHeight + 'px';
                messagesContainer.style.flex = 'none';
            }
        } else {
            // 键盘已收起
            if (isKeyboardVisible) {
                handleInputBlur();
            }
        }
    }

    /**
     * 获取安全区域插入值
     */
    function getSafeAreaInset(position) {
        const computedStyle = getComputedStyle(document.documentElement);
        const value = computedStyle.getPropertyValue(`--safe-area-inset-${position}`);
        // 尝试从env()获取
        if (value && value.includes('env(')) {
            const match = value.match(/env\(([^)]+)\)/);
            if (match) {
                // 返回0，实际值由CSS处理
                return 0;
            }
        }
        return parseFloat(value) || 0;
    }

    /**
     * 防止iOS Safari的橡皮筋效果
     */
    function preventOverscroll(e) {
        const target = e.target;
        
        // 只在聊天页面内阻止橡皮筋效果
        if (!chatPage.contains(target)) return;
        
        const messagesContainer = document.getElementById('chat-messages');
        
        if (messagesContainer && messagesContainer.contains(target)) {
            const scrollTop = messagesContainer.scrollTop;
            const scrollHeight = messagesContainer.scrollHeight;
            const clientHeight = messagesContainer.clientHeight;
            
            // 如果已经滚动到顶部或底部，阻止默认行为
            if (scrollTop === 0 && e.deltaY < 0) {
                e.preventDefault();
            }
            if (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0) {
                e.preventDefault();
            }
        }
    }

    /**
     * 处理页面显示事件（从后台切换回来）
     */
    function handlePageShow() {
        // 重置所有状态
        handleInputBlur();
    }

    /**
     * 处理屏幕方向变化
     */
    function handleOrientationChange() {
        const newIsLandscape = window.orientation === 90 || window.orientation === -90;
        
        if (newIsLandscape !== isLandscape) {
            isLandscape = newIsLandscape;
            
            // 延迟处理，等待方向切换完成
            setTimeout(() => {
                if (isKeyboardVisible) {
                    handleInputFocus();
                } else {
                    handleInputBlur();
                }
            }, 500);
        }
    }

    /**
     * 初始化事件监听
     */
    function init() {
        // 监听输入框focus/blur事件
        chatInput.addEventListener('focus', handleInputFocus, { passive: false });
        chatInput.addEventListener('blur', handleInputBlur, { passive: true });

        // 监听touchstart事件
        chatInput.addEventListener('touchstart', handleTouchStart, { passive: true });

        // 监听visualViewport变化（iOS 15+）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualViewportResize);
            window.visualViewport.addEventListener('scroll', handleVisualViewportResize);
        }

        // 阻止橡皮筋效果
        document.addEventListener('wheel', preventOverscroll, { passive: false });
        document.addEventListener('touchmove', preventOverscroll, { passive: false });

        // 监听页面显示事件
        window.addEventListener('pageshow', handlePageShow);

        // 处理屏幕方向变化
        window.addEventListener('orientationchange', handleOrientationChange);

        // 防止iOS Safari的双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // 防止iOS Safari的长按菜单影响
        chatInput.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        console.log('[iOS Input Fix] 事件监听已初始化');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出API供外部使用
    window.iOSInputFix = {
        isKeyboardVisible: () => isKeyboardVisible,
        getKeyboardHeight: () => keyboardHeight,
        forceKeyboardHide: () => handleInputBlur(),
        reset: () => handleInputBlur()
    };

})();

