/**
 * iOS Safari 输入框修复
 * 使用transform补偿iOS Safari的键盘滚动行为
 */

(function() {
    'use strict';

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isIOS) {
        console.log('[iOS Fix] 非iOS设备，跳过');
        return;
    }

    console.log('[iOS Fix] iOS设备，启用修复');

    const chatPage = document.getElementById('chat-page');
    const chatInput = document.getElementById('chat-input');
    const inputArea = document.querySelector('.chat-input-area');
    const toolbar = document.querySelector('.chat-toolbar');
    const messagesContainer = document.getElementById('chat-messages');

    if (!chatPage || !inputArea || !toolbar || !chatInput || !messagesContainer) {
        console.warn('[iOS Fix] 元素未找到');
        return;
    }

    let isKeyboardOpen = false;

    /**
     * 处理visualViewport变化
     */
    function handleViewportChange() {
        if (!window.visualViewport) return;

        const viewportHeight = window.visualViewport.height;
        const viewportTop = window.visualViewport.top;
        const keyboardHeight = window.innerHeight - viewportHeight;

        console.log('[iOS Fix] 视口:', { h: viewportHeight, top: viewportTop, kb: keyboardHeight });

        if (keyboardHeight > 150) {
            // 键盘弹出
            isKeyboardOpen = true;

            // 使用transform将输入区域和工具栏"钉"在visual viewport底部
            // fixed定位 + transform补偿
            inputArea.style.position = 'fixed';
            inputArea.style.bottom = '36px';
            inputArea.style.left = '0';
            inputArea.style.right = '0';
            inputArea.style.width = '100%';
            inputArea.style.transform = `translateY(${viewportTop}px)`;
            inputArea.style.willChange = 'transform';
            
            toolbar.style.position = 'fixed';
            toolbar.style.bottom = '0';
            toolbar.style.left = '0';
            toolbar.style.right = '0';
            toolbar.style.width = '100%';
            toolbar.style.transform = `translateY(${viewportTop}px)`;
            toolbar.style.willChange = 'transform';

            // 调整消息区域
            const navHeight = 50;
            const inputAreaHeight = 50;
            const toolbarHeight = 36;
            const availableHeight = viewportHeight - navHeight - inputAreaHeight - toolbarHeight;
            messagesContainer.style.height = availableHeight + 'px';
            messagesContainer.style.flex = 'none';
        } else {
            // 键盘收起
            isKeyboardOpen = false;

            // 清除所有内联样式
            inputArea.style.position = '';
            inputArea.style.bottom = '';
            inputArea.style.left = '';
            inputArea.style.right = '';
            inputArea.style.width = '';
            inputArea.style.transform = '';
            inputArea.style.willChange = '';
            
            toolbar.style.position = '';
            toolbar.style.bottom = '';
            toolbar.style.left = '';
            toolbar.style.right = '';
            toolbar.style.width = '';
            toolbar.style.transform = '';
            toolbar.style.willChange = '';

            messagesContainer.style.height = '';
            messagesContainer.style.flex = '1';
        }
    }

    /**
     * 初始化
     */
    function init() {
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        }

        chatInput.addEventListener('focus', function() {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 300);
        }, { passive: true });

        console.log('[iOS Fix] 已初始化');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
