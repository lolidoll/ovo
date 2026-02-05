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
                            <span class="status-time" id="status-time">9:41</span>
                        </div>
                        <div class="status-right">
                            <div class="status-icon signal-bars">
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                            </div>
                            <div class="status-icon wifi-icon">
                                <div class="wifi-arc"></div>
                                <div class="wifi-arc"></div>
                                <div class="wifi-arc"></div>
                                <div class="wifi-dot"></div>
                            </div>
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
                                <div class="lockscreen-time">
                                    <div class="lockscreen-hour" id="lockscreen-hour">9:41</div>
                                    <div class="lockscreen-date" id="lockscreen-date">2月5日 星期三</div>
                                </div>
                                <div class="lockscreen-notifications">
                                    <!-- 可以添加通知卡片 -->
                                </div>
                                <div class="lockscreen-bottom">
                                    <div class="lockscreen-shortcuts">
                                        <div class="lockscreen-shortcut lockscreen-flashlight">
                                            <svg viewBox="0 0 24 24" fill="white">
                                                <path d="M9 2L7 6h10l-2-4H9zm-1 6v2h8V8H8zm0 4v8c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-8H8z"/>
                                            </svg>
                                        </div>
                                        <div class="lockscreen-shortcut lockscreen-camera">
                                            <i class="fas fa-camera"></i>
                                        </div>
                                    </div>
                                    <div class="lockscreen-indicator">
                                        <div class="lockscreen-swipe-bar"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 应用图标网格 -->
                            <div class="app-grid">
                                <div class="app-icon">
                                    <div class="app-icon-image app-messages">
                                        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                                    </div>
                                    <span class="app-name">信息</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-phone">
                                        <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                                    </div>
                                    <span class="app-name">电话</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-safari">
                                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                                    </div>
                                    <span class="app-name">Safari</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-music">
                                        <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                    </div>
                                    <span class="app-name">音乐</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-photos">
                                        <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                                    </div>
                                    <span class="app-name">照片</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-camera">
                                        <svg viewBox="0 0 24 24"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                                    </div>
                                    <span class="app-name">相机</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-mail">
                                        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                    </div>
                                    <span class="app-name">邮件</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-maps">
                                        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                    </div>
                                    <span class="app-name">地图</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-weather">
                                        <svg viewBox="0 0 24 24"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>
                                    </div>
                                    <span class="app-name">天气</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-clock">
                                        <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                                    </div>
                                    <span class="app-name">时钟</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-settings">
                                        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                                    </div>
                                    <span class="app-name">设置</span>
                                </div>
                                <div class="app-icon">
                                    <div class="app-icon-image app-appstore">
                                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                    </div>
                                    <span class="app-name">App Store</span>
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
                                    <div class="dock-icon-image dock-safari">
                                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                                    </div>
                                </div>
                                <div class="dock-icon">
                                    <div class="dock-icon-image dock-messages">
                                        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                                    </div>
                                </div>
                                <div class="dock-icon">
                                    <div class="dock-icon-image dock-music">
                                        <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
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
        
        // 手机端：计算最佳缩放比例
        const deviceWidth = 390;
        const deviceHeight = 844;
        
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
        
        // 动态计算padding，确保在不同浏览器中都有合适的边距
        // 使用视口宽度的0.5%作为padding，最小2px，最大8px（进一步缩小间隔）
        const paddingPercent = Math.max(2, Math.min(viewportWidth * 0.005, 8));
        const padding = paddingPercent * 2; // 左右两边
        
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding;
        
        const scaleX = availableWidth / deviceWidth;
        const scaleY = availableHeight / deviceHeight;
        
        // 取较小值，确保完整显示，最大不超过1
        // 根据浏览器类型调整安全系数
        let safetyFactor = 0.98;
        if (browser.isOther || browser.isUC || browser.isQQ) {
            // 对于不常见的浏览器，使用更保守的缩放
            safetyFactor = 0.95;
        }
        
        const scale = Math.min(scaleX, scaleY, 1) * safetyFactor;
        
        // 应用transform，同时设置webkit前缀以确保兼容性
        device.style.transform = `scale(${scale})`;
        device.style.webkitTransform = `scale(${scale})`;
        
        console.log('Device scale applied:', {
            browser: navigator.userAgent.match(/\w+\/[\d.]+/)?.[0] || 'Unknown',
            browserType: Object.keys(browser).find(key => browser[key]) || 'unknown',
            viewportMethod: window.visualViewport ? 'visualViewport' : 'fallback',
            viewportSize: `${viewportWidth}x${viewportHeight}`,
            padding: padding.toFixed(1),
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

    // 隐藏iPhone模拟器
    function hideiPhoneSimulator() {
        const overlay = document.getElementById('iphone-simulator-overlay');
        if (overlay) {
            overlay.classList.remove('show');
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

    // 初始化事件监听器
    function initializeEventListeners() {
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
            icon.addEventListener('click', function() {
                // 这里可以添加打开应用的逻辑
                console.log('应用被点击:', this.querySelector('.app-name')?.textContent || 'Dock应用');
            });
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