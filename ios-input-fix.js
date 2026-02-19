/**
 * iOS Safari 聊天输入框修复模块
 * 
 * 问题：iOS Safari 上聊天输入框无法点击聚焦
 * 原因：
 * 1. 全局 CSS 的 user-select: none 干扰
 * 2. 事件冒泡被阻止
 * 3. iOS Safari 特有的触摸事件处理机制
 */

(function() {
    'use strict';
    
    // 检测是否为 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (!isIOS) {
        console.log('🔍 非iOS设备，跳过iOS输入框修复');
        return;
    }
    
    console.log('🔧 检测到iOS设备，应用聊天输入框修复...');
    
    /**
     * 修复iOS Safari输入框点击问题
     */
    function fixIOSChatInput() {
        const chatInput = document.getElementById('chat-input');
        const inputArea = document.querySelector('.chat-input-area');
        
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
        
        // 2. 修复输入区域样式
        if (inputArea) {
            inputArea.style.setProperty('pointer-events', 'auto', 'important');
            inputArea.style.setProperty('touch-action', 'manipulation', 'important');
        }
        
        // 3. 移除可能阻止事件的父元素样式
        let parent = chatInput.parentElement;
        while (parent && parent !== document.body) {
            parent.style.setProperty('-webkit-touch-callout', 'default', 'important');
            parent.style.setProperty('pointer-events', 'auto', 'important');
            parent = parent.parentElement;
        }
        
        // 4. iOS特殊处理：确保输入框可以被聚焦
        let lastTouchTime = 0;
        
        // 触摸开始 - 记录时间
        chatInput.addEventListener('touchstart', function(e) {
            lastTouchTime = Date.now();
            // 不阻止事件冒泡，让iOS正常处理
            console.log('📱 输入框 touchstart');
        }, { passive: true });
        
        // 触摸结束
        chatInput.addEventListener('touchend', function(e) {
            const touchDuration = Date.now() - lastTouchTime;
            console.log('📱 输入框 touchend, 耗时:', touchDuration);
            
            // 如果是短触摸（小于300ms），手动触发聚焦
            if (touchDuration < 300) {
                // 延迟一点确保touchend事件完成
                setTimeout(() => {
                    chatInput.focus();
                }, 50);
            }
        }, { passive: true });
        
        // 点击事件作为后备
        chatInput.addEventListener('click', function(e) {
            console.log('📱 输入框 click');
            // 不阻止事件冒泡
            setTimeout(() => {
                chatInput.focus();
            }, 10);
        });
        
        // 聚焦事件 - 确保输入框获得焦点
        chatInput.addEventListener('focus', function(e) {
            console.log('📱 输入框 focus');
            // 确保输入框在聚焦时可见
            chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        // 5. 处理iOS虚拟键盘弹出问题
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        chatInput.scrollIntoView = function() {
            try {
                originalScrollIntoView.call(this, {
                    behavior: 'smooth',
                    block: 'center'
                });
            } catch (e) {
                // 如果smooth不支持，使用instant
                try {
                    originalScrollIntoView.call(this, true);
                } catch (e2) {
                    console.log('⚠️ scrollIntoView 失败');
                }
            }
        };
        
        // 6. 处理iOS Safari的输入法问题
        chatInput.addEventListener('blur', function(e) {
            console.log('📱 输入框 blur');
            // 保存当前滚动位置
            const scrollY = window.scrollY;
            setTimeout(() => {
                window.scrollTo(0, scrollY);
            }, 100);
        });
        
        console.log('✅ iOS聊天输入框修复完成');
    }
    
    /**
     * 初始化修复
     */
    function init() {
        // DOM加载完成后执行修复
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fixIOSChatInput);
        } else {
            fixIOSChatInput();
        }
        
        // 监听DOM变化，确保动态添加的输入框也被修复
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        // 检查是否添加了聊天输入框
                        if (node.id === 'chat-input' || node.querySelector && node.querySelector('#chat-input')) {
                            console.log('🔄 检测到动态添加的聊天输入框');
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
    
})();
