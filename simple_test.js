console.log('Start');

const test = `[MSG1]嗯？宝宝？[/MSG1]
[WAIT:1]
[MSG2]你叫我什么～[/MSG2]
[WAIT:1.5]
[MSG3]刚洗完澡，头发还湿着呢`;

console.log('Test text:', test);

const msgRegex = /\[MSG\d+\]([\s\S]*?)\[\/MSG\d+\]/g;
let match;
let count = 0;
while ((match = msgRegex.exec(test)) !== null) {
    count++;
    console.log('Match', count, ':', match[1]);
}
console.log('Closed matches:', count);

// 测试未闭合MSG
const unclosedRegex = /\[MSG\d+\]([\s\S]*?)(?=\[MSG\d+\]|$)/;
let unclosedMatch;
let unclosedCount = 0;
while ((unclosedMatch = unclosedRegex.exec(test)) !== null) {
    unclosedCount++;
    console.log('Unclosed', unclosedCount, ':', unclosedMatch[1]);
}
console.log('All matches (including unclosed):', unclosedCount);

console.log('End');
