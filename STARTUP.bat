@echo off
REM Discord 登录系统 - 快速启动脚本（Windows）

echo.
echo 🚀 薯片机 - Discord 登录系统
echo ================================
echo.

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 已检测到 Python
    echo.
    echo 📝 快速启动命令：
    echo    python -m http.server 8000
    echo.
    echo 然后访问：
    echo    🌐 http://localhost:8000/login.html
    echo    🧪 http://localhost:8000/test-login.html
    echo.
) else (
    echo ⚠️  未检测到 Python
    echo    请从 https://www.python.org 下载安装
    echo.
)

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 已检测到 Node.js
    echo.
    echo 📝 启动后端服务：
    echo    npm install
    echo    npm start
    echo.
    echo 服务将运行在 http://localhost:3000
    echo.
) else (
    echo ⚠️  未检测到 Node.js
    echo    请从 https://nodejs.org 下载安装
    echo.
)

echo 📚 重要文件：
echo    1️⃣  QUICK_START.md          - 3 分钟快速开始
echo    2️⃣  README_LOGIN.md         - 完整使用指南
echo    3️⃣  FILES_OVERVIEW.md       - 文件说明
echo    4️⃣  test-login.html         - 测试页面
echo.

echo 🔧 需要配置：
echo    • 在 login.js 第 7 行添加 Discord CLIENT_ID
echo    • 在 Discord Developer Portal 配置重定向 URI
echo.

echo ✨ 所有文件已创建完成！
echo.
echo 按任意键关闭此窗口...
pause >nul
