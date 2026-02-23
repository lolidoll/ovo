/**
 * 测试指令清除正则是否正常工作
 * 运行: node test-directive-cleaning.js
 */

// 复制实际的清除逻辑
function cleanDirectives(text) {
    let cleanText = text;
    
    // 1. 删除接受/拒绝指令标记（无内容）
    cleanText = cleanText.replace(/\[ACCEPT_LISTEN_INVITATION\]/g, '');
    cleanText = cleanText.replace(/\[REJECT_LISTEN_INVITATION\]/g, '');
    
    // 2. 删除邀请指令及其理由（不在消息中显示邀请理由）
    cleanText = cleanText.replace(/\[INVITE_LISTEN\][^\[\n]*?(?=\[|$)/gs, '');
    
    // 3. 删除切歌指令和歌曲名，保留后续内容
    cleanText = cleanText.replace(/\[CHANGE_SONG\][^\[\n,，。.]*([,，。.])?/g, (match, comma) => {
        return comma ? comma : '';
    });
    
    // 4. 删除收藏指令和歌曲名，保留后续内容
    cleanText = cleanText.replace(/\[ADD_FAVORITE_SONG\][^\[\n,，。.]*([,，。.])?/g, (match, comma) => {
        return comma ? comma : '';
    });
    
    // 5. 清理过多的空格
    cleanText = cleanText.replace(/\s+([,，。.])/g, '$1');  // 移除标点前的多余空格
    cleanText = cleanText.replace(/([,，。.])\s+/g, '$1 ');  // 标点后保留单个空格
    cleanText = cleanText.trim();
    
    return cleanText;
}

// 测试用例
const testCases = [
    {
        name: '切歌 - 基础格式',
        input: '[CHANGE_SONG]稻香，这首歌很舒服',
        expected: '这首歌很舒服'
    },
    {
        name: '切歌 - 前面有文字',
        input: '我为你换个[CHANGE_SONG]稻香，这首歌很舒服',
        expected: '我为你换个这首歌很舒服'
    },
    {
        name: '切歌 - 句号分隔',
        input: '[CHANGE_SONG]稻香。很好听呢',
        expected: '很好听呢'
    },
    {
        name: '切歌 - 无理由',
        input: '[CHANGE_SONG]稻香',
        expected: ''
    },
    {
        name: '收藏 - 基础格式',
        input: '[ADD_FAVORITE_SONG]稻香，我很喜欢这首',
        expected: '我很喜欢这首'
    },
    {
        name: '收藏 - 前面有文字',
        input: '我决定收藏[ADD_FAVORITE_SONG]平凡之路，这是我最爱的歌',
        expected: '我决定收藏这是我最爱的歌'
    },
    {
        name: '邀请 - 基础格式',
        input: '[INVITE_LISTEN]一起听歌吧',
        expected: ''
    },
    {
        name: '邀请 - 前后有文字',
        input: '亲爱的，[INVITE_LISTEN]我们一起听音乐吧？',
        expected: '亲爱的，'
    },
    {
        name: '接受 - 基础格式',
        input: '好的[ACCEPT_LISTEN_INVITATION]，我同意',
        expected: '好的，我同意'
    },
    {
        name: '拒绝 - 基础格式',
        input: '感谢邀请[REJECT_LISTEN_INVITATION]，但我现在有点忙',
        expected: '感谢邀请，但我现在有点忙'
    },
    {
        name: '复杂 - 多个指令',
        input: '我想为你[CHANGE_SONG]稻香，换个舒缓的，然后[ADD_FAVORITE_SONG]平凡之路，这是我最爱',
        expected: '我想为你换个舒缓的，然后这是我最爱'
    },
    {
        name: '书名号 - 歌曲',
        input: '[CHANGE_SONG]稻香，让我们享受这个美好时刻',
        expected: '让我们享受这个美好时刻'
    },
    {
        name: '边界 - 逗号立即接文字',
        input: '[CHANGE_SONG]稻香,继续聊天',
        expected: ',继续聊天'
    },
];

// 运行测试
console.log('🧪 指令清除正则测试\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const result = cleanDirectives(testCase.input);
    const isPass = result === testCase.expected;
    
    if (isPass) {
        passed++;
        console.log(`✅ 测试 ${index + 1}: ${testCase.name}`);
    } else {
        failed++;
        console.log(`❌ 测试 ${index + 1}: ${testCase.name}`);
        console.log(`   输入:  "${testCase.input}"`);
        console.log(`   期望:  "${testCase.expected}"`);
        console.log(`   实际:  "${result}"`);
    }
});

console.log('='.repeat(80));
console.log(`\n📊 测试结果: ${passed}/${testCases.length} 通过`);

if (failed > 0) {
    console.log(`⚠️  有 ${failed} 个测试失败，需要调整正则`);
    process.exit(1);
} else {
    console.log('✨ 所有测试通过！');
    process.exit(0);
}
