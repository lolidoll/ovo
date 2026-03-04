/**
 * 适配验证脚本
 * 检查所有CSS文件中的适配逻辑是否一致
 */

const fs = require('fs');
const path = require('path');

// 检查的主要CSS文件
const cssFiles = [
    'style.css',
    'mobile-responsive.css',
    'fiction-styles.css',
    'moments.css',
    'wallet.css',
    'voice-call.css',
    'video-call.css'
];

// 检查的适配模式
const adaptationModes = [
    'is-pwa.is-ios',
    'is-pwa',
    'is-standalone', 
    'html:not(.is-pwa):not(.is-standalone)',
    'display-mode: fullscreen',
    'display-mode: standalone'
];

// 检查的关键CSS规则
const keyRules = [
    '.msg-page',
    '.friend-page', 
    '.dynamic-page',
    '.channel-page',
    '.msg-list',
    '.friend-content',
    '.dynamic-content',
    '.channel-content',
    '.nav-height',
    'safe-area-inset-top',
    'safe-area-inset-bottom'
];

console.log('=== 适配验证报告 ===\n');

cssFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ 文件不存在: ${file}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📄 检查文件: ${file}`);
    
    // 检查重复的媒体查询
    const mediaQueries = (content.match(/@media.*display-mode.*fullscreen.*\{/g) || []).length;
    const pwaSelectors = (content.match(/\.is-pwa|\.is-standalone/g) || []).length;
    const iosSelectors = (content.match(/\.is-pwa\.is-ios/g) || []).length;
    const normalSelectors = (content.match(/html:not\(\.is-pwa\):not\(\.is-standalone\)/g) || []).length;
    
    console.log(`  🔄 媒体查询数量: ${mediaQueries}`);
    console.log(`  📱 PWA选择器数量: ${pwaSelectors}`);
    console.log(`  🍎 iOS PWA选择器: ${iosSelectors}`);
    console.log(`  🌐 普通浏览器选择器: ${normalSelectors}`);
    
    // 检查100dvh使用情况
    const dvhUsage = (content.match(/100dvh/g) || []).length;
    const vhUsage = (content.match(/100vh/g) || []).length;
    const calcUsage = (content.match(/calc\(.*100dvh/g) || []).length;
    
    console.log(`  📐 100dvh使用次数: ${dvhUsage}`);
    console.log(`  📐 100vh使用次数: ${vhUsage}`);
    console.log(`  📐 calc()使用次数: ${calcUsage}`);
    
    // 检查安全区域使用
    const safeAreaTop = (content.match(/safe-area-inset-top/g) || []).length;
    const safeAreaBottom = (content.match(/safe-area-inset-bottom/g) || []).length;
    
    console.log(`  📱 safe-area-inset-top: ${safeAreaTop}`);
    console.log(`  📱 safe-area-inset-bottom: ${safeAreaBottom}`);
    
    console.log('');
});

console.log('=== 建议优化 ===');
console.log('1. 统一使用100dvh代替100vh');
console.log('2. 集中PWA适配逻辑到mobile-responsive.css');
console.log('3. 移除重复的媒体查询');
console.log('4. 统一安全区域处理方式');
console.log('5. 减少冗余的CSS规则');

console.log('\n✅ 验证完成');