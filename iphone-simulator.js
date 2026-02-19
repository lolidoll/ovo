/**
 * iPhone 17 模拟器 - 完全真实还原
 * 包含灵动岛、状态栏、Dock栏等所有iOS 17特性
 */

(function() {
    'use strict';

    // 检测是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768;
    }
    
    // 检测浏览器类型
    function detectBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        return {
            isOpera: /opera|opr/i.test(ua),
            isEdge: /edg/i.test(ua),
            isChrome: /chrome/i.test(ua) && !/edg/i.test(ua),
            isSafari: /safari/i.test(ua) && !/chrome/i.test(ua),
            isFirefox: /firefox/i.test(ua),
            isUC: /ucbrowser/i.test(ua),
            isQQ: /qqbrowser/i.test(ua),
            // 雨见浏览器等可能使用的标识
            isOther: !/chrome|safari|firefox|opera|edg/i.test(ua)
        };
    }

    // 创建iPhone模拟器HTML结构
    function createiPhoneSimulator() {
        const overlay = document.createElement('div');
        overlay.className = 'iphone-simulator-overlay';
        overlay.id = 'iphone-simulator-overlay';
        
        const isMobile = isMobileDevice();
        
        overlay.innerHTML = `
            <div class="iphone-device">
                <div class="iphone-screen">
                    <!-- 灵动岛 -->
                    <div class="dynamic-island" id="dynamic-island">
                        <div class="dynamic-island-content">
                            <div class="camera-dot"></div>
                            <div class="sensor-line"></div>
                        </div>
                    </div>
                    
                    <!-- 关机界面 -->
                    <div class="shutdown-overlay" id="shutdown-overlay">
                        <div class="shutdown-panel">
                            <div class="shutdown-slider-container">
                                <div class="shutdown-slider-track">
                                    <div class="shutdown-slider-thumb" id="shutdown-slider-thumb">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                                        </svg>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                                        </svg>
                                    </div>
                                    <div class="shutdown-slider-text">滑动来关机</div>
                                </div>
                            </div>
                            <button class="shutdown-cancel-btn" id="shutdown-cancel-btn">取消</button>
                        </div>
                    </div>
                    
                    <!-- 状态栏 -->
                    <div class="status-bar">
                        <div class="status-left">
                            <span class="status-carrier">中国移动</span>
                        </div>
                        <div class="status-right">
                            <div class="status-icon signal-bars">
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                            </div>
                            <span class="status-5g">5G</span>
                            <div class="status-icon battery-icon">
                                <div class="battery-level" style="width: 85%;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 屏幕内容 -->
                    <div class="screen-content">
                        <div class="home-screen">
                            <!-- iOS 锁屏界面 -->
                            <div class="lockscreen">
                                <div class="lockscreen-content">
                                    <div class="lockscreen-time">
                                        <div class="lockscreen-hour" id="lockscreen-hour">9:41</div>
                                        <div class="lockscreen-date" id="lockscreen-date">2月5日 星期三</div>
                                    </div>
                                    <div class="lockscreen-notifications">
                                        <!-- 可以添加通知卡片 -->
                                    </div>
                                    <div class="lockscreen-bottom">
                                        <div class="lockscreen-indicator">
                                            <div class="lockscreen-swipe-bar"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 应用图标网格 -->
                            <div class="app-grid">
                                <div class="app-icon">
                                    <div class="app-icon-image app-notes">
                                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                    </div>
                                    <span class="app-name">备忘录</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-camera">
                                        <svg viewBox="0 0 24 24"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                                    </div>
                                    <span class="app-name">相机</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-screentime">
                                        <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                                    </div>
                                    <span class="app-name">屏幕使用</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-calendar">
                                        <svg viewBox="0 0 24 24">
                                            <rect x="4" y="5" width="16" height="16" rx="2" fill="white"/>
                                            <rect x="4" y="5" width="16" height="5" rx="2" fill="#ff3b30"/>
                                            <text x="12" y="17" font-size="8" font-weight="bold" text-anchor="middle" fill="#ff3b30">28</text>
                                            <text x="12" y="8.5" font-size="3" font-weight="600" text-anchor="middle" fill="white">星期三</text>
                                        </svg>
                                    </div>
                                    <span class="app-name">日历</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-maps">
                                        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                    </div>
                                    <span class="app-name">地图</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-health">
                                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>
                                    </div>
                                    <span class="app-name">健康</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-wallet">
                                        <svg viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                    </div>
                                    <span class="app-name">钱包</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-mail">
                                        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                    </div>
                                    <span class="app-name">邮件</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-douyin">
                                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                    </div>
                                    <span class="app-name">抖音</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-xiaohongshu">
                                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                    </div>
                                    <span class="app-name">小红书</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-minimize">
                                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#999"/><path d="M7 11h10v2H7z" fill="white"/></svg>
                                    </div>
                                    <span class="app-name">最小化</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-shutdown">
                                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ff3b30"/><path d="M12 6v6M12 15h.01" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
                                    </div>
                                    <span class="app-name">关机</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Dock栏 -->
                        <div class="dock-container">
                            <div class="dock">
                                <div class="dock-icon">
                                    <div class="dock-icon-image dock-phone">
                                        <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                                    </div>
                                </div>
                                <div class="dock-icon">
                                    <div class="dock-icon-image dock-messages">
                                        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                                    </div>
                                </div>
                                <div class="dock-icon">
                                    <div class="dock-icon-image dock-safari">
                                        <svg viewBox="0 0 24 24">
                                            <circle cx="10" cy="10" r="6" fill="none" stroke="white" stroke-width="2"/>
                                            <line x1="14.5" y1="14.5" x2="19" y2="19" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                        </svg>
                                    </div>
                                </div>
                                <div class="dock-icon">
                                    <div class="dock-icon-image dock-settings">
                                        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
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
        
        document.body.appendChild(overlay);
        
        // 创建悬浮球
        const floatingBall = document.createElement('div');
        floatingBall.className = 'floating-ball';
        floatingBall.id = 'floating-ball';
        floatingBall.innerHTML = `
            <div class="floating-ball-icon"></div>
        `;
        // 设置初始位置（右侧中间）
        floatingBall.style.right = '20px';
        floatingBall.style.top = '50%';
        floatingBall.style.transform = 'translateY(-50%)';
        document.body.appendChild(floatingBall);
        
        return overlay;
    }

    // 更新时间显示
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        // 更新状态栏时间
        const timeElement = document.getElementById('status-time');
        if (timeElement) {
            timeElement.textContent = `${hours}:${minutes}`;
        }
        
        // 更新锁屏时间
        const lockscreenHour = document.getElementById('lockscreen-hour');
        if (lockscreenHour) {
            lockscreenHour.textContent = `${hours}:${minutes}`;
        }
        
        // 更新锁屏日期
        const lockscreenDate = document.getElementById('lockscreen-date');
        if (lockscreenDate) {
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const month = months[now.getMonth()];
            const date = now.getDate();
            const weekday = weekdays[now.getDay()];
            lockscreenDate.textContent = `${month}${date}日 ${weekday}`;
        }
    }

    // 计算并应用缩放
    function applyDeviceScale() {
        const device = document.querySelector('.iphone-device');
        if (!device) return;
        
        // 如果是桌面端，使用默认缩放
        if (window.innerWidth > 768) {
            device.style.transform = 'scale(0.95)';
            return;
        }
        
        // 检测浏览器类型
        const browser = detectBrowser();
        
        // 手机端：计算最佳缩放比例 - 9:18 比例
        const deviceWidth = 390;
        const deviceHeight = 780;
        
        // 使用更安全的视口尺寸获取方法
        // 优先使用visualViewport API（更准确），回退到window.innerWidth/Height
        let viewportWidth, viewportHeight;
        
        if (window.visualViewport) {
            viewportWidth = window.visualViewport.width;
            viewportHeight = window.visualViewport.height;
        } else {
            // 对于不支持visualViewport的浏览器，使用document.documentElement
            viewportWidth = Math.min(
                window.innerWidth,
                document.documentElement.clientWidth,
                document.body?.clientWidth || window.innerWidth
            );
            viewportHeight = Math.min(
                window.innerHeight,
                document.documentElement.clientHeight,
                document.body?.clientHeight || window.innerHeight
            );
        }
        
        // 动态计算padding，左右间隔小，上下间隔大
        // 左右padding：使用视口宽度的0.5%，最小2px，最大8px
        const paddingHorizontalPercent = Math.max(2, Math.min(viewportWidth * 0.005, 8));
        const paddingHorizontal = paddingHorizontalPercent * 2; // 左右两边
        
        // 上下padding：使用视口高度的2%，最小16px，最大32px（调大上下间隔）
        const paddingVerticalPercent = Math.max(16, Math.min(viewportHeight * 0.02, 32));
        const paddingVertical = paddingVerticalPercent * 2; // 上下两边
        
        const availableWidth = viewportWidth - paddingHorizontal;
        const availableHeight = viewportHeight - paddingVertical;
        
        const scaleX = availableWidth / deviceWidth;
        const scaleY = availableHeight / deviceHeight;
        
        // 优先使用宽度缩放，让手机看起来更宽、比例更协调
        // 如果宽度缩放后高度超出，则回退到高度缩放
        let scale;
        
        // 根据浏览器类型调整安全系数
        let safetyFactor = 0.98;
        if (browser.isOther || browser.isUC || browser.isQQ) {
            // 对于不常见的浏览器，使用更保守的缩放
            safetyFactor = 0.95;
        }
        
        // 优先使用宽度缩放（让手机更宽）
        const preferredScale = scaleX * safetyFactor;
        const scaledHeight = deviceHeight * preferredScale;
        
        // 检查使用宽度缩放后，高度是否超出可用空间
        if (scaledHeight <= availableHeight) {
            // 高度没有超出，使用宽度缩放
            scale = Math.min(preferredScale, 1);
        } else {
            // 高度超出，使用高度缩放
            scale = Math.min(scaleY * safetyFactor, 1);
        }
        
        // 应用transform，同时设置webkit前缀以确保兼容性
        device.style.transform = `scale(${scale})`;
        device.style.webkitTransform = `scale(${scale})`;
        
        console.log('Device scale applied:', {
            browser: navigator.userAgent.match(/\w+\/[\d.]+/)?.[0] || 'Unknown',
            browserType: Object.keys(browser).find(key => browser[key]) || 'unknown',
            viewportMethod: window.visualViewport ? 'visualViewport' : 'fallback',
            viewportSize: `${viewportWidth}x${viewportHeight}`,
            paddingHorizontal: paddingHorizontal.toFixed(1),
            paddingVertical: paddingVertical.toFixed(1),
            availableSize: `${availableWidth.toFixed(1)}x${availableHeight.toFixed(1)}`,
            scaleX: scaleX.toFixed(3),
            scaleY: scaleY.toFixed(3),
            safetyFactor: safetyFactor,
            finalScale: scale.toFixed(3)
        });
    }

    // 显示iPhone模拟器
    function showiPhoneSimulator() {
        let overlay = document.getElementById('iphone-simulator-overlay');
        
        if (!overlay) {
            overlay = createiPhoneSimulator();
            initializeEventListeners();
        }
        
        // 重置锁屏状态（每次打开都显示锁屏）
        const lockscreen = overlay.querySelector('.lockscreen');
        if (lockscreen) {
            lockscreen.classList.remove('unlocked');
            lockscreen.style.transform = 'translateY(0)';
            lockscreen.style.opacity = '1';
            lockscreen.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
        }
        
        // 应用用户的显示设置（包括灵动岛的显示/隐藏）
        applyUserDisplaySettings();
        
        overlay.classList.add('show');
        updateTime();
        
        // 应用缩放 - 延迟确保DOM完全渲染
        setTimeout(() => {
            applyDeviceScale();
        }, 50);
        
        // 再次确认缩放（某些浏览器需要）
        setTimeout(() => {
            applyDeviceScale();
        }, 200);
        
        // 监听窗口大小变化
        const resizeHandler = () => {
            if (overlay.classList.contains('show')) {
                // 使用防抖，避免频繁计算
                clearTimeout(resizeHandler.timer);
                resizeHandler.timer = setTimeout(() => {
                    applyDeviceScale();
                }, 100);
            }
        };
        
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', resizeHandler);
        
        // 监听visualViewport变化（更精确的视口变化检测）
        if (window.visualViewport) {
            const visualViewportHandler = () => {
                if (overlay.classList.contains('show')) {
                    clearTimeout(visualViewportHandler.timer);
                    visualViewportHandler.timer = setTimeout(() => {
                        applyDeviceScale();
                    }, 100);
                }
            };
            window.visualViewport.addEventListener('resize', visualViewportHandler);
            window.visualViewport.addEventListener('scroll', visualViewportHandler);
            
            // 清理函数中也要移除这些监听器
            const originalCleanup = () => {
                window.removeEventListener('resize', resizeHandler);
                window.removeEventListener('orientationchange', resizeHandler);
                if (window.visualViewport) {
                    window.visualViewport.removeEventListener('resize', visualViewportHandler);
                    window.visualViewport.removeEventListener('scroll', visualViewportHandler);
                }
            };
            
            // 每分钟更新一次时间
            const timeInterval = setInterval(() => {
                if (overlay.classList.contains('show')) {
                    updateTime();
                } else {
                    clearInterval(timeInterval);
                    originalCleanup();
                }
            }, 60000);
        } else {
            // 每分钟更新一次时间（无visualViewport支持的浏览器）
            const timeInterval = setInterval(() => {
                if (overlay.classList.contains('show')) {
                    updateTime();
                } else {
                    clearInterval(timeInterval);
                    window.removeEventListener('resize', resizeHandler);
                    window.removeEventListener('orientationchange', resizeHandler);
                }
            }, 60000);
        }
    }

    // 应用用户的所有设置
    function applyUserDisplaySettings() {
        try {
            const saved = localStorage.getItem('iphone-simulator-config');
            if (!saved) return;
            
            const config = JSON.parse(saved);
            
            // 1. 应用灵动岛显示设置
            if (config.display && typeof config.display.showDynamicIsland !== 'undefined') {
                const dynamicIsland = document.getElementById('dynamic-island');
                if (dynamicIsland) {
                    dynamicIsland.style.display = config.display.showDynamicIsland ? 'flex' : 'none';
                }
            }
            
            // 2. 应用颜色设置
            if (config.colors) {
                // 手机外壳颜色
                const deviceShell = document.querySelector('.iphone-device');
                if (deviceShell && config.colors.deviceShell) {
                    deviceShell.style.background = config.colors.deviceShell;
                }
                
                // 状态栏颜色
                if (config.colors.statusBar) {
                    const statusElements = document.querySelectorAll('.status-bar, .status-left, .status-right, .status-carrier, .status-5g');
                    statusElements.forEach(el => {
                        el.style.color = config.colors.statusBar;
                    });
                    
                    // 信号条和电池
                    const signalBars = document.querySelectorAll('.signal-bar');
                    signalBars.forEach(bar => {
                        bar.style.background = config.colors.statusBar;
                    });
                    
                    const batteryIcon = document.querySelector('.battery-icon');
                    if (batteryIcon) {
                        batteryIcon.style.borderColor = config.colors.statusBar;
                    }
                    
                    const batteryLevel = document.querySelector('.battery-level');
                    if (batteryLevel) {
                        batteryLevel.style.background = config.colors.statusBar;
                    }
                }
                
                // 锁屏时间颜色
                if (config.colors.lockscreenTime) {
                    const lockscreenHour = document.querySelector('.lockscreen-hour');
                    if (lockscreenHour) {
                        lockscreenHour.style.color = config.colors.lockscreenTime;
                    }
                }
                
                // 锁屏日期颜色
                if (config.colors.lockscreenDate) {
                    const lockscreenDate = document.querySelector('.lockscreen-date');
                    if (lockscreenDate) {
                        lockscreenDate.style.color = config.colors.lockscreenDate;
                    }
                }
                
                // 应用名称颜色
                if (config.colors.appName) {
                    const appNames = document.querySelectorAll('.app-name');
                    appNames.forEach(name => {
                        name.style.color = config.colors.appName;
                    });
                }
            }
            
            // 3. 应用背景设置
            if (config.backgrounds) {
                // 锁屏背景
                const lockscreen = document.querySelector('.lockscreen');
                if (lockscreen && config.backgrounds.lockscreen) {
                    lockscreen.style.backgroundImage = `url('${config.backgrounds.lockscreen}')`;
                }
                
                // 主屏幕背景
                const iphoneScreen = document.querySelector('.iphone-screen');
                if (iphoneScreen && config.backgrounds.homescreen) {
                    iphoneScreen.style.backgroundImage = `url('${config.backgrounds.homescreen}')`;
                }
            }
            
            // 4. 应用图标设置
            if (config.icons) {
                const appIcons = document.querySelectorAll('.app-icon');
                appIcons.forEach((icon, index) => {
                    const iconConfig = config.icons[`app${index}`];
                    if (iconConfig) {
                        // 更新应用名称
                        const nameEl = icon.querySelector('.app-name');
                        if (nameEl && iconConfig.name) {
                            nameEl.textContent = iconConfig.name;
                        }
                        
                        // 更新图标图片
                        if (iconConfig.url) {
                            const imageEl = icon.querySelector('.app-icon-image');
                            if (imageEl) {
                                imageEl.style.backgroundImage = `url('${iconConfig.url}')`;
                                imageEl.style.backgroundSize = 'cover';
                                imageEl.style.backgroundPosition = 'center';
                                // 隐藏SVG
                                const svg = imageEl.querySelector('svg');
                                if (svg) svg.style.display = 'none';
                            }
                        }
                    }
                });
            }
            
            // 5. 应用Dock图标设置
            if (config.dockIcons) {
                const dockIconEls = document.querySelectorAll('.dock-icon');
                dockIconEls.forEach((icon, index) => {
                    const iconConfig = config.dockIcons[`dock${index}`];
                    if (iconConfig && iconConfig.url) {
                        const imageEl = icon.querySelector('.dock-icon-image');
                        if (imageEl) {
                            imageEl.style.backgroundImage = `url('${iconConfig.url}')`;
                            imageEl.style.backgroundSize = 'cover';
                            imageEl.style.backgroundPosition = 'center';
                            // 隐藏SVG
                            const svg = imageEl.querySelector('svg');
                            if (svg) svg.style.display = 'none';
                        }
                    }
                });
            }
            
        } catch (e) {
            console.error('应用用户设置失败:', e);
        }
    }

    // 最小化iPhone模拟器到悬浮球
    function minimizeiPhoneSimulator() {
        const overlay = document.getElementById('iphone-simulator-overlay');
        const floatingBall = document.getElementById('floating-ball');
        
        if (overlay && floatingBall) {
            overlay.classList.remove('show');
            floatingBall.classList.add('show');
            
            // 添加震动反馈（如果支持）
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        }
    }
    
    // 从悬浮球恢复iPhone模拟器
    function restoreiPhoneSimulator() {
        const overlay = document.getElementById('iphone-simulator-overlay');
        const floatingBall = document.getElementById('floating-ball');
        
        if (overlay && floatingBall) {
            floatingBall.classList.remove('show');
            overlay.classList.add('show');
            
            // 添加震动反馈（如果支持）
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        }
    }
    
    // 隐藏iPhone模拟器
    function hideiPhoneSimulator() {
        const overlay = document.getElementById('iphone-simulator-overlay');
        const floatingBall = document.getElementById('floating-ball');
        
        if (overlay) {
            overlay.classList.remove('show');
        }
        if (floatingBall) {
            floatingBall.classList.remove('show');
        }
    }

    // 显示关机界面
    function showShutdownOverlay() {
        const shutdownOverlay = document.getElementById('shutdown-overlay');
        if (shutdownOverlay) {
            // 重置滑块状态
            resetSlider();
            shutdownOverlay.classList.add('show');
        }
    }

    // 隐藏关机界面
    function hideShutdownOverlay() {
        const shutdownOverlay = document.getElementById('shutdown-overlay');
        if (shutdownOverlay) {
            shutdownOverlay.classList.remove('show');
            // 隐藏时也重置，确保下次打开时状态正确
            setTimeout(() => {
                resetSlider();
            }, 300);
        }
    }
    
    // 重置滑块状态
    function resetSlider() {
        const thumb = document.getElementById('shutdown-slider-thumb');
        const track = document.querySelector('.shutdown-slider-track');
        const textElement = document.querySelector('.shutdown-slider-text');
        
        if (thumb) {
            thumb.style.transition = '';
            thumb.style.transform = 'translateX(0)';
        }
        
        if (track) {
            track.classList.remove('sliding');
            track.style.setProperty('--slide-progress', '0%');
        }
        
        if (textElement) {
            textElement.style.opacity = '1';
        }
    }

    // 关机动画
    function shutdownAnimation() {
        const screen = document.querySelector('.iphone-screen');
        const shutdownOverlay = document.getElementById('shutdown-overlay');
        
        if (screen) {
            // 先隐藏关机界面
            if (shutdownOverlay) {
                shutdownOverlay.style.transition = 'opacity 0.3s ease';
                shutdownOverlay.style.opacity = '0';
            }
            
            // 延迟后开始关机动画
            setTimeout(() => {
                screen.classList.add('shutting-down');
            }, 300);
            
            // 关机动画完成后清理
            setTimeout(() => {
                hideiPhoneSimulator();
                screen.classList.remove('shutting-down');
                hideShutdownOverlay();
                
                // 重置关机界面
                if (shutdownOverlay) {
                    shutdownOverlay.style.transition = '';
                    shutdownOverlay.style.opacity = '';
                }
                
                // 重置滑块（通过hideShutdownOverlay中的resetSlider处理）
            }, 1500);
        }
    }

    // 初始化滑动关机
    function initializeSlider() {
        const thumb = document.getElementById('shutdown-slider-thumb');
        const track = document.querySelector('.shutdown-slider-track');
        
        if (!thumb || !track) return;
        
        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        let thumbStartX = 0;
        
        function getMaxSlide() {
            return track.offsetWidth - thumb.offsetWidth - 8;
        }
        
        function handleStart(e) {
            isDragging = true;
            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            startX = clientX;
            
            // 获取当前thumb的位置
            const transform = window.getComputedStyle(thumb).transform;
            if (transform && transform !== 'none') {
                const matrix = new DOMMatrix(transform);
                thumbStartX = matrix.m41;
            } else {
                thumbStartX = 0;
            }
            
            thumb.style.transition = 'none';
            e.preventDefault();
        }
        
        function handleMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const deltaX = clientX - startX;
            currentX = thumbStartX + deltaX;
            
            const maxSlide = getMaxSlide();
            if (currentX < 0) currentX = 0;
            if (currentX > maxSlide) currentX = maxSlide;
            
            thumb.style.transform = `translateX(${currentX}px)`;
            
            // 计算进度百分比
            const progress = currentX / maxSlide;
            
            // 更新红色轨道填充
            track.classList.add('sliding');
            track.style.setProperty('--slide-progress', `${progress * 100}%`);
            
            // 计算文字透明度
            const textElement = document.querySelector('.shutdown-slider-text');
            if (textElement) {
                textElement.style.opacity = 1 - progress;
            }
            
            // 如果滑到底部，触发关机
            if (currentX >= maxSlide * 0.9) {
                isDragging = false;
                shutdownAnimation();
            }
        }
        
        function handleEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            
            const maxSlide = getMaxSlide();
            
            // 如果没有滑到底，回弹
            if (currentX < maxSlide * 0.9) {
                thumb.style.transition = 'transform 0.3s ease';
                thumb.style.transform = 'translateX(0)';
                
                // 重置红色轨道
                track.style.setProperty('--slide-progress', '0%');
                setTimeout(() => {
                    track.classList.remove('sliding');
                }, 300);
                
                const textElement = document.querySelector('.shutdown-slider-text');
                if (textElement) {
                    textElement.style.opacity = '1';
                }
            }
            
            currentX = 0;
            thumbStartX = 0;
        }
        
        // 鼠标事件
        thumb.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // 触摸事件
        thumb.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    }

    // 初始化锁屏滑动解锁
    function initializeLockscreenSwipe() {
        const lockscreen = document.querySelector('.lockscreen');
        if (!lockscreen) return;
        
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let startTime = 0;
        
        function handleStart(e) {
            const touch = e.touches ? e.touches[0] : e;
            startY = touch.clientY;
            currentY = startY;
            startTime = Date.now();
            isDragging = true;
            
            // 移除过渡效果，使拖动更流畅
            lockscreen.style.transition = 'none';
        }
        
        function handleMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            currentY = touch.clientY;
            
            // 计算移动距离（只允许向上滑动）
            const deltaY = currentY - startY;
            
            if (deltaY < 0) {
                // 向上滑动，应用阻尼效果
                const damping = 0.6;
                const translateY = deltaY * damping;
                lockscreen.style.transform = `translateY(${translateY}px)`;
                
                // 根据滑动距离调整透明度
                const opacity = 1 + (deltaY / 500);
                lockscreen.style.opacity = Math.max(0, opacity);
            }
        }
        
        function handleEnd(e) {
            if (!isDragging) return;
            
            isDragging = false;
            const deltaY = currentY - startY;
            const deltaTime = Date.now() - startTime;
            const velocity = Math.abs(deltaY) / deltaTime; // 像素/毫秒
            
            // 恢复过渡效果
            lockscreen.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
            
            // 判断是否解锁：向上滑动超过150px 或 快速向上滑动（速度>0.5px/ms）
            if (deltaY < -150 || (deltaY < -50 && velocity > 0.5)) {
                // 解锁
                lockscreen.classList.add('unlocked');
                
                // 添加震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
                
                console.log('锁屏已解锁');
            } else {
                // 回弹
                lockscreen.style.transform = 'translateY(0)';
                lockscreen.style.opacity = '1';
            }
        }
        
        // 鼠标事件（桌面端）
        lockscreen.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // 触摸事件（移动端）
        lockscreen.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    }

    // 初始化悬浮球拖拽
    function initializeFloatingBallDrag() {
        const floatingBall = document.getElementById('floating-ball');
        if (!floatingBall) return;
        
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialX = 0;
        let initialY = 0;
        let hasMoved = false;
        
        function handleStart(e) {
            const touch = e.type.includes('mouse') ? e : e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            // 获取当前位置
            const rect = floatingBall.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            isDragging = true;
            hasMoved = false;
            floatingBall.classList.add('dragging');
            
            e.preventDefault();
        }
        
        function handleMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.type.includes('mouse') ? e : e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            // 如果移动距离超过5px，认为是拖拽
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMoved = true;
            }
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // 限制在屏幕范围内
            const maxX = window.innerWidth - floatingBall.offsetWidth;
            const maxY = window.innerHeight - floatingBall.offsetHeight;
            
            const boundedX = Math.max(0, Math.min(newX, maxX));
            const boundedY = Math.max(0, Math.min(newY, maxY));
            
            floatingBall.style.left = boundedX + 'px';
            floatingBall.style.top = boundedY + 'px';
            floatingBall.style.right = 'auto';
            floatingBall.style.transform = 'none';
        }
        
        function handleEnd(e) {
            if (!isDragging) return;
            
            isDragging = false;
            floatingBall.classList.remove('dragging');
            
            // 如果没有移动，触发点击事件
            if (!hasMoved) {
                restoreiPhoneSimulator();
            } else {
                // 吸附到最近的边缘
                const rect = floatingBall.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const screenWidth = window.innerWidth;
                
                // 添加过渡动画
                floatingBall.style.transition = 'left 0.3s ease, right 0.3s ease';
                
                if (centerX < screenWidth / 2) {
                    // 吸附到左边
                    floatingBall.style.left = '20px';
                    floatingBall.style.right = 'auto';
                } else {
                    // 吸附到右边
                    floatingBall.style.left = 'auto';
                    floatingBall.style.right = '20px';
                }
                
                // 移除过渡动画
                setTimeout(() => {
                    floatingBall.style.transition = '';
                }, 300);
            }
            
            hasMoved = false;
        }
        
        // 鼠标事件
        floatingBall.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // 触摸事件
        floatingBall.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    }

    // 初始化事件监听器
    function initializeEventListeners() {
        // 初始化悬浮球拖拽
        initializeFloatingBallDrag();
        
        // 灵动岛长按事件 - 显示关机界面
        const dynamicIsland = document.getElementById('dynamic-island');
        if (dynamicIsland) {
            let pressTimer;
            
            function startPress(e) {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    showShutdownOverlay();
                    // 添加震动反馈（如果支持）
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }, 500); // 长按500ms
            }
            
            function cancelPress() {
                clearTimeout(pressTimer);
            }
            
            dynamicIsland.addEventListener('mousedown', startPress);
            dynamicIsland.addEventListener('touchstart', startPress, { passive: false });
            dynamicIsland.addEventListener('mouseup', cancelPress);
            dynamicIsland.addEventListener('mouseleave', cancelPress);
            dynamicIsland.addEventListener('touchend', cancelPress);
            dynamicIsland.addEventListener('touchcancel', cancelPress);
        }

        // 取消关机按钮
        const cancelBtn = document.getElementById('shutdown-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                hideShutdownOverlay();
            });
        }
        
        // 初始化滑动关机
        initializeSlider();
        
        // 初始化锁屏滑动解锁
        initializeLockscreenSwipe();

        // 点击overlay背景关闭（仅桌面端）
        const overlay = document.getElementById('iphone-simulator-overlay');
        if (overlay && !isMobileDevice()) {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    hideiPhoneSimulator();
                }
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('iphone-simulator-overlay');
                if (overlay && overlay.classList.contains('show')) {
                    hideiPhoneSimulator();
                }
            }
        });

        // 应用图标点击效果
        const appIcons = document.querySelectorAll('.app-icon, .dock-icon');
        appIcons.forEach(icon => {
            // 移除旧的事件监听器，防止重复绑定
            const oldHandler = icon._clickHandler;
            if (oldHandler) {
                icon.removeEventListener('click', oldHandler);
            }
            
            // 创建新的处理函数
            const clickHandler = function(e) {
                e.stopPropagation(); // 阻止事件冒泡
                e.preventDefault(); // 阻止默认行为
                const appName = this.querySelector('.app-name')?.textContent;
                const iconImage = this.querySelector('.dock-icon-image');
                const iconClass = iconImage ? iconImage.className : '';
                console.log('应用被点击:', appName || 'Dock应用', iconClass);
                
                // 检查是否是Dock栏的电话图标
                if (iconClass.includes('dock-phone')) {
                    if (window.iPhonePhone) {
                        window.iPhonePhone.show();
                    }
                    return;
                }
                
                // 检查是否是Dock栏的短信图标（第二个）
                if (iconClass.includes('dock-messages')) {
                    if (window.iPhoneMessages) {
                        window.iPhoneMessages.show();
                    }
                    return;
                }
                
                // 检查是否是Dock栏的Safari浏览器图标（第三个）
                if (iconClass.includes('dock-safari')) {
                    if (window.iPhoneBrowser) {
                        window.iPhoneBrowser.show();
                    }
                    return;
                }
                
                // 根据应用名称打开对应页面
                if (appName === '钱包') {
                    if (window.iPhoneWallet) {
                        window.iPhoneWallet.show();
                    }
                    return;
                } else if (appName === '备忘录') {
                    if (window.iPhoneNotes) {
                        window.iPhoneNotes.show();
                    }
                    return;
                } else if (appName === '相机') {
                    console.log('✅ 相机app被正确识别，准备打开相册');
                    // 先关闭所有其他应用页面
                    const allAppPages = document.querySelectorAll('[id$="-page"]');
                    allAppPages.forEach(page => {
                        if (page.classList.contains('show')) {
                            page.classList.remove('show');
                        }
                    });
                    // 打开相册功能
                    if (window.iPhonePhotos) {
                        console.log('✅ 调用 window.iPhonePhotos.show()');
                        window.iPhonePhotos.show();
                    }
                    return;
                } else if (appName === '屏幕使用') {
                    if (window.iPhoneScreenTime) {
                        window.iPhoneScreenTime.show();
                    }
                    return;
                } else if (appName === '日历') {
                    if (window.iPhoneCalendar) {
                        window.iPhoneCalendar.show();
                    }
                    return;
                } else if (appName === '地图') {
                    if (window.iPhoneMaps) {
                        window.iPhoneMaps.show();
                    }
                    return;
                } else if (appName === '健康') {
                    if (window.iPhoneHealth) {
                        window.iPhoneHealth.show();
                    }
                    return;
                } else if (appName === '相册') {
                    if (window.iPhonePhotos) {
                        window.iPhonePhotos.show();
                    }
                    return;
                } else if (appName === '邮件') {
                    if (window.iPhoneMail) {
                        window.iPhoneMail.show();
                    }
                    return;
                } else if (appName === '最小化') {
                    // 最小化查手机
                    minimizeiPhoneSimulator();
                    return;
                } else if (appName === '关机') {
                    // 直接关闭查手机
                    hideiPhoneSimulator();
                    return;
                }
            };
            
            // 保存处理函数引用并添加监听器
            icon._clickHandler = clickHandler;
            icon.addEventListener('click', clickHandler);
        });
    }

    // 绑定"查手机"按钮
    function initPhoneButton() {
        const phoneBtn = document.getElementById('btn-phone');
        if (phoneBtn) {
            // 移除可能存在的旧事件监听器
            const newPhoneBtn = phoneBtn.cloneNode(true);
            phoneBtn.parentNode.replaceChild(newPhoneBtn, phoneBtn);
            
            // 添加新的事件监听器
            newPhoneBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showiPhoneSimulator();
            });
            
            const browser = detectBrowser();
            const browserName = Object.keys(browser).find(key => browser[key]) || 'unknown';
            console.log('iPhone模拟器已初始化 - 浏览器:', browserName);
        }
    }
    
    // 页面可见性变化时重新计算（处理某些浏览器的特殊情况）
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            const overlay = document.getElementById('iphone-simulator-overlay');
            if (overlay && overlay.classList.contains('show')) {
                setTimeout(() => {
                    applyDeviceScale();
                }, 100);
            }
        }
    });

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPhoneButton);
    } else {
        initPhoneButton();
    }

    // 导出函数供外部使用
    window.iPhoneSimulator = {
        show: showiPhoneSimulator,
        hide: hideiPhoneSimulator
    };

})();