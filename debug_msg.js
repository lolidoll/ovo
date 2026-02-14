const test1 = `[MSG1]嗯？宝宝？[/MSG1]
[WAIT:1]
[MSG2]你叫我什么～[/MSG2]
[WAIT:1.5]
[MSG3]刚洗完澡，头发还湿着呢，而且……我现在这个样子，你确定要看？

【心声...`;

console.log('=== Test 1: Unclosed MSG3 ===');
console.log(test1);
console.log('');

// 步骤1：提取所有闭合的MSG
const msgRegex = /\[MSG\d+\]([\s\S]*?)\[\/MSG\d+\]/g;
let match;
let lastIndex = 0;
let messages = [];

while ((match = msgRegex.exec(test1)) !== null) {
    const msgContent = match[1].trim();
    messages.push({ content: msgContent, type: 'closed' });
    lastIndex = match.index + match[0].length;
    console.log('Closed MSG:', msgContent);
}
console.log('Last closed MSG ended at index:', lastIndex);
console.log('Total text length:', test1.length);
console.log('Remaining text:', test1.substring(lastIndex));
console.log('');

// 步骤2：尝试提取未闭合的MSG
if (lastIndex < test1.length) {
    console.log('Searching for unclosed MSG from index:', lastIndex);

    // 方法A：从lastIndex开始查找下一个[MSG...]
    const nextMsgStart = test1.indexOf('[MSG', lastIndex);
    console.log('Next [MSG found at index:', nextMsgStart);

    if (nextMsgStart !== -1) {
        // 从[MSG3]开始提取到文本结尾
        const unclosedContent = test1.substring(nextMsgStart + 6); // +6 跳过 [MSG3]
        console.log('Unclosed MSG content:', unclosedContent);
    }
}
