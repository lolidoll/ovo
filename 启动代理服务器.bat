@echo off
chcp 65001 >nul
echo ====================================
echo 启动API代理服务器
echo ====================================
echo.
python proxy_server.py
pause
