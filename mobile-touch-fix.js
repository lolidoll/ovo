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
     * 注意：iOS设备由ios-input-fix.js处理，此处跳过
     */
    function fixInputFocus() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        // iOS设备由专用模块处理，跳过此处修复避免冲突
        if (isIOS) {
            console.log('📱 iOS设备输入框由ios-input-fix.js处理，跳过mobile-touch-fix修复');
            return;
        }
        
        // 确保输入框可以接收触摸事件
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.touchAction = 'manipulation';
        
        // 添加触摸事件监听，确保点击能触发聚焦
        // 注意：不使用stopPropagation，避免干扰正常事件流
        chatInput.addEventListener('touchstart', function(e) {
            this.focus();
        }, { passive: true });
        
        // 添加click事件作为后备方案（某些浏览器可能不触发touchstart）
        chatInput.addEventListener('click', function(e) {
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
        let longPressTriggered = false;
        
        // 使用事件委托处理所有消息气泡（包括普通消息和撤回消息）
        chatMessages.addEventListener('touchstart', function(e) {
            // 查找最近的消息气泡（包括普通消息和撤回消息）
            targetBubble = e.target.closest('.chat-bubble, .retracted-message-wrapper');
            if (!targetBubble) return;
            
            // 记录起始位置
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
            longPressTriggered = false;
            
            // 检查是否在多选模式
            if (window.AppState && window.AppState.isSelectMode) {
                // 多选模式下不设置长按定时器
                return;
            }
            
            // 设置长按定时器（500ms）
            longPressTimer = setTimeout(() => {
                if (!touchMoved && targetBubble) {
                    longPressTriggered = true;
                    // 触发长按事件
                    console.log('📱 长按消息气泡触发');
                    
                    // 防止系统自动选择文本
                    if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                    }
                    
                    // 获取消息ID
                    const msgId = targetBubble.dataset.msgId || targetBubble.dataset.messageId;
                    
                    // 查找消息对象
                    if (window.showMessageContextMenu && typeof window.showMessageContextMenu === 'function' && msgId) {
                        // 从AppState中查找消息
                        const messages = window.AppState?.messages?.[window.AppState?.currentChat?.id] || [];
                        const msg = messages.find(m => m.id === msgId);
                        if (msg) {
                            window.showMessageContextMenu(msg, null, targetBubble);
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
            if (!targetBubble) return;
            
            // 检查是否在多选模式
            const isSelectMode = window.AppState && window.AppState.isSelectMode;
            
            // 清理长按定时器
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            // 如果是长按触发，阻止默认行为
            if (longPressTriggered) {
                e.preventDefault();
                e.stopPropagation();
            } else if (isSelectMode && !touchMoved) {
                // 多选模式下，短按时手动触发选择逻辑
                e.preventDefault();
                const msgId = targetBubble.dataset.msgId || targetBubble.dataset.messageId;
                if (msgId && window.toggleMessageSelection && typeof window.toggleMessageSelection === 'function') {
                    console.log('📱 多选模式下点击消息:', msgId);
                    window.toggleMessageSelection(msgId);
                    // 震动反馈
                    if (navigator.vibrate) {
                        navigator.vibrate(30);
                    }
                }
            }
            
            longPressTriggered = false;
            targetBubble = null;
        }, { passive: false });
        
        chatMessages.addEventListener('touchcancel', function(e) {
            if (!targetBubble) return;
            
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            longPressTriggered = false;
            targetBubble = null;
        }, { passive: true });
        
        console.log('✅ 长按消息气泡修复已应用（支持多选模式）');
    }
    
    /**
     * 点击外部关闭长按菜单
     */
    function fixLongPressMenuClose() {
        const handleMenuClose = function(e) {
            // 查找长按菜单元素
            const contextMenu = document.querySelector('.message-context-menu');
            if (!contextMenu) return;
            
            // 检查是否在多选模式下点击消息气泡
            if (window.AppState && window.AppState.isSelectMode) {
                const bubble = e.target.closest('.chat-bubble, .retracted-message-wrapper');
                if (bubble) {
                    // 多选模式下点击消息气泡，不关闭菜单（因为菜单应该已经关闭了）
                    return;
                }
            }
            
            // 检查是否点击在菜单外部
            if (!contextMenu.contains(e.target) && !e.target.closest('.chat-bubble')) {
                // 关闭菜单
                contextMenu.remove();
                console.log('📱 点击外部关闭长按菜单 (' + e.type + ')');
            }
        };
        
        // 使用 touchstart 而不是 click，避免干扰多选模式的点击事件
        document.addEventListener('touchstart', handleMenuClose, { passive: true });
        
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
     * 修复多选工具栏按钮点击问题
     */
    function fixMultiSelectToolbar() {
        const toolbar = document.getElementById('msg-multi-select-toolbar');
        if (!toolbar) return;
        
        const buttons = toolbar.querySelectorAll('button');
        buttons.forEach(btn => {
            // 确保按钮可以接收触摸事件
            btn.style.pointerEvents = 'auto';
            btn.style.touchAction = 'manipulation';
            btn.style.webkitTapHighlightColor = 'rgba(0,0,0,0.05)';
            btn.style.userSelect = 'none';
            btn.style.webkitUserSelect = 'none';
            btn.style.cursor = 'pointer';
            
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
        
        console.log(`✅ 多选工具栏按钮触摸修复已应用 (${buttons.length}个按钮)`);
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
        
        // 使用 touchstart 而不是 click，避免干扰多选模式的点击事件
        document.addEventListener('touchstart', handleEmojiClose, { passive: true });
        
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
        
        // 使用 touchstart 而不是 click，避免干扰多选模式的点击事件
        document.addEventListener('touchstart', handleOutsideClick, { passive: true });
        
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
            
            // 检查是否在多选模式下
            if (window.AppState && window.AppState.isSelectMode) {
                // 多选模式下，完全禁用双击缩放防护，让所有点击正常触发
                return;
            }
            
            // 检查是否在多选工具栏上点击
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar && toolbar.contains(e.target)) {
                // 多选工具栏上，不阻止默认行为
                return;
            }
            
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        console.log('✅ iOS双击缩放已禁用（多选模式下保留点击功能）');
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
        fixMultiSelectToolbar();
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
                            fixMultiSelectToolbar();
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
        
        // 监听多选工具栏的动态添加
        const toolbarObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.id === 'msg-multi-select-toolbar') {
                        console.log('🔄 多选工具栏添加，应用触摸修复');
                        fixMultiSelectToolbar();
                    }
                });
            });
        });
        
        // 监听body的变化以检测动态添加的多选工具栏
        toolbarObserver.observe(document.body, { childList: true });
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
        fixMultiSelectToolbar,
        fixEmojiLibrary,
        fixEmojiLibraryClose,
        fixMoreButton,
        fixMorePanelClose,
        reapplyAll: applyFixes
    };
    
})();