// 模拟问题场景：MSG3 包含未闭合的【标签

const text = `刚洗完澡，头发还湿着呢，而且……我现在这个样子，你确定要看？

【心声...`;

console.log('测试场景：消息包含未闭合的【标签');
console.log('原始文本:', text);
console.log('');

// 测试第二层清理逻辑
function cleanAIResponse_layer2(text) {
    // 第二层：移除所有带【】标记的系统信息
    const result = text.replace(/【[^】]{0,20}】[\s\S]*?(?=【|$|\n(?!【))/g, function(match) {
        const content = match.match(/【([^】]*)】/);
        if (!content) {
            console.log('  - 未匹配到【...】闭合标签，跳过:', match.substring(0, 50));
            return match; // 保持原样
        }

        const tags = ['心声', '思维链', '思考', '系统', '指令', '提示', '缓冲', '内部', '调试', '日志'];
        if (tags.some(tag => content[1].includes(tag))) {
            console.log('  - 检测到系统标签:', content[1], '删除:', match.substring(0, 50));
            return '';
        }
        console.log('  - 保留内容:', content[1]);
        return match;
    });

    return result;
}

const cleaned = cleanAIResponse_layer2(text);
console.log('');
console.log('清理后文本:', cleaned);
console.log('是否为空:', !cleaned || cleaned.trim().length === 0);
