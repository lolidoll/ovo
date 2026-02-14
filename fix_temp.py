import sys

file_path = r'c:\ovo-main\main-api-manager.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到要修改的位置
target_line = -1
for i, line in enumerate(lines):
    if i > 1280 and 'if (skippedCount > 0)' in line and 'console.log' in lines[i+1]:
        target_line = i
        break

if target_line == -1:
    print('Could not find target line!')
    sys.exit(1)

# 在这行之前插入新代码
indent = '    '
new_code = [
    '\n',
    f'{indent}// 检查是否需要添加虚拟用户消息来触发AI回复\n',
    f'{indent}// 情况1：空历史对话（没有用户消息）\n',
    f'{indent}// 情况2：只有assistant消息，没有用户消息\n',
    f'{indent}const hasUserMessage = out.some(m => m.role === \'user\');\n',
    f'{indent}if (!hasUserMessage) {{\n',
    f'{indent}    console.log(\'⚠️ 检测到没有用户消息，添加虚拟触发消息\');\n',
    f'{indent}    out.push({{\n',
    f'{indent}        role: \'user\',\n',
    f'{indent}        content: \'[开始对话]\'  // 虚拟的用户触发消息\n',
    f'{indent}    }});\n',
    f'{indent}}}\n',
]

# 插入新代码
lines = lines[:target_line] + new_code + lines[target_line:]

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Success! Modified at line', target_line)
