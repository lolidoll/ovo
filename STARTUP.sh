#!/usr/bin/env bash
# Discord 登录系统 - 快速启动脚本（适用于 macOS/Linux）

echo "🚀 薯片机 - Discord 登录系统"
echo "================================"
echo ""

# 检查 Python
if command -v python3 &> /dev/null; then
    echo "✅ 已检测到 Python 3"
    echo ""
    echo "📝 如需快速启动，执行："
    echo "   python3 -m http.server 8000"
    echo ""
    echo "然后访问："
    echo "   🌐 http://localhost:8000/login.html"
    echo "   🧪 http://localhost:8000/test-login.html"
    echo ""
fi

# 检查 Node.js
if command -v node &> /dev/null; then
    echo "✅ 已检测到 Node.js"
    echo ""
    echo "📝 如需启动后端服务，执行："
    echo "   npm install"
    echo "   npm start"
    echo ""
    echo "服务将运行在 http://localhost:3000"
    echo ""
fi

# 检查 npm
if command -v npm &> /dev/null; then
    echo "✅ 已检测到 NPM"
    echo ""
fi

echo "📚 重要文件："
echo "   1️⃣  QUICK_START.md          - 3 分钟快速开始"
echo "   2️⃣  README_LOGIN.md         - 完整使用指南"
echo "   3️⃣  FILES_OVERVIEW.md       - 文件说明"
echo "   4️⃣  test-login.html         - 测试页面"
echo ""

echo "🔧 需要配置："
echo "   • 在 login.js 第 7 行添加 Discord CLIENT_ID"
echo "   • 在 Discord Developer Portal 配置重定向 URI"
echo ""

echo "✨ 所有文件已创建完成！"
echo ""
