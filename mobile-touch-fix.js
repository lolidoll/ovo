/**
 * 移动端触摸交互修复
 * 解决输入框点击、长按消息气泡等移动端交互问题
 */

(function() {
    'use strict';
    
    console.log('🔧 移动端触摸修复模块加载');
    
    // 检测是否为移动设备 - 增强检测逻辑，支持更多浏览器
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0) ||
                     (navigator.msMaxTouchPoints > 0);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
        console.log('⏭️ 非移动设备，跳过触摸修复');
        return;
    }
    
    console.log(`📱 检测到移动设备 (iOS: ${isIOS}, Android: ${isAndroid})`);
    console.log(`📱 浏览器信息: ${navigator.userAgent}`);
    console.log(`📱 触摸支持: ontouchstart=${'ontouchstart' in window}, maxTouchPoints=${navigator.maxTouchPoints}`);
    
    /**
     * 修复输入框点击问题
     */
    function fixInputFocus() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        // 确保输入框可以接收触摸事件
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.touchAction = 'manipulation';
        
        // iOS特殊处理：防止输入框失焦
        if (isIOS) {
            chatInput.addEventListener('blur', function(e) {
                // 如果是因为点击其他元素导致失焦，延迟重新聚焦
                setTimeout(() => {
                    if (document.activeElement !== chatInput && 
                        !document.activeElement.classList.contains('chat-send-btn')) {
                        // 不自动重新聚焦，避免干扰用户操作
                    }
                }, 100);
            });
        }
        
        // 添加触摸事件监听，确保点击能触发聚焦
        chatInput.addEventListener('touchstart', function(e) {
            e.stopPropagation(); // 防止事件冒泡
            this.focus();
        }, { passive: true });
        
        // 添加click事件作为后备方案（某些浏览器可能不触发touchstart）
        chatInput.addEventListener('click', function(e) {
            e.stopPropagation();
            this.focus();
        });
        
        console.log('✅ 输入框触摸修复已应用');
    }
    
    /**
     * 修复长按消息气泡问题
     */
    function fixLongPress() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        let longPressTimer = null;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        let targetBubble = null;
        
        // 使用事件委托处理所有消息气泡
        chatMessages.addEventListener('touchstart', function(e) {
            // 查找最近的消息气泡
            targetBubble = e.target.closest('.chat-bubble');
            if (!targetBubble) return;
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
            
            // 设置长按定时器（500ms）
            longPressTimer = setTimeout(() => {
                if (!touchMoved && targetBubble) {
                    // 触发长按事件
                    console.log('📱 长按消息气泡触发');
                    
                    // 触发原有的长按处理逻辑
                    if (window.openMessageContextMenu && typeof window.openMessageContextMenu === 'function') {
                        const messageId = targetBubble.dataset.messageId;
                        if (messageId) {
                            window.openMessageContextMenu(messageId, e);
                        }
                    }
                    
                    // 震动反馈（如果支持）
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }, 500);
        }, { passive: true });
        
        chatMessages.addEventListener('touchmove', function(e) {
            if (!targetBubble) return;
            
            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
            
            // 如果移动超过10px，取消长按
            if (deltaX > 10 || deltaY > 10) {
                touchMoved = true;
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
        }, { passive: true });
        
        chatMessages.addEventListener('touchend', function(e) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            targetBubble = null;
        }, { passive: true });
        
        chatMessages.addEventListener('touchcancel', function(e) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            targetBubble = null;
        }, { passive: true });
        
        console.log('✅ 长按消息气泡修复已应用');
    }
    
    /**
     * 点击外部关闭长按菜单
     */
    function fixLongPressMenuClose() {
        const handleMenuClose = function(e) {
            // 查找长按菜单元素
            const contextMenu = document.querySelector('.message-context-menu');
            if (!contextMenu) return;
            
            // 检查是否点击在菜单外部
            if (!contextMenu.contains(e.target) && !e.target.closest('.chat-bubble')) {
                // 关闭菜单
                contextMenu.remove();
                console.log('📱 点击外部关闭长按菜单 (' + e.type + ')');
            }
        };
        
        document.addEventListener('touchstart', handleMenuClose, { passive: true });
        // 添加click事件作为后备
        document.addEventListener('click', handleMenuClose);
        
        console.log('✅ 长按菜单外部关闭已应用');
    }
    
    /**
     * 修复工具栏按钮点击问题
     */
    function fixToolbarButtons() {
        const toolbar = document.getElementById('chat-toolbar');
        if (!toolbar) return;
        
        const buttons = toolbar.querySelectorAll('.tb-btn');
        buttons.forEach(btn => {
            // 确保按钮可以接收触摸事件
            btn.style.pointerEvents = 'auto';
            btn.style.touchAction = 'manipulation';
            btn.style.webkitTapHighlightColor = 'rgba(0,0,0,0.05)';
            btn.style.userSelect = 'none';
            btn.style.webkitUserSelect = 'none';
            
            // 添加触摸反馈
            btn.addEventListener('touchstart', function() {
                this.style.opacity = '0.6';
            }, { passive: true });
            
            btn.addEventListener('touchend', function() {
                this.style.opacity = '1';
            }, { passive: true });
            
            btn.addEventListener('touchcancel', function() {
                this.style.opacity = '1';
            }, { passive: true });
        });
        
        console.log(`✅ 工具栏按钮触摸修复已应用 (${buttons.length}个按钮)`);
    }
    
    /**
     * 修复发送按钮点击问题
     */
    function fixSendButton() {
        const sendBtn = document.getElementById('chat-send-btn');
        if (!sendBtn) return;
        
        sendBtn.style.pointerEvents = 'auto';
        sendBtn.style.touchAction = 'manipulation';
        
        // 添加触摸反馈
        sendBtn.addEventListener('touchstart', function() {
            this.style.opacity = '0.7';
        }, { passive: true });
        
        sendBtn.addEventListener('touchend', function() {
            this.style.opacity = '1';
        }, { passive: true });
        
        console.log('✅ 发送按钮触摸修复已应用');
    }
    
    /**
     * 修复表情库交互
     */
    function fixEmojiLibrary() {
        const emojiLib = document.getElementById('emoji-library');
        if (!emojiLib) return;
        
        emojiLib.style.pointerEvents = 'auto';
        emojiLib.style.touchAction = 'pan-y';
        
        console.log('✅ 表情库触摸修复已应用');
    }
    
    /**
     * 点击外部关闭表情包库
     */
    function fixEmojiLibraryClose() {
        const handleEmojiClose = function(e) {
            const emojiLib = document.getElementById('emoji-library');
            const btnEmoji = document.getElementById('btn-emoji');
            
            if (emojiLib && emojiLib.classList.contains('show')) {
                // 检查是否点击在表情库外部
                if (!emojiLib.contains(e.target) &&
                    e.target !== btnEmoji &&
                    !btnEmoji.contains(e.target)) {
                    // 关闭表情库
                    emojiLib.classList.remove('show');
                    
                    // 恢复输入框和工具栏位置
                    const inputArea = document.querySelector('.chat-input-area');
                    const toolbar = document.getElementById('chat-toolbar');
                    if (inputArea) inputArea.style.transform = 'translateY(0)';
                    if (toolbar) toolbar.style.transform = 'translateY(0)';
                    
                    console.log('📱 点击外部关闭表情包库 (' + e.type + ')');
                }
            }
        };
        
        document.addEventListener('touchstart', handleEmojiClose, { passive: true });
        // 添加click事件作为后备
        document.addEventListener('click', handleEmojiClose);
        
        console.log('✅ 表情库外部关闭已应用');
    }
    
    /**
     * 修复更多按钮点击问题
     */
    function fixMoreButton() {
        const btnMore = document.getElementById('btn-more');
        if (!btnMore) return;
        
        // 确保按钮可以接收触摸事件
        btnMore.style.pointerEvents = 'auto';
        btnMore.style.touchAction = 'manipulation';
        btnMore.style.webkitTapHighlightColor = 'rgba(0,0,0,0.05)';
        
        // 添加触摸反馈
        btnMore.addEventListener('touchstart', function(e) {
            e.stopPropagation();
            this.style.opacity = '0.6';
            console.log('📱 更多按钮 touchstart');
        }, { passive: true });
        
        btnMore.addEventListener('touchend', function(e) {
            e.stopPropagation();
            this.style.opacity = '1';
            console.log('📱 更多按钮 touchend');
        }, { passive: true });
        
        btnMore.addEventListener('touchcancel', function() {
            this.style.opacity = '1';
        }, { passive: true });
        
        // 添加click事件作为后备方案（某些浏览器可能不触发touch事件）
        btnMore.addEventListener('click', function(e) {
            console.log('📱 更多按钮 click (后备)');
        });
        
        console.log('✅ 更多按钮触摸修复已应用');
    }
    
    /**
     * 点击外部关闭更多面板
     */
    function fixMorePanelClose() {
        // 使用touchstart和click双重监听，确保兼容性
        const handleOutsideClick = function(e) {
            const morePanel = document.getElementById('toolbar-more-panel');
            const btnMore = document.getElementById('btn-more');
            
            if (morePanel && morePanel.classList.contains('show')) {
                // 检查是否点击在更多面板外部
                if (!morePanel.contains(e.target) &&
                    e.target !== btnMore &&
                    !btnMore.contains(e.target)) {
                    // 关闭更多面板
                    if (window.QQToolbar && typeof window.QQToolbar.closeMorePanel === 'function') {
                        window.QQToolbar.closeMorePanel();
                        console.log('📱 点击外部关闭更多面板 (' + e.type + ')');
                    }
                }
            }
        };
        
        document.addEventListener('touchstart', handleOutsideClick, { passive: true });
        // 添加click事件作为后备（某些浏览器可能不触发touchstart）
        document.addEventListener('click', handleOutsideClick);
        
        console.log('✅ 更多面板外部关闭已应用');
    }
    
    /**
     * 防止iOS双击缩放
     */
    function preventDoubleTapZoom() {
        if (!isIOS) return;
        
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        console.log('✅ iOS双击缩放已禁用');
    }
    
    /**
     * 初始化所有修复
     */
    function init() {
        // 等待DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyFixes);
        } else {
            applyFixes();
        }
    }
    
    function applyFixes() {
        console.log('🔧 开始应用移动端触摸修复...');
        
        fixInputFocus();
        fixLongPress();
        fixLongPressMenuClose();
        fixToolbarButtons();
        fixSendButton();
        fixEmojiLibrary();
        fixEmojiLibraryClose();
        fixMoreButton();
        fixMorePanelClose();
        preventDoubleTapZoom();
        
        console.log('✅ 移动端触摸修复全部完成');
        
        // 监听聊天页面打开事件，重新应用修复
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const chatPage = document.getElementById('chat-page');
                    if (chatPage && chatPage.classList.contains('open')) {
                        console.log('🔄 聊天页面打开，重新应用修复');
                        setTimeout(() => {
                            fixInputFocus();
                            fixLongPress();
                            fixToolbarButtons();
                            fixSendButton();
                            fixEmojiLibrary();
                        }, 100);
                    }
                }
            });
        });
        
        const chatPage = document.getElementById('chat-page');
        if (chatPage) {
            observer.observe(chatPage, { attributes: true });
        }
    }
    
    // 启动修复
    init();
    
    // 导出供外部使用
    window.MobileTouchFix = {
        fixInputFocus,
        fixLongPress,
        fixLongPressMenuClose,
        fixToolbarButtons,
        fixSendButton,
        fixEmojiLibrary,
        fixEmojiLibraryClose,
        fixMoreButton,
        fixMorePanelClose,
        reapplyAll: applyFixes
    };
    
})();