import sys

file_path = r'c:\ovo-main\main-api-manager.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到要修改的位置并修改
for i, line in enumerate(lines):
    if '检测到是否需要添加虚拟用户消息来触发AI回复' in line:
        lines[i] = '        // 检查是否需要添加系统触发消息\n'
    elif '添加虚拟触发消息' in line and 'console.log' in line:
        lines[i] = "            console.log(' 检测到没有用户消息，添加系统触发消息');\n"
    elif "role: 'user'," in line and i > 1280:
        # 下一行应该是content或注释
        if i + 1 < len(lines) and '[开始对话]' in lines[i + 1]:
            lines[i] = "                role: 'system',\n"
            # 找到并替换content行
            lines[i + 1] = "                content: '【开始对话】请主动发送开场白与用户开始对话。'\n"
            # 跳过下一行（注释行）
            if i + 2 < len(lines) and '虚拟的用户触发消息' in lines[i + 2]:
                lines[i + 2] = ''

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed!')
