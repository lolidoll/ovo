/**
 * iOS Safari粘贴修复模块
 * 
 * 问题：iOS Safari浏览器中设置与配置页面的输入框无法粘贴内容
 * 原因：全局CSS设置了-webkit-user-select: none和-webkit-touch-callout: none
 * 解决：为输入框添加专门的CSS修复和JavaScript事件处理
 */

(function() {
    'use strict';

    const API_SETTINGS_INPUT_SELECTORS = [
        '#api-settings-page input[type="text"]',
        '#api-settings-page input[type="password"]',
        '#api-settings-page textarea',
        '#api-settings-page select',
        '.modern-input',
        '.modern-select'
    ];

    const IOS_GUARD_EVENTS = [
        'touchstart',
        'touchend',
        'touchmove',
        'touchcancel',
        'contextmenu',
        'copy',
        'cut',
        'paste'
    ];

    function isIOSDevice() {
        const ua = navigator.userAgent || '';
        const isAppleTouch = /iPad|iPhone|iPod/.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return isAppleTouch && !window.MSStream;
    }

    function attachPasteGuards(input) {
        if (!input || input.dataset.iosPasteGuard === '1') return;

        input.dataset.iosPasteGuard = '1';

        IOS_GUARD_EVENTS.forEach(eventName => {
            const options = eventName.startsWith('touch')
                ? { passive: true, capture: true }
                : { capture: true };

            input.addEventListener(eventName, function(e) {
                e.stopPropagation();
            }, options);
        });
    }

    function relaxAncestorRestrictions(input) {
        let parent = input.parentElement;
        while (parent && parent !== document.body) {
            parent.style.setProperty('-webkit-touch-callout', 'default', 'important');
            parent.style.setProperty('touch-callout', 'default', 'important');
            parent.style.setProperty('-webkit-user-select', 'text', 'important');
            parent.style.setProperty('user-select', 'text', 'important');
            if (parent.id === 'api-settings-page') {
                break;
            }
            parent = parent.parentElement;
        }
    }
    
    /**
     * 修复iOS Safari输入框粘贴问题
     */
    function fixIOSPasteIssue() {
        // 检测是否为iOS设备
        const isIOS = isIOSDevice();
        
        if (!isIOS) {
            console.log('🔍 非iOS设备，跳过粘贴修复');
            return;
        }
        
        console.log('🔧 检测到iOS设备，应用粘贴修复...');
        
        // 为所有匹配的输入框应用修复
        const inputs = document.querySelectorAll(API_SETTINGS_INPUT_SELECTORS.join(', '));
        inputs.forEach(applyInputFix);
        
        // 6. 额外修复：监听DOM变化，处理动态添加的输入框
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // 元素节点
                        // 检查新添加的节点是否是输入框
                        if (node.matches && node.matches(API_SETTINGS_INPUT_SELECTORS.join(', '))) {
                            console.log('🔄 检测到动态添加的输入框，应用修复');
                            // 直接应用修复，不递归调用整个函数
                            applyInputFix(node);
                        }
                        
                        // 检查子节点
                        const inputs = node.querySelectorAll ? node.querySelectorAll(API_SETTINGS_INPUT_SELECTORS.join(', ')) : [];
                        if (inputs.length > 0) {
                            console.log('🔄 检测到动态添加的输入框（子节点），应用修复');
                            inputs.forEach(applyInputFix);
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
                   document.querySelectorAll(API_SETTINGS_INPUT_SELECTORS.join(', ')).length,
                   '个输入框');
    }
    
    /**
     * 对单个输入框应用修复（避免递归调用）
     */
    function applyInputFix(input) {
        const isIOS = isIOSDevice();
        if (!isIOS) return;
        if (!input || input.dataset.iosPasteFixed === '1') return;

        input.dataset.iosPasteFixed = '1';
        
        // 强制设置CSS样式
        input.style.setProperty('-webkit-user-select', 'text', 'important');
        input.style.setProperty('user-select', 'text', 'important');
        input.style.setProperty('-webkit-touch-callout', 'default', 'important');
        input.style.setProperty('touch-callout', 'default', 'important');
        input.style.setProperty('-webkit-tap-highlight-color', 'rgba(0,0,0,0.1)', 'important');
        input.style.setProperty('touch-action', 'auto', 'important');
        input.style.setProperty('pointer-events', 'auto', 'important');
        
        // 强制设置输入框的只读属性为false
        if (input.hasAttribute('readonly')) {
            input.removeAttribute('readonly');
        }
        input.readOnly = false;
        if (input.hasAttribute('disabled')) {
            input.removeAttribute('disabled');
        }
        input.disabled = false;

        attachPasteGuards(input);
        
        // 确保父元素不会阻止事件
        relaxAncestorRestrictions(input);
        
        console.log('✅ 单个输入框修复完成:', input.id || input.className || '无ID');
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
    
    // 监听设置与配置页面的显示
    const apiSettingsObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const apiSettingsPage = document.getElementById('api-settings-page');
                if (apiSettingsPage && (apiSettingsPage.classList.contains('open') || apiSettingsPage.classList.contains('active'))) {
                    console.log('🔄 设置与配置页面已显示，应用粘贴修复');
                    // 使用新的函数应用修复
                    setTimeout(function() {
                        const inputs = apiSettingsPage.querySelectorAll(API_SETTINGS_INPUT_SELECTORS.join(', '));
                        inputs.forEach(applyInputFix);
                        console.log('✅ 设置与配置页面输入框修复完成，共', inputs.length, '个');
                    }, 100);
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