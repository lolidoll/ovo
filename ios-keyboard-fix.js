/**
 * iOS Safari 输入框修复
 * 使用visual viewport API确保输入框和工具栏位置正确
 */

(function() {
    'use strict';

    // 检测是否为iOS设备
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

    if (!chatPage || !inputArea || !toolbar || !chatInput) {
        console.warn('[iOS Fix] 元素未找到');
        return;
    }

    let originalHeight = window.innerHeight;

    /**
     * 处理visualViewport变化
     */
    function handleViewportChange() {
        if (!window.visualViewport) return;

        const currentHeight = window.visualViewport.height;
        const keyboardHeight = originalHeight - currentHeight;

        console.log('[iOS Fix] 键盘高度:', keyboardHeight, '视口高度:', currentHeight);

        // 键盘弹出时
        if (keyboardHeight > 150) {
            // 使用fixed定位，位置相对于visual viewport底部
            inputArea.style.position = 'fixed';
            inputArea.style.bottom = '36px';
            inputArea.style.left = '0';
            inputArea.style.right = '0';
            inputArea.style.width = '100%';
            inputArea.style.top = '';
            
            toolbar.style.position = 'fixed';
            toolbar.style.bottom = '0';
            toolbar.style.left = '0';
            toolbar.style.right = '0';
            toolbar.style.width = '100%';
            toolbar.style.top = '';

            // 调整消息区域
            if (messagesContainer) {
                const navHeight = 50;
                const inputAreaHeight = 50;
                const toolbarHeight = 36;
                const availableHeight = currentHeight - navHeight - inputAreaHeight - toolbarHeight;
                messagesContainer.style.height = availableHeight + 'px';
                messagesContainer.style.flex = 'none';
                
                // 滚动到底部
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
            }
        } else {
            // 键盘收起时，恢复absolute定位
            inputArea.style.position = 'absolute';
            inputArea.style.bottom = '36px';
            inputArea.style.top = '';
            
            toolbar.style.position = 'absolute';
            toolbar.style.bottom = '0';
            toolbar.style.top = '';

            if (messagesContainer) {
                messagesContainer.style.height = '';
                messagesContainer.style.flex = '';
            }
        }
    }

    /**
     * 初始化
     */
    function init() {
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
            
            // 初始设置
            originalHeight = window.innerHeight;
        }

        // 输入框聚焦时滚动到底部
        chatInput.addEventListener('focus', function() {
            setTimeout(() => {
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
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
