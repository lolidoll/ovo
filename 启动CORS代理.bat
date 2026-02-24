@echo off
REM CORS代理服务器启动脚本
echo 启动CORS代理服务器...
echo.
echo 请确保已安装Node.js
echo 如果没有安装，请从 https://nodejs.org 下载安装
echo.
echo 代理服务器将在以下地址运行:
echo   http://127.0.0.1:8888
echo.
echo 按任意键继续...
pause

node cors-proxy.js

if errorlevel 1 (
    echo.
    echo ❌ 启动失败，请检查是否已安装Node.js
    pause
)
