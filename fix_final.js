const fs = require('fs');
const path = 'c:\\ovo-main\\main-api-manager.js';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `        // 检查是否需要添加虚拟用户消息来触发AI回复
        // 情况1：空历史对话（没有用户消息）
        // 情况2：只有assistant消息，没有用户消息
        const hasUserMessage = out.some(m => m.role === 'user');
        if (!hasUserMessage) {
            console.log(' 检测到没有用户消息，添加系统触发消息');
            out.push({
                role: 'user',
            });
        }`;

const newCode = `        // 检查是否需要添加系统触发消息
        // 情况1：空历史对话（没有用户消息）
        // 情况2：只有assistant消息，没有用户消息
        const hasUserMessage = out.some(m => m.role === 'user');
        if (!hasUserMessage) {
            console.log('⚠️ 检测到没有用户消息，添加系统触发消息');
            out.push({
                role: 'system',
                content: '【开始对话】请主动发送开场白与用户开始对话。'
            });
        }`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed successfully!');
} else {
    console.log('Pattern not found!');
}
