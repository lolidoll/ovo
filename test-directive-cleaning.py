#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试指令清除正则是否正常工作
运行: python test-directive-cleaning.py
"""

import re

def cleanDirectives(text):
    """复制实际的清除逻辑"""
    cleanText = text
    
    # 1. 删除接受/拒绝指令标记（无内容）
    cleanText = re.sub(r'\[ACCEPT_LISTEN_INVITATION\]', '', cleanText)
    cleanText = re.sub(r'\[REJECT_LISTEN_INVITATION\]', '', cleanText)
    
    # 2. 删除邀请指令及其理由（不在消息中显示邀请理由）
    cleanText = re.sub(r'\[INVITE_LISTEN\][^\[\n]*?(?=\[|$)', '', cleanText, flags=re.DOTALL)
    
    # 3. 删除切歌指令、歌曲名和后面的逗号，保留逗号后的内容
    cleanText = re.sub(r'\[CHANGE_SONG\][^\[\n,，。.]*[,，。.]?\s*', '', cleanText)
    
    # 4. 删除收藏指令、歌曲名和后面的逗号，保留逗号后的内容
    cleanText = re.sub(r'\[ADD_FAVORITE_SONG\][^\[\n,，。.]*[,，。.]?\s*', '', cleanText)
    
    # 5. 清理过多的空格
    cleanText = re.sub(r'\s+([,，。.])', r'\1', cleanText)  # 移除标点前的多余空格
    cleanText = re.sub(r'([,，。.])\s+', r'\1 ', cleanText)  # 标点后保留单个空格
    cleanText = cleanText.strip()
    
    return cleanText

# 测试用例
test_cases = [
    {
        'name': '切歌 - 基础格式',
        'input': '[CHANGE_SONG]稻香，这首歌很舒服',
        'expected': '这首歌很舒服'
    },
    {
        'name': '切歌 - 前面有文字',
        'input': '我为你换个[CHANGE_SONG]稻香，这首歌很舒服',
        'expected': '我为你换个这首歌很舒服'
    },
    {
        'name': '切歌 - 句号分隔',
        'input': '[CHANGE_SONG]稻香。很好听呢',
        'expected': '很好听呢'
    },
    {
        'name': '切歌 - 无理由',
        'input': '[CHANGE_SONG]稻香',
        'expected': ''
    },
    {
        'name': '收藏 - 基础格式',
        'input': '[ADD_FAVORITE_SONG]稻香，我很喜欢这首',
        'expected': '我很喜欢这首'
    },
    {
        'name': '收藏 - 前面有文字',
        'input': '我决定收藏[ADD_FAVORITE_SONG]平凡之路，这是我最爱的歌',
        'expected': '我决定收藏这是我最爱的歌'
    },
    {
        'name': '邀请 - 基础格式',
        'input': '[INVITE_LISTEN]一起听歌吧',
        'expected': ''
    },
    {
        'name': '邀请 - 前后有文字',
        'input': '亲爱的，[INVITE_LISTEN]我们一起听音乐吧？',
        'expected': '亲爱的，'
    },
    {
        'name': '接受 - 基础格式',
        'input': '好的[ACCEPT_LISTEN_INVITATION]，我同意',
        'expected': '好的，我同意'
    },
    {
        'name': '拒绝 - 基础格式',
        'input': '感谢邀请[REJECT_LISTEN_INVITATION]，但我现在有点忙',
        'expected': '感谢邀请，但我现在有点忙'
    },
    {
        'name': '复杂 - 多个指令',
        'input': '我想为你[CHANGE_SONG]稻香，换个舒缓的，然后[ADD_FAVORITE_SONG]平凡之路，这是我最爱',
        'expected': '我想为你换个舒缓的，然后这是我最爱'
    },
]

# 运行测试
print('🧪 指令清除正则测试\n')
print('=' * 80)

passed = 0
failed = 0

for index, test_case in enumerate(test_cases):
    result = cleanDirectives(test_case['input'])
    is_pass = result == test_case['expected']
    
    if is_pass:
        passed += 1
        print(f"✅ 测试 {index + 1}: {test_case['name']}")
    else:
        failed += 1
        print(f"❌ 测试 {index + 1}: {test_case['name']}")
        print(f"   输入:  \"{test_case['input']}\"")
        print(f"   期望:  \"{test_case['expected']}\"")
        print(f"   实际:  \"{result}\"")

print('=' * 80)
print(f"\n📊 测试结果: {passed}/{len(test_cases)} 通过")

if failed > 0:
    print(f"⚠️  有 {failed} 个测试失败，需要调整正则")
else:
    print('✨ 所有测试通过！')
