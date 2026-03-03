/**
 * 消息背景功能诊断脚本
 * 用于诊断消息背景功能的加载和运行问题
 */

const MessageBackgroundDiagnostics = {
    // 诊断所有问题
    diagnose() {
        console.log('='.repeat(60));
        console.log('📋 消息背景功能诊断开始');
        console.log('='.repeat(60));
        
        // 1. 检查管理器是否加载
        this.checkManager();
        
        // 2. 检查 UI 是否加载
        this.checkUI();
        
        // 3. 检查 DOM 元素
        this.checkDOM();
        
        // 4. 检查事件绑定
        this.checkEventBinding();
        
        // 5. 测试功能
        this.testFunctionality();
        
        console.log('='.repeat(60));
        console.log('✅ 诊断完成');
        console.log('='.repeat(60));
    },
    
    // 检查管理器
    checkManager() {
        console.log('\n📦 检查 MessageBackgroundManager');
        if (window.MessageBackgroundManager) {
            console.log('✅ MessageBackgroundManager 已加载');
            console.log('   - db:', window.MessageBackgroundManager.db ? '✅' : '❌');
            console.log('   - backgroundImages 长度:', window.MessageBackgroundManager.backgroundImages.length);
            console.log('   - currentBackgroundId:', window.MessageBackgroundManager.currentBackgroundId);
        } else {
            console.error('❌ MessageBackgroundManager 未加载');
        }
    },
    
    // 检查 UI
    checkUI() {
        console.log('\n🎨 检查 MessageBackgroundManagerUI');
        if (window.MessageBackgroundManagerUI) {
            console.log('✅ MessageBackgroundManagerUI 已加载');
            console.log('   - open 方法:', typeof window.MessageBackgroundManagerUI.open);
            console.log('   - bindEvents 方法:', typeof window.MessageBackgroundManagerUI.bindEvents);
        } else {
            console.error('❌ MessageBackgroundManagerUI 未加载');
        }
    },
    
    // 检查 DOM 元素
    checkDOM() {
        console.log('\n🔍 检查 DOM 元素');
        const btn = document.querySelector('#open-message-background');
        if (btn) {
            console.log('✅ 找到消息背景按钮');
            console.log('   - 元素:', btn);
            console.log('   - 是否可见:', btn.offsetParent !== null ? '✅' : '❌');
            console.log('   - onclick:', btn.onclick ? '✅' : '❌');
        } else {
            console.error('❌ 找不到消息背景按钮 (#open-message-background)');
            
            // 尝试找到个性装扮页面
            const decorationPage = document.querySelector('[id*="decoration"]');
            if (decorationPage) {
                console.log('   💡 提示：个性装扮页面存在，但消息背景按钮不在 DOM 中');
                console.log('   可能原因：页面还未打开或 HTML 加载失败');
            } else {
                console.log('   💡 提示：个性装扮页面也不在 DOM 中');
                console.log('   可能原因：还未打开个性装扮页面');
            }
        }
    },
    
    // 检查事件绑定
    checkEventBinding() {
        console.log('\n⚡ 检查事件绑定');
        const btn = document.querySelector('#open-message-background');
        if (btn) {
            if (btn.onclick) {
                console.log('✅ onclick 事件已绑定');
                // 尝试查看函数内容
                console.log('   - 函数代码:', btn.onclick.toString().substring(0, 100) + '...');
            } else {
                console.error('❌ onclick 事件未绑定');
                // 尝试手动模拟点击
                console.log('   💡 尝试手动触发点击...');
                btn.click();
            }
        }
    },
    
    // 测试功能
    testFunctionality() {
        console.log('\n🧪 测试功能');
        
        if (window.MessageBackgroundManagerUI && window.MessageBackgroundManagerUI.open) {
            console.log('✅ 尝试打开管理器...');
            try {
                window.MessageBackgroundManagerUI.open();
                console.log('✅ 管理器已打开');
            } catch (err) {
                console.error('❌ 打开管理器出错:', err.message);
            }
        } else {
            console.error('❌ 无法测试功能：UI 未加载');
        }
    },
    
    // 快速修复建议
    suggestFix() {
        console.log('\n💡 修复建议：');
        if (!window.MessageBackgroundManager) {
            console.log('1. message-background-manager.js 未加载');
            console.log('   - 检查 index.html 中是否有这个脚本标签');
            console.log('   - 检查脚本是否有语法错误');
        }
        if (!window.MessageBackgroundManagerUI) {
            console.log('2. message-background-manager-ui.js 未加载');
            console.log('   - 检查 index.html 中是否有这个脚本标签');
            console.log('   - 确保它在 message-background-manager.js 之后加载');
        }
        if (!document.querySelector('#open-message-background')) {
            console.log('3. 消息背景按钮不在 DOM 中');
            console.log('   - 打开个性装扮页面后再运行诊断');
            console.log('   - 或检查 app.js 中的 decoration-option-card 是否正确');
        }
    }
};

// 暴露到 window 对象
window.MessageBackgroundDiagnostics = MessageBackgroundDiagnostics;

// 自动运行（可选）
console.log('💡 运行诊断: window.MessageBackgroundDiagnostics.diagnose()');
