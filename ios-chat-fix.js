/**
 * iOS 聊天页面修复模块
 * 
 * 修复问题：
 * 1. 返回按钮点击区域太小，在iOS上点不动
 * 2. 底部工具栏太靠下，显示不完整
 * 3. 考虑iOS安全区域（Safe Area）
 */

(function() {
    'use strict';
    
    // 检测是否为 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (!isIOS) {
        console.log('🔍 非iOS设备，跳过iOS聊天页面修复');
        return;
    }
    
    console.log('🔧 检测到iOS设备，应用聊天页面修复...');
    
    /**
     * 修复返回按钮点击问题
     */
    function fixBackButton() {
        const backBtn = document.getElementById('chat-back-btn');
        
        if (!backBtn) {
            console.log('⚠️ 返回按钮未找到');
            return;
        }
        
        console.log('✅ 修复返回按钮...');
        
        // 1. 扩大点击区域 - 增加padding和最小尺寸
        backBtn.style.setProperty('min-width', '50px', 'important');
        backBtn.style.setProperty('min-height', '50px', 'important');
        backBtn.style.setProperty('padding', '12px', 'important');
        backBtn.style.setProperty('display', 'flex', 'important');
        backBtn.style.setProperty('align-items', 'center', 'important');
        backBtn.style.setProperty('justify-content', 'center', 'important');
        
        // 2. 确保按钮可以被点击
        backBtn.style.setProperty('pointer-events', 'auto', 'important');
        backBtn.style.setProperty('touch-action', 'manipulation', 'important');
        backBtn.style.setProperty('cursor', 'pointer', 'important');
        
        // 3. 移除可能影响点击的样式
        backBtn.style.setProperty('-webkit-user-select', 'none', 'important');
        backBtn.style.setProperty('user-select', 'none', 'important');
        backBtn.style.setProperty('-webkit-touch-callout', 'none', 'important');
        
        // 4. 添加视觉反馈
        backBtn.style.setProperty('-webkit-tap-highlight-color', 'rgba(0,0,0,0.1)', 'important');
        
        // 5. 确保返回箭头也可以被点击
        const backArrow = backBtn.querySelector('.back-arrow');
        if (backArrow) {
            backArrow.style.setProperty('pointer-events', 'none', 'important');
        }
        
        // 6. 添加触摸事件处理
        backBtn.addEventListener('touchstart', function(e) {
            console.log('📱 返回按钮 touchstart');
            backBtn.style.opacity = '0.6';
        }, { passive: true });
        
        backBtn.addEventListener('touchend', function(e) {
            console.log('📱 返回按钮 touchend');
            backBtn.style.opacity = '1';
        }, { passive: true });
        
        // 7. 确保点击事件能正常触发
        backBtn.addEventListener('click', function(e) {
            console.log('📱 返回按钮被点击');
            e.preventDefault();
            e.stopPropagation();
        });
        
        console.log('✅ 返回按钮修复完成');
    }
    
    /**
     * 修复底部工具栏位置和显示问题
     */
    function fixToolbar() {
        const toolbar = document.getElementById('chat-toolbar');
        const inputArea = document.querySelector('.chat-input-area');
        const chatPage = document.getElementById('chat-page');
        
        if (!toolbar) {
            console.log('⚠️ 工具栏未找到');
            return;
        }
        
        console.log('✅ 修复底部工具栏...');
        
        // 1. 确保工具栏有足够的高度
        toolbar.style.setProperty('min-height', '44px', 'important');
        toolbar.style.setProperty('height', 'auto', 'important');
        toolbar.style.setProperty('padding', '8px 0', 'important');
        
        // 2. 添加iOS安全区域支持
        // 在iOS 11+上，使用safe-area-inset-bottom来处理底部安全区域
        const safeAreaBottom = 'max(8px, env(safe-area-inset-bottom))';
        toolbar.style.setProperty('padding-bottom', `calc(8px + env(safe-area-inset-bottom, 0px))`, 'important');
        
        // 3. 确保工具栏按钮可以被点击
        toolbar.style.setProperty('pointer-events', 'auto', 'important');
        toolbar.style.setProperty('touch-action', 'manipulation', 'important');
        
        // 4. 修复工具栏按钮的点击区域
        const buttons = toolbar.querySelectorAll('.tb-btn');
        buttons.forEach(btn => {
            btn.style.setProperty('min-height', '44px', 'important');
            btn.style.setProperty('min-width', '44px', 'important');
            btn.style.setProperty('padding', '8px', 'important');
            btn.style.setProperty('pointer-events', 'auto', 'important');
            btn.style.setProperty('touch-action', 'manipulation', 'important');
            btn.style.setProperty('-webkit-tap-highlight-color', 'rgba(0,0,0,0.05)', 'important');
        });
        
        // 5. 修复输入区域
        if (inputArea) {
            inputArea.style.setProperty('padding-bottom', `calc(8px + env(safe-area-inset-bottom, 0px))`, 'important');
        }
        
        // 6. 修复聊天页面的底部padding
        if (chatPage) {
            // 确保聊天页面有足够的底部空间
            const computedStyle = window.getComputedStyle(chatPage);
            const currentPaddingBottom = computedStyle.paddingBottom;
            chatPage.style.setProperty('padding-bottom', `max(${currentPaddingBottom}, env(safe-area-inset-bottom, 0px))`, 'important');
        }
        
        console.log('✅ 底部工具栏修复完成');
    }
    
    /**
     * 修复聊天导航栏
     */
    function fixNavBar() {
        const navBar = document.querySelector('.chat-nav');
        
        if (!navBar) {
            console.log('⚠️ 导航栏未找到');
            return;
        }
        
        console.log('✅ 修复导航栏...');
        
        // 1. 添加iOS安全区域支持 - 顶部
        navBar.style.setProperty('padding-top', `max(0px, env(safe-area-inset-top, 0px))`, 'important');
        
        // 2. 确保导航栏有足够的高度
        navBar.style.setProperty('min-height', '44px', 'important');
        
        // 3. 确保导航栏按钮可以被点击
        const navButtons = navBar.querySelectorAll('button');
        navButtons.forEach(btn => {
            btn.style.setProperty('min-height', '44px', 'important');
            btn.style.setProperty('min-width', '44px', 'important');
            btn.style.setProperty('pointer-events', 'auto', 'important');
            btn.style.setProperty('touch-action', 'manipulation', 'important');
        });
        
        console.log('✅ 导航栏修复完成');
    }
    
    /**
     * 修复更多功能面板
     */
    function fixMorePanel() {
        const morePanel = document.getElementById('toolbar-more-panel');
        
        if (!morePanel) {
            console.log('⚠️ 更多功能面板未找到');
            return;
        }
        
        console.log('✅ 修复更多功能面板...');
        
        // 1. 添加iOS安全区域支持 - 底部
        morePanel.style.setProperty('padding-bottom', `env(safe-area-inset-bottom, 0px)`, 'important');
        
        // 2. 确保面板有足够的最大高度
        morePanel.style.setProperty('max-height', 'calc(70vh - env(safe-area-inset-bottom, 0px))', 'important');
        
        console.log('✅ 更多功能面板修复完成');
    }
    
    /**
     * 初始化修复
     */
    function init() {
        // DOM加载完成后执行修复
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                fixBackButton();
                fixToolbar();
                fixNavBar();
                fixMorePanel();
            });
        } else {
            fixBackButton();
            fixToolbar();
            fixNavBar();
            fixMorePanel();
        }
        
        // 监听DOM变化，确保动态添加的元素也被修复
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        // 检查是否添加了聊天页面相关元素
                        if (node.id === 'chat-page' || 
                            node.id === 'chat-back-btn' || 
                            node.id === 'chat-toolbar' ||
                            node.querySelector && (
                                node.querySelector('#chat-page') ||
                                node.querySelector('#chat-back-btn') ||
                                node.querySelector('#chat-toolbar')
                            )) {
                            console.log('🔄 检测到动态添加的聊天页面元素');
                            setTimeout(function() {
                                fixBackButton();
                                fixToolbar();
                                fixNavBar();
                                fixMorePanel();
                            }, 100);
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
    
    // 初始化
    init();
    
    console.log('✅ iOS聊天页面修复模块加载完成');
})();
