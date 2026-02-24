// 测试 cleanAIResponse 对 MSG3 内容的处理

const msg3Content = `刚洗完澡，头发还湿着呢，而且……我现在这个样子，你确定要看？

【心声...`;

console.log('原始内容:', msg3Content);
console.log('---');

// 模拟 cleanAIResponse 的清理逻辑
let text = msg3Content;

// 第一层：移除思考过程标记
text = text.replace(/\[THINK\][\s\S]*?\[\/THINK\]/g, '');
text = text.replace(/\[REPLY\d+\]|\[\/REPLY\d+\]/g, '');
text = text.replace(/\[MSG\d+\]|\[\/MSG\d+\]/g, '');
text = text.replace(/\[WAIT(?::[\d.]+)?\]/g, '');

console.log('第一层处理后:', text);
console.log('---');

// 第二层：移除所有带【】标记的系统信息
text = text.replace(/【[^】]{0,20}】[\s\S]*?(?=【|$|\n(?!【))/g, function(match) {
    const content = match.match(/【([^】]*)】/);
    if (!content) return '';

    const tags = ['心声', '思维链', '思考', '系统', '指令', '提示', '缓冲', '内部', '调试', '日志'];
    if (tags.some(tag => content[1].includes(tag))) {
        return '';
    }
    return match;
});

console.log('第二层处理后:', text);
console.log('---');

// 第七层：移除多余的空行
text = text.replace(/\n{3,}/g, '\n\n');
text = text.trim();

console.log('最终结果:', text);
console.log('是否为空:', !text || text.length === 0);
