/**
 * iOS Safari粘贴修复模块
 * 
 * 问题：iOS Safari浏览器中API设置页面的输入框无法粘贴内容
 * 原因：全局CSS设置了-webkit-user-select: none和-webkit-touch-callout: none
 * 解决：为输入框添加专门的CSS修复和JavaScript事件处理
 */

(function() {
    'use strict';
    
    /**
     * 修复iOS Safari输入框粘贴问题
     */
    function fixIOSPasteIssue() {
        // 检测是否为iOS设备
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (!isIOS) {
            console.log('🔍 非iOS设备，跳过粘贴修复');
            return;
        }
        
        console.log('🔧 检测到iOS设备，应用粘贴修复...');
        
        // API设置页面的输入框选择器
        const apiSettingsInputSelectors = [
            '#api-settings-page input[type="text"]',
            '#api-settings-page input[type="password"]',
            '#api-settings-page textarea',
            '#api-settings-page select',
            '.modern-input',
            '.modern-select'
        ];
        
        // 为所有匹配的输入框应用修复
        apiSettingsInputSelectors.forEach(selector => {
            const inputs = document.querySelectorAll(selector);
            inputs.forEach(input => {
                // 1. 强制设置CSS样式（优先级最高）
                input.style.setProperty('-webkit-user-select', 'text', 'important');
                input.style.setProperty('user-select', 'text', 'important');
                input.style.setProperty('-webkit-touch-callout', 'default', 'important');
                input.style.setProperty('touch-callout', 'default', 'important');
                
                // 2. 确保输入框可以接收焦点
                input.style.setProperty('-webkit-tap-highlight-color', 'rgba(0,0,0,0.1)', 'important');
                
                // 3. 添加粘贴事件监听器
                input.addEventListener('paste', function(e) {
                    console.log('📋 粘贴事件触发');
                    // 不阻止默认行为，让系统正常处理
                }, { passive: true });
                
                // 4. 添加长按事件处理（iOS需要长按才能显示粘贴菜单）
                let longPressTimer;
                const longPressDuration = 500; // 500ms长按
                
                input.addEventListener('touchstart', function(e) {
                    // 只处理单指触摸
                    if (e.touches.length === 1) {
                        longPressTimer = setTimeout(function() {
                            console.log('👆 长按检测，准备显示粘贴菜单');
                            // 长按时不阻止默认行为，让iOS显示原生菜单
                        }, longPressDuration);
                    }
                }, { passive: true });
                
                input.addEventListener('touchend', function(e) {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                });
                
                input.addEventListener('touchmove', function(e) {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                });
                
                // 5. 确保输入框的父元素不会阻止事件
                let parent = input.parentElement;
                while (parent && parent !== document.body) {
                    // 移除父元素上的事件阻止
                    parent.addEventListener('paste', function(e) {
                        // 不阻止冒泡
                    }, { capture: false, passive: true });
                    parent = parent.parentElement;
                }
                
                console.log('✅ 已修复输入框:', input.id || input.className);
            });
        });
        
        // 6. 额外修复：监听DOM变化，处理动态添加的输入框
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // 元素节点
                        // 检查新添加的节点是否是输入框或包含输入框
                        if (node.matches && node.matches(apiSettingsInputSelectors.join(', '))) {
                            console.log('🔄 检测到动态添加的输入框，应用修复');
                            // 重新应用修复
                            setTimeout(fixIOSPasteIssue, 100);
                        }
                        
                        // 检查子节点
                        const inputs = node.querySelectorAll ? node.querySelectorAll(apiSettingsInputSelectors.join(', ')) : [];
                        if (inputs.length > 0) {
                            console.log('🔄 检测到动态添加的输入框（子节点），应用修复');
                            // 重新应用修复
                            setTimeout(fixIOSPasteIssue, 100);
                        }
                    }
                });
            });
        });
        
        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ iOS粘贴修复已应用，共修复', 
                   document.querySelectorAll(apiSettingsInputSelectors.join(', ')).length, 
                   '个输入框');
    }
    
    // 页面加载完成后应用修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(fixIOSPasteIssue, 300);
        });
    } else {
        // 页面已加载完成
        setTimeout(fixIOSPasteIssue, 300);
    }
    
    // 监听API设置页面的显示
    const apiSettingsObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const apiSettingsPage = document.getElementById('api-settings-page');
                if (apiSettingsPage && apiSettingsPage.classList.contains('active')) {
                    console.log('🔄 API设置页面已显示，应用粘贴修复');
                    setTimeout(fixIOSPasteIssue, 100);
                }
            }
        });
    });
    
    const apiSettingsPage = document.getElementById('api-settings-page');
    if (apiSettingsPage) {
        apiSettingsObserver.observe(apiSettingsPage, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    console.log('🎯 iOS粘贴修复模块已加载');
})();