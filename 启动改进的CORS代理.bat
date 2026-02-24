@echo off
REM 启动改进的CORS代理服务器
REM 检查Node.js是否安装
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ❌ 错误: 未检测到Node.js
    echo.
    echo 请先安装Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 获取当前目录
set SCRIPT_DIR=%~dp0

REM 显示信息
echo.
echo ========================================
echo   改进的CORS代理服务器启动程序
echo ========================================
echo.

REM 检查文件是否存在
if not exist "%SCRIPT_DIR%cors-proxy-improved.js" (
    echo ❌ 错误: 找不到 cors-proxy-improved.js
    pause
    exit /b 1
)

REM 启动代理服务器
echo ✅ 正在启动代理服务器...
echo.
timeout /t 1 /nobreak

cd /d "%SCRIPT_DIR%"
node cors-proxy-improved.js

REM 如果脚本意外退出
if errorlevel 1 (
    echo.
    echo ❌ 代理服务器启动失败
    echo.
    echo 请尝试:
    echo 1. 检查端口8888是否被占用
    echo 2. 以管理员权限运行此脚本
    echo 3. 检查Node.js是否正确安装
    echo.
)

pause
