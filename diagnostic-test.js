console.log('🔍 消息背景功能诊断');
console.log('='*50);

// 检查文件是否存在
const fs = require('fs');
const files = ['message-background-manager.js', 'message-background-manager-ui.js', 'message-background-manager.css', 'app.js'];

console.log('📁 检查文件存在性:');
files.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log('✅', file, '-', stats.size.toLocaleString(), 'bytes');
  } else {
    console.log('❌', file, '- 文件不存在');
  }
});

console.log('\n🔍 检查控制台中的对象:');
console.log('window.MessageBackgroundManager:', typeof window !== 'undefined' ? typeof window.MessageBackgroundManager : 'N/A');
console.log('window.MessageBackgroundManagerUI:', typeof window !== 'undefined' ? typeof window.MessageBackgroundManagerUI : 'N/A');

// 检查样式表是否正确加载
console.log('\n🎨 检查样式表:');
if (typeof document !== 'undefined') {
  const link = document.querySelector('link[href="message-background-manager.css"]');
  console.log('CSS样式表:', link ? '✅ 已加载' : '❌ 未加载');
}