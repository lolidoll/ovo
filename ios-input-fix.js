/**
 * iOS Safari 聊天输入框修复模块
 * 
 * 问题：iOS Safari 上聊天输入框无法点击聚焦、键盘弹出时布局混乱
 * 解决方案：使用 Flex 内部滚动布局，不依赖 100vh
 */

(function() {
    'use strict';

    if (window.__UNIFIED_CHAT_LAYOUT__) {
        console.log('🔧 统一布局模式已启用，跳过旧版 ios-input-fix 逻辑');
        return;
    }
    
    // 检测是否为 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalonePWA = Boolean(
        window.navigator.standalone ||
        (window.matchMedia && (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches
        ))
    );
    
    if (!isIOS) {
        console.log('🔍 非iOS设备，跳过iOS输入框修复');
        return;
    }

    // iOS PWA 全屏已由统一适配器处理，避免重复注入内联布局导致输入框异常
    if (isStandalonePWA) {
        console.log('🔍 iOS PWA全屏模式，跳过旧版输入框修复逻辑');
        return;
    }
    
    console.log('🔧 检测到iOS设备，应用聊天输入框修复...');
    
    /**
     * 设置 Flex 布局，确保页面正确撑满
     */
    function setupFlexLayout() {
        // iOS PWA 全屏交给统一的 viewport 变量驱动，避免重复改根布局
        if (isStandalonePWA) {
            return;
        }

        // 设置 body 为 flex 容器
        document.body.style.setProperty('display', 'flex', 'important');
        document.body.style.setProperty('flex-direction', 'column', 'important');
        document.body.style.setProperty('height', '100%', 'important');
        document.body.style.setProperty('height', '-webkit-fill-available', 'important');
        document.body.style.setProperty('min-height', '100%', 'important');
        document.body.style.setProperty('position', 'relative', 'important');
        
        // 设置 html
        document.documentElement.style.setProperty('height', '100%', 'important');
        document.documentElement.style.setProperty('height', '-webkit-fill-available', 'important');
        
        console.log('✅ Flex 布局已设置');
    }

    /**
     * 修复iOS Safari输入框点击和键盘弹出问题
     */
    function fixIOSChatInput() {
        const chatInput = document.getElementById('chat-input');
        const inputArea = document.querySelector('.chat-input-area');
        const chatPage = document.getElementById('chat-page');
        const chatMessages = document.getElementById('chat-messages');
        const chatToolbar = document.getElementById('chat-toolbar');
        
        if (!chatInput) {
            console.log('⚠️ 聊天输入框未找到');
            return;
        }
        
        console.log('✅ 找到聊天输入框，开始修复...');
        
        // 1. 强制设置输入框样式
        chatInput.style.setProperty('-webkit-user-select', 'text', 'important');
        chatInput.style.setProperty('user-select', 'text', 'important');
        chatInput.style.setProperty('-webkit-touch-callout', 'default', 'important');
        chatInput.style.setProperty('touch-callout', 'default', 'important');
        chatInput.style.setProperty('pointer-events', 'auto', 'important');
        chatInput.style.setProperty('touch-action', 'manipulation', 'important');
        chatInput.style.setProperty('font-size', '16px', 'important');
        
        // 2. 修复输入区域样式
        if (inputArea) {
            inputArea.style.setProperty('pointer-events', 'auto', 'important');
            inputArea.style.setProperty('touch-action', 'manipulation', 'important');
            inputArea.style.setProperty('position', 'relative', 'important');
            inputArea.style.setProperty('bottom', 'auto', 'important');
        }
        
        // 3. 修复聊天页面布局
        if (chatPage) {
            chatPage.style.setProperty('display', 'flex', 'important');
            chatPage.style.setProperty('flex-direction', 'column', 'important');
            chatPage.style.setProperty('position', 'absolute', 'important');
            chatPage.style.setProperty('top', '0', 'important');
            chatPage.style.setProperty('left', '0', 'important');
            chatPage.style.setProperty('right', '0', 'important');
            chatPage.style.setProperty('bottom', '0', 'important');

            if (isStandalonePWA) {
                chatPage.style.setProperty('height', 'var(--app-height, 100dvh)', 'important');
                chatPage.style.setProperty('max-height', 'var(--app-height, 100dvh)', 'important');
            } else {
                chatPage.style.setProperty('height', '100%', 'important');
                chatPage.style.setProperty('height', '-webkit-fill-available', 'important');
            }
        }
        
        // 4. 修复消息区域
        if (chatMessages) {
            chatMessages.style.setProperty('flex', '1', 'important');
            chatMessages.style.setProperty('min-height', '0', 'important');
            chatMessages.style.setProperty('overflow-y', 'auto', 'important');
            chatMessages.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
        }
        
        // 5. 修复工具栏
        if (chatToolbar) {
            chatToolbar.style.setProperty('flex-shrink', '0', 'important');
            chatToolbar.style.setProperty('position', 'relative', 'important');
            chatToolbar.style.setProperty('bottom', 'auto', 'important');
        }
        
        // 6. 移除可能阻止事件的父元素样式
        let parent = chatInput.parentElement;
        while (parent && parent !== document.body) {
            parent.style.setProperty('-webkit-touch-callout', 'default', 'important');
            parent.style.setProperty('pointer-events', 'auto', 'important');
            parent = parent.parentElement;
        }
        
        // 7. iOS特殊处理：确保输入框可以被聚焦
        let lastTouchTime = 0;
        
        // 触摸开始 - 记录时间
        chatInput.addEventListener('touchstart', function(e) {
            lastTouchTime = Date.now();
            console.log('📱 输入框 touchstart');
        }, { passive: true });
        
        // 触摸结束
        chatInput.addEventListener('touchend', function(e) {
            const touchDuration = Date.now() - lastTouchTime;
            console.log('📱 输入框 touchend, 耗时:', touchDuration);
            
            // 如果是短触摸（小于300ms），手动触发聚焦
            if (touchDuration < 300) {
                setTimeout(() => {
                    chatInput.focus();
                }, 50);
            }
        }, { passive: true });
        
        // 点击事件作为后备
        chatInput.addEventListener('click', function(e) {
            console.log('📱 输入框 click');
            setTimeout(() => {
                chatInput.focus();
            }, 10);
        });
        
        // 8. 处理键盘弹出/收起
        let originalVisualViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        
        // 聚焦事件 - 键盘弹出
        chatInput.addEventListener('focus', function(e) {
            console.log('📱 输入框 focus - 键盘弹出');
            
            // 设置聊天页面样式，防止布局跳动
            if (chatPage) {
                chatPage.style.setProperty('position', 'absolute', 'important');
                chatPage.style.setProperty('top', '0', 'important');
                chatPage.style.setProperty('left', '0', 'important');
                chatPage.style.setProperty('right', '0', 'important');
                chatPage.style.setProperty('bottom', '0', 'important');
            }
            
            // 确保工具栏不被推到顶部
            if (chatToolbar) {
                chatToolbar.style.setProperty('position', 'relative', 'important');
                chatToolbar.style.setProperty('bottom', 'auto', 'important');
                chatToolbar.style.setProperty('transform', 'none', 'important');
            }
            
            // 滚动到输入框
            setTimeout(() => {
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 300);
        });
        
        // 失焦事件 - 键盘收起
        chatInput.addEventListener('blur', function(e) {
            console.log('📱 输入框 blur - 键盘收起');
            
            // 恢复布局
            setTimeout(() => {
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 100);
        });
        
        // 9. 监听 visualViewport 变化（iOS 13+）
        if (window.visualViewport && !isStandalonePWA) {
            window.visualViewport.addEventListener('resize', function() {
                const newHeight = window.visualViewport.height;
                console.log('📱 visualViewport 变化:', newHeight);
                
                // 键盘弹出时，确保工具栏在可视区域内
                if (chatPage && chatToolbar) {
                    const heightDiff = originalVisualViewportHeight - newHeight;
                    
                    // 如果高度差超过150px，认为是键盘弹出了
                    if (heightDiff > 150) {
                        console.log('📱 键盘已弹出');
                        chatPage.style.setProperty('height', newHeight + 'px', 'important');
                    } else {
                        console.log('📱 键盘已收起');
                        chatPage.style.removeProperty('height');
                    }
                }
            });
        }
        
        console.log('✅ iOS聊天输入框修复完成');
    }
    
    /**
     * 初始化修复
     */
    function init() {
        // 设置 Flex 布局
        setupFlexLayout();
        
        // DOM加载完成后执行修复
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                fixIOSChatInput();
            });
        } else {
            fixIOSChatInput();
        }
        
        // 监听DOM变化，确保动态添加的输入框也被修复
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        // 检查是否添加了聊天输入框或聊天页面
                        if (node.id === 'chat-input' || 
                            node.id === 'chat-page' ||
                            (node.querySelector && (
                                node.querySelector('#chat-input') ||
                                node.querySelector('#chat-page')
                            ))) {
                            console.log('🔄 检测到动态添加的聊天相关元素');
                            setupFlexLayout();
                            setTimeout(fixIOSChatInput, 100);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 执行初始化
    init();
    
    // 导出到全局，方便调试
    window.fixIOSChatInput = fixIOSChatInput;
    window.setupFlexLayout = setupFlexLayout;
    
})();
