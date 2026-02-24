import sys

file_path = r'c:\ovo-main\main-api-manager.js'

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找需要替换的文本
old_pattern = '''        });

        // 末尾对话状态提示（提高模型对"用户未回复"的识别）
        if (lastNonSystemRole === 'assistant') {
            out.push({
                role: 'system',
                content: '【对话状态】用户尚未回复上一条消息。请不要把用户当作已回复来继续对话，请继续主动发送下一条消息或自然等待。'
            });
        }

        if (skippedCount > 0) {
            console.log(`📝 已跳过 ${skippedCount} 条已总结的消息，包含 ${includedCount} 条最新消息`);
        }

        return out;'''

new_pattern = '''        });

        // 末尾对话状态提示（提高模型对"用户未回复"的识别）
        if (lastNonSystemRole === 'assistant') {
            out.push({
                role: 'system',
                content: '【对话状态】用户尚未回复上一条消息。请不要把用户当作已回复来继续对话，请继续主动发送下一条消息或自然等待。'
            });
        }
        
        // 检查是否需要添加虚拟用户消息来触发AI回复
        // 情况1：空历史对话（没有用户消息）
        // 情况2：只有assistant消息，没有用户消息
        const hasUserMessage = out.some(m => m.role === 'user');
        if (!hasUserMessage) {
            console.log('⚠️ 检测到没有用户消息，添加虚拟触发消息');
            out.push({
                role: 'user',
                content: '[开始对话]'  // 虚拟的用户触发消息
            });
        }

        if (skippedCount > 0) {
            console.log(`📝 已跳过 ${skippedCount} 条已总结的消息，包含 ${includedCount} 条最新消息`);
        }

        return out;'''

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Success! File modified correctly.')
else:
    print('ERROR: Could not find the pattern to replace.')
    print('Trying to find partial matches...')
    
    # 尝试找到部分匹配
    if '末尾对话状态提示' in content:
        print('- Found: 末尾对话状态提示')
    else:
        print('- NOT Found: 末尾对话状态提示')
        
    if 'skippedCount' in content:
        print('- Found: skippedCount')
    else:
        print('- NOT Found: skippedCount')
