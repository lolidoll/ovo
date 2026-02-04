/**
 * iPhone 17 模拟器
 * 完整模拟iPhone 17的外观和真实交互
 */

(function() {
    'use strict';
    
    let simulatorState = {
        isOpen: false,
        currentTime: '',
        batteryLevel: 85,
        islandExpanded: false,
        islandTimer: null
    };
    
    /**
     * 初始化iPhone模拟器
     */
    function initIPhoneSimulator() {
        console.log('📱 初始化iPhone 17模拟器');
        
        // 创建模拟器HTML结构
        createSimulatorHTML();
        
        // 绑定按钮事件
        bindEvents();
        
        // 启动时间更新
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    /**
     * 创建模拟器HTML结构
     */
    function createSimulatorHTML() {
        const simulatorHTML = `
            <div class="iphone-simulator-overlay" id="iphone-simulator-overlay">
                <button class="iphone-close-btn" id="iphone-close-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                
                <div class="iphone-device">
                    <div class="iphone-screen">
                        <!-- 灵动岛 -->
                        <div class="dynamic-island" id="dynamic-island">
                            <div class="dynamic-island-content">
                                <div class="camera-dot"></div>
                                <div class="sensor-line"></div>
                            </div>
                            <div class="dynamic-island-expanded-content" id="island-expanded-content">
                                <span>🎵 正在播放音乐</span>
                            </div>
                        </div>
                        
                        <!-- 状态栏 -->
                        <div class="status-bar">
                            <div class="status-left">
                                <div class="status-time" id="iphone-time">9:41</div>
                            </div>
                            <div class="status-right">
                                <!-- 信号强度 -->
                                <div class="signal-bars">
                                    <div class="signal-bar"></div>
                                    <div class="signal-bar"></div>
                                    <div class="signal-bar"></div>
                                    <div class="signal-bar"></div>
                                </div>
                                <!-- WiFi -->
                                <div class="wifi-icon">
                                    <div class="wifi-arc"></div>
                                    <div class="wifi-arc"></div>
                                    <div class="wifi-arc"></div>
                                    <div class="wifi-dot"></div>
                                </div>
                                <!-- 电池 -->
                                <div class="battery-icon">
                                    <div class="battery-level" id="battery-level" style="width: 85%;"></div>
                                </div>
                                <div class="battery-percent" id="battery-percent">85%</div>
                            </div>
                        </div>
                        
                        <!-- 屏幕内容 -->
                        <div class="screen-content">
                            <div class="home-screen">
                                <!-- 应用图标网格 -->
                                <div class="app-grid">
                                    <!-- 第一行 -->
                                    <div class="app-icon" data-app="messages">
                                        <div class="app-icon-image app-messages">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">信息</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="facetime">
                                        <div class="app-icon-image app-phone">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">FaceTime</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="calendar">
                                        <div class="app-icon-image" style="background: #fff;">
                                            <svg viewBox="0 0 24 24" fill="#ff3b30">
                                                <rect x="3" y="6" width="18" height="15" rx="2" fill="#fff"/>
                                                <rect x="3" y="4" width="18" height="5" rx="2" fill="#ff3b30"/>
                                                <text x="12" y="17" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">17</text>
                                            </svg>
                                        </div>
                                        <div class="app-name">日历</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="photos">
                                        <div class="app-icon-image app-photos">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">照片</div>
                                    </div>
                                    
                                    <!-- 第二行 -->
                                    <div class="app-icon" data-app="camera">
                                        <div class="app-icon-image app-camera">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="3.2"/>
                                                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">相机</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="mail">
                                        <div class="app-icon-image app-mail">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">邮件</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="clock">
                                        <div class="app-icon-image app-clock">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#fff"/>
                                                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="#ff9500"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">时钟</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="maps">
                                        <div class="app-icon-image app-maps">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">地图</div>
                                    </div>
                                    
                                    <!-- 第三行 -->
                                    <div class="app-icon" data-app="weather">
                                        <div class="app-icon-image app-weather">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">天气</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="notes">
                                        <div class="app-icon-image" style="background: linear-gradient(135deg, #ffcc00 0%, #ff9500 100%);">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">备忘录</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="settings">
                                        <div class="app-icon-image app-settings">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">设置</div>
                                    </div>
                                    
                                    <div class="app-icon" data-app="appstore">
                                        <div class="app-icon-image app-appstore">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                            </svg>
                                        </div>
                                        <div class="app-name">App Store</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Dock栏 -->
                            <div class="dock-container">
                                <div class="dock">
                                    <div class="dock-icon" data-app="phone">
                                        <div class="dock-icon-image dock-phone">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    
                                    <div class="dock-icon" data-app="safari">
                                        <div class="dock-icon-image dock-safari">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="10"/>
                                                <path d="M12 2v20M2 12h20" stroke="white" stroke-width="1" fill="none"/>
                                                <path d="M8 8l8 8M16 8l-8 8" stroke="white" stroke-width="1.5" fill="none"/>
                                            </svg>
                                        </div>
                                    </div>
                                    
                                    <div class="dock-icon" data-app="messages">
                                        <div class="dock-icon-image dock-messages">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    
                                    <div class="dock-icon" data-app="music">
                                        <div class="dock-icon-image dock-music">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 底部指示器 -->
                        <div class="home-indicator"></div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.insertAdjacentHTML('beforeend', simulatorHTML);
    }
    
    /**
     * 绑定事件
     */
    function bindEvents() {
        // 查手机按钮
        const btnPhone = document.getElementById('btn-phone');
        if (btnPhone) {
            btnPhone.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openSimulator();
            });
        }
        
        // 关闭按钮
        const closeBtn = document.getElementById('iphone-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeSimulator();
            });
        }
        
        // 点击遮罩层关闭
        const overlay = document.getElementById('iphone-simulator-overlay');
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    closeSimulator();
                }
            });
        }
        
        // 灵动岛点击事件
        const dynamicIsland = document.getElementById('dynamic-island');
        if (dynamicIsland) {
            dynamicIsland.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleDynamicIsland();
            });
        }
        
        // 应用图标点击事件
        document.addEventListener('click', function(e) {
            const appIcon = e.target.closest('.app-icon, .dock-icon');
            if (appIcon) {
                const appName = appIcon.querySelector('.app-name')?.textContent || 
                               appIcon.dataset.app;
                handleAppClick(appName, appIcon);
            }
        });
    }
    
    /**
     * 打开模拟器
     */
    function openSimulator() {
        const overlay = document.getElementById('iphone-simulator-overlay');
        if (overlay) {
            overlay.classList.add('show');
            simulatorState.isOpen = true;
            console.log('📱 iPhone模拟器已打开');
            
            // 更新电池电量
            updateBattery();
            
            // 启动灵动岛动画
            startIslandAnimation();
        }
    }
    
    /**
     * 关闭模拟器
     */
    function closeSimulator() {
        const overlay = document.getElementById('iphone-simulator-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            simulatorState.isOpen = false;
            
            // 重置灵动岛状态
            const island = document.getElementById('dynamic-island');
            if (island) {
                island.classList.remove('expanded', 'active');
            }
            simulatorState.islandExpanded = false;
            
            console.log('📱 iPhone模拟器已关闭');
        }
    }
    
    /**
     * 切换灵动岛状态
     */
    function toggleDynamicIsland() {
        const island = document.getElementById('dynamic-island');
        if (!island) return;
        
        if (simulatorState.islandExpanded) {
            // 收缩
            island.classList.remove('expanded');
            simulatorState.islandExpanded = false;
            console.log('🏝️ 灵动岛已收缩');
        } else {
            // 展开
            island.classList.add('expanded');
            simulatorState.islandExpanded = true;
            console.log('🏝️ 灵动岛已展开');
            
            // 3秒后自动收缩
            clearTimeout(simulatorState.islandTimer);
            simulatorState.islandTimer = setTimeout(() => {
                island.classList.remove('expanded');
                simulatorState.islandExpanded = false;
            }, 3000);
        }
    }
    
    /**
     * 启动灵动岛动画
     */
    function startIslandAnimation() {
        const island = document.getElementById('dynamic-island');
        if (island) {
            island.classList.add('active');
        }
    }
    
    /**
     * 更新时间显示
     */
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        const timeElement = document.getElementById('iphone-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
        
        simulatorState.currentTime = timeString;
    }
    
    /**
     * 更新电池显示
     */
    function updateBattery() {
        // 模拟电池电量在80-100%之间随机变化
        const battery = Math.floor(Math.random() * 21) + 80;
        simulatorState.batteryLevel = battery;
        
        const batteryLevel = document.getElementById('battery-level');
        const batteryPercent = document.getElementById('battery-percent');
        
        if (batteryLevel) {
            batteryLevel.style.width = battery + '%';
        }
        
        if (batteryPercent) {
            batteryPercent.textContent = battery + '%';
        }
    }
    
    /**
     * 处理应用点击
     */
    function handleAppClick(appName, element) {
        // 添加点击反馈
        element.style.transform = 'scale(0.92)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
        
        // 显示应用通知
        showAppNotification(appName);
        
        // 如果点击音乐应用，触发灵动岛
        if (appName === 'music' || appName === '音乐') {
            setTimeout(() => {
                const island = document.getElementById('dynamic-island');
                if (island && !simulatorState.islandExpanded) {
                    island.classList.add('expanded');
                    simulatorState.islandExpanded = true;
                    
                    // 5秒后自动收缩
                    clearTimeout(simulatorState.islandTimer);
                    simulatorState.islandTimer = setTimeout(() => {
                        island.classList.remove('expanded');
                        simulatorState.islandExpanded = false;
                    }, 5000);
                }
            }, 500);
        }
    }
    
    /**
     * 显示应用通知
     */
    function showAppNotification(appName) {
        // 创建临时提示
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 15px;
            z-index: 10002;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            animation: fadeInOut 2s ease;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        `;
        notification.textContent = `正在打开 ${appName}...`;
        document.body.appendChild(notification);
        
        // 2秒后移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 1700);
    }
    
    // 添加淡入淡出动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
            10% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            90% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
    `;
    document.head.appendChild(style);
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIPhoneSimulator);
    } else {
        initIPhoneSimulator();
    }
    
})();