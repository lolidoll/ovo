// 测试修复后的 parseThinkingProcess

function parseThinkingProcess(text) {
    if (!text || typeof text !== 'string') return null;

    if (!text.includes('[THINK]') && !text.includes('[REPLY') && !text.includes('[MSG')) {
        return null;
    }

    const messages = [];
    let thinkingContent = '';

    // 提取思考部分
    const thinkingRegex = /\[THINK\]([\s\S]*?)\[\/THINK\]/;
    const thinkingMatch = text.match(thinkingRegex);
    if (thinkingMatch) {
        thinkingContent = thinkingMatch[1].trim();
    }

    // 尝试提取[MSG]格式的消息部分
    const msgRegex = /\[MSG\d+\]([\s\S]*?)\[\/MSG\d+\]/g;
    let match;
    let lastIndex = 0;
    let hasMsgFormat = false;

    while ((match = msgRegex.exec(text)) !== null) {
        hasMsgFormat = true;
        const msgContent = match[1].trim();
        if (msgContent) {
            messages.push({
                type: 'message',
                content: msgContent,
                delay: 0
            });
        }
        lastIndex = match.index + match[0].length;

        // 检查这个MSG后面是否有WAIT标记
        const waitRegex = /\[WAIT:?([\d.]+)?\]/;
        const nextText = text.substring(lastIndex, lastIndex + 50);
        const waitMatch = nextText.match(waitRegex);
        if (waitMatch && messages.length > 0) {
            const delay = waitMatch[1] ? parseFloat(waitMatch[1]) * 1000 : 500;
            messages[messages.length - 1].delay = delay;
        }
    }

    // 🔧 修复：检查是否有未闭合的MSG标签
    if (messages.length === 0 || lastIndex < text.length) {
        const unclosedMsgRegex = /\[MSG\d+\]([\s\S]*?)(?=\[MSG\d+\]|$)/;
        let unclosedMatch;
        unclosedMsgRegex.lastIndex = lastIndex;

        while ((unclosedMatch = unclosedMsgRegex.exec(text)) !== null) {
            const msgContent = unclosedMatch[1].trim();
            // 过滤掉空内容和只有WAIT标签的内容
            if (msgContent && !msgContent.match(/^\[WAIT/)) {
                console.log('🔧 检测到未闭合的MSG标签，自动补充');
                messages.push({
                    type: 'message',
                    content: msgContent,
                    delay: 0
                });
            }

            if (unclosedMatch.index + unclosedMatch[0].length > lastIndex) {
                lastIndex = unclosedMatch.index + unclosedMatch[0].length;
            }

            const waitRegex = /\[WAIT:?([\d.]+)?\]/;
            const nextText = text.substring(lastIndex, lastIndex + 50);
            const waitMatch = nextText.match(waitRegex);
            if (waitMatch && messages.length > 0) {
                const delay = waitMatch[1] ? parseFloat(waitMatch[1]) * 1000 : 500;
                messages[messages.length - 1].delay = delay;
            }

            if (lastIndex >= text.length) break;
        }
    }

    return messages.length > 0 ? {
        thinking: thinkingContent,
        messages: messages
    } : null;
}

// 测试用例1：正常的闭合MSG
const test1 = `[MSG1]嗯？宝宝？[/MSG1]
[WAIT:1]
[MSG2]你叫我什么～[/MSG2]
[WAIT:1.5]
[MSG3]刚洗完澡，头发还湿着呢，而且……我现在这个样子，你确定要看？

【心声...`;

console.log('测试用例1：包含未闭合MSG3');
const result1 = parseThinkingProcess(test1);
console.log('提取消息数量:', result1.messages.length);
result1.messages.forEach((msg, i) => {
    console.log(`MSG${i+1}: '${msg.content.substring(0, 50)}...'`);
    console.log(`  Delay: ${msg.delay}ms`);
});

// 测试用例2：所有MSG都闭合
const test2 = `[MSG1]第一条消息[/MSG1]
[WAIT:1]
[MSG2]第二条消息[/MSG2]`;

console.log('\n测试用例2：所有MSG都闭合');
const result2 = parseThinkingProcess(test2);
console.log('提取消息数量:', result2.messages.length);
result2.messages.forEach((msg, i) => {
    console.log(`MSG${i+1}: '${msg.content}'`);
    console.log(`  Delay: ${msg.delay}ms`);
});
