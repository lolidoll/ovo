const text = `[MSG1]嗯？宝宝？[/MSG1]
[WAIT:1]
[MSG2]你叫我什么～[/MSG2]
[WAIT:1.5]
[MSG3]刚洗完澡，头发还湿着呢，而且……我现在这个样子，你确定要看？

【心声...`;

const msgRegex = /\[MSG\d+\]([\s\S]*?)\[\/MSG\d+\]/g;
let match;
let count = 0;
while ((match = msgRegex.exec(text)) !== null) {
    count++;
    console.log(`MSG${count}: '${match[1].trim()}'`);
}
console.log(`\nTotal messages: ${count}`);
