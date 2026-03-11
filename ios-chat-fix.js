/**
 * iOS 聊天页面修复模块
 * 
 * 修复问题：
 * 1. 返回按钮点击区域太小，在iOS上点不动
 * 2. 底部工具栏太靠下，显示不完整
 * 3. 考虑iOS安全区域（Safe Area）
 * 4. 键盘弹出时输入框和工具栏布局问题（使用 Flex 内部滚动）
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
        
        // 1. 不再用按钮盒子撑大间距，保持标题紧贴返回箭头SVG
        backBtn.style.setProperty('min-width', '14px', 'important');
        backBtn.style.setProperty('width', '14px', 'important');
        backBtn.style.setProperty('min-height', '14px', 'important');
        backBtn.style.setProperty('padding', '0', 'important');
        backBtn.style.setProperty('margin', '0 2px 0 10px', 'important');
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
     * 修复底部工具栏位置和显示问题 - 使用 Flex 布局适配键盘弹出
     */
    function fixToolbar() {
        const toolbar = document.getElementById('chat-toolbar');
        const inputArea = document.querySelector('.chat-input-area');
        const chatPage = document.getElementById('chat-page');
        const chatMessages = document.getElementById('chat-messages');
        
        if (!toolbar) {
            console.log('⚠️ 工具栏未找到');
            return;
        }
        
        console.log('✅ 修复底部工具栏...');
        
        // 1. 设置聊天页面为 Flex 列布局
        if (chatPage) {
            chatPage.style.setProperty('display', 'flex', 'important');
            chatPage.style.setProperty('flex-direction', 'column', 'important');
            chatPage.style.setProperty('position', 'absolute', 'important');
            chatPage.style.setProperty('top', '0', 'important');
            chatPage.style.setProperty('left', '0', 'important');
            chatPage.style.setProperty('right', '0', 'important');
            chatPage.style.setProperty('bottom', '0', 'important');
            chatPage.style.setProperty('height', '100%', 'important');
            chatPage.style.setProperty('height', '-webkit-fill-available', 'important');
            chatPage.style.setProperty('overflow', 'hidden', 'important');
        }
        
        // 2. 设置消息区域为可滚动
        if (chatMessages) {
            chatMessages.style.setProperty('flex', '1', 'important');
            chatMessages.style.setProperty('min-height', '0', 'important');
            chatMessages.style.setProperty('overflow-y', 'auto', 'important');
            chatMessages.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
        }
        
        // 3. 设置输入区域和工具栏为固定高度（不随键盘移动）
        if (inputArea) {
            inputArea.style.setProperty('flex-shrink', '0', 'important');
            inputArea.style.setProperty('position', 'relative', 'important');
            inputArea.style.setProperty('bottom', 'auto', 'important');
        }
        
        // 4. 设置工具栏为固定高度
        toolbar.style.setProperty('flex-shrink', '0', 'important');
        toolbar.style.setProperty('position', 'relative', 'important');
        toolbar.style.setProperty('bottom', 'auto', 'important');
        toolbar.style.setProperty('min-height', '44px', 'important');
        toolbar.style.setProperty('height', 'auto', 'important');
        toolbar.style.setProperty('padding', '2px 0', 'important');
        
        // 5. 底部间距收敛：安全区由页面统一处理，避免输入区和工具栏重复叠加
        toolbar.style.setProperty('padding-bottom', '0px', 'important');
        
        // 6. 确保工具栏按钮可以被点击
        toolbar.style.setProperty('pointer-events', 'auto', 'important');
        toolbar.style.setProperty('touch-action', 'manipulation', 'important');
        
        // 7. 修复工具栏按钮的点击区域
        const buttons = toolbar.querySelectorAll('.tb-btn');
        buttons.forEach(btn => {
            btn.style.setProperty('min-height', '44px', 'important');
            btn.style.setProperty('min-width', '44px', 'important');
            btn.style.setProperty('padding', '8px', 'important');
            btn.style.setProperty('pointer-events', 'auto', 'important');
            btn.style.setProperty('touch-action', 'manipulation', 'important');
            btn.style.setProperty('-webkit-tap-highlight-color', 'rgba(0,0,0,0.05)', 'important');
        });
        
        // 8. 修复输入区域
        if (inputArea) {
            inputArea.style.setProperty('padding-bottom', '2px', 'important');
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
