
/**
 * iPhone 17 模拟器 - 9:16竖屏可拖动缩放模态框
 * 支持四角缩放、拖动移动、自动保存位置和大小
 */

(function() {
    'use strict';

    // 检测是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768;
    }
    
    // 存储配置的键名
    const STORAGE_KEY = 'iphone-simulator-config';
    
    // 默认配置
    const DEFAULT_CONFIG = {
        width: 390,  // 9:16比例，默认iPhone宽度
        left: null,  // null表示居中
        top: null    // null表示居中
    };
    
    // 加载保存的配置
    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('加载配置失败:', e);
        }
        return { ...DEFAULT_CONFIG };
    }
    
    // 保存配置
    function saveConfig(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn('保存配置失败:', e);
        }
    }

    // 创建iPhone模拟器HTML结构
    function createiPhoneSimulator() {
        const overlay = document.createElement('div');
        overlay.className = 'iphone-simulator-overlay';
        overlay.id = 'iphone-simulator-overlay';
        
        overlay.innerHTML = `
            <div class="iphone-device" id="iphone-device">
                <!-- 四角缩放手柄 -->
                <div class="resize-handle top-left" data-direction="nw"></div>
                <div class="resize-handle top-right" data-direction="ne"></div>
                <div class="resize-handle bottom-left" data-direction="sw"></div>
                <div class="resize-handle bottom-right" data-direction="se"></div>
                
                <!-- 拖动手柄（状态栏区域） -->
                <div class="drag-handle" id="drag-handle"></div>
                
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
                            <!-- 5G网络 -->
                            <div class="status-icon network-type">5G</div>
                            <!-- 信号强度 -->
                            <div class="status-icon signal-bars">
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                            </div>
                            <!-- WiFi图标 -->
                            <div class="status-icon wifi-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-4c-2.2 0-4 1.8-4 4h2c0-1.1.9-2 2-2s2 .9 2 2h2c0-2.2-1.8-4-4-4zm0-4c-3.3 0-6 2.7-6 6h2c0-2.2 1.8-4 4-4s4 1.8 4 4h2c0-3.3-2.7-6-6-6z"/>
                                </svg>
                            </div>
                            <!-- 电池图标 -->
                            <div class="status-icon battery-icon">
                                <div class="battery-body">
                                    <div class="battery-level" style="width: 85%;"></div>
                                </div>
                                <div class="battery-tip"></div>
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
                                            <svg viewBox="0 0 50 50" fill="white">
                                                <path d="M25 2 L20 12 L30 12 Z M18 14 L18 18 L32 18 L32 14 Z M18 20 L18 42 C18 44.2 19.8 46 22 46 L28 46 C30.2 46 32 44.2 32 42 L32 20 Z"/>
                                            </svg>
                                        </div>
                                        <div class="lockscreen-shortcut lockscreen-camera">
                                            <svg viewBox="0 0 50 50" fill="white">
                                                <path d="M18 8 L16 12 L10 12 C7.8 12 6 13.8 6 16 L6 38 C6 40.2 7.8 42 10 42 L40 42 C42.2 42 44 40.2 44 38 L44 16 C44 13.8 42.2 12 40 12 L34 12 L32 8 Z M25 18 C29.4 18 33 21.6 33 26 C33 30.4 29.4 34 25 34 C20.6 34 17 30.4 17 26 C17 21.6 20.6 18 25 18 Z M25 21 C22.2 21 20 23.2 20 26 C20 28.8 22.2 31 25 31 C27.8 31 30 28.8 30 26 C30 23.2 27.8 21 25 21 Z"/>
                                            </svg>
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

    // 应用设备位置和大小
    function applyDeviceTransform(device, config) {
        const isMobile = isMobileDevice();
        
        if (isMobile) {
            // 移动端：居中显示，CSS已处理
            return;
        }
        
        // 桌面端：应用保存的位置和大小
        device.style.width = `${config.width}px`;
        
        if (config.left !== null && config.top !== null) {
            device.style.left = `${config.left}px`;
            device.style.top = `${config.top}px`;
            device.style.transform = 'none';
        } else {
            // 居中显示
            device.style.left = '50%';
            device.style.top = '50%';
            device.style.transform = 'translate(-50%, -50%)';
        }
    }

    // 初始化拖动功能
    function initializeDrag(device, dragHandle) {
        if (isMobileDevice()) return; // 移动端不启用拖动
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        function handleDragStart(e) {
            // 只在拖动手柄上触发
            if (e.target !== dragHandle && !dragHandle.contains(e.target)) return;
            
            isDragging = true;
            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            
            startX = clientX;
            startY = clientY;
            
            const rect = device.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            device.style.cursor = 'move';
            e.preventDefault();
        }
        
        function handleDragMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            device.style.left = `${newLeft}px`;
            device.style.top = `${newTop}px`;
            device.style.transform = 'none';
        }
        
        function handleDragEnd(e) {
            if (!isDragging) return;
            
            isDragging = false;
            device.style.cursor = '';
            
            // 保存位置
            const rect = device.getBoundingClientRect();
            const config = loadConfig();
            config.left = rect.left;
            config.top = rect.top;
            saveConfig(config);
        }
        
        dragHandle.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        
        dragHandle.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
    }

    // 初始化缩放功能
    function initializeResize(device) {
        const handles = device.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            let direction;
            
            function handleResizeStart(e) {
                isResizing = true;
                direction = handle.dataset.direction;
                
                const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
                
                startX = clientX;
                startY = clientY;
                
                const rect = device.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                startLeft = rect.left;
                startTop = rect.top;
                
                e.preventDefault();
                e.stopPropagation();
            }
            
            function handleResizeMove(e) {
                if (!isResizing) return;
                
                e.preventDefault();
                const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
                
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;
                
                let newWidth = startWidth;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // 根据方向计算新尺寸
                switch (direction) {
                    case 'se': // 右下角
                        newWidth = startWidth + deltaX;
                        break;
                    case 'sw': // 左下角
                        newWidth = startWidth - deltaX;
                        newLeft = startLeft + deltaX;
                        break;
                    case 'ne': // 右上角
                        newWidth = startWidth + deltaX;
                        newTop = startTop + deltaY;
                        break;
                    case 'nw': // 左上角
                        newWidth = startWidth - deltaX;
                        newLeft = startLeft + deltaX;
                        newTop = startTop + deltaY;
                        break;
                }
                
                // 限制最小和最大宽度
                const minWidth = 300;
                const maxWidth = Math.min(window.innerWidth * 0.9, 500);
                newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
                
                // 保持9:16比例
                const newHeight = newWidth * 16 / 9;
                
                // 应用新尺寸
                device.style.width = `${newWidth}px`;
                device.style.height = `${newHeight}px`;
                
                // 更新位置（对于左侧和顶部的手柄）
                if (direction.includes('w')) {
                    const actualDeltaX = startWidth - newWidth;
                    device.style.left = `${startLeft + actualDeltaX}px`;
                }
                if (direction.includes('n')) {
                    const actualDeltaY = startHeight - newHeight;
                    device.style.top = `${startTop + actualDeltaY}px`;
                }
                
                device.style.transform = 'none';
            }
            
            function handleResizeEnd(e) {
                if (!isResizing) return;
                
                isResizing = false;
                
                // 保存配置
                const rect = device.getBoundingClientRect();
                const config = loadConfig();
                config.width = rect.width;
                config.left = rect.left;
                config.top = rect.top;
                saveConfig(config);
            }
            
            handle.addEventListener('mousedown', handleResizeStart);
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            
            handle.addEventListener('touchstart', handleResizeStart, { passive: false });
            document.addEventListener('touchmove', handleResizeMove, { passive: false });
            document.addEventListener('touchend', handleResizeEnd);
        });
    }

    // 显示iPhone模拟器
    function showiPhoneSimulator() {
        let overlay = document.getElementById('iphone-simulator-overlay');
        
        if (!overlay) {
            overlay = createiPhoneSimulator();
            initializeEventListeners();
        }
        
        const device = document.getElementById('iphone-device');
        const dragHandle = document.getElementById('drag-handle');
        
        // 重置锁屏状态
        const lockscreen = overlay.querySelector('.lockscreen');
        if (lockscreen) {
            lockscreen.classList.remove('unlocked');
            lockscreen.style.transform = 'translateY(0)';
            lockscreen.style.opacity = '1';
        }
        
        overlay.classList.add('show');
        updateTime();
        
        // 应用保存的配置
        const config = loadConfig();
        applyDeviceTransform(device, config);
        
        // 初始化拖动和缩放
        if (!isMobileDevice()) {
            initializeDrag(device, dragHandle);
            initializeResize(device);
        }
        
        // 每分钟更新一次时间
        const timeInterval = setInterval(() => {
            if (overlay.classList.contains('show')) {
                updateTime();
            } else {
                clearInterval(timeInterval);
            }
        }, 60000);
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
            resetSlider();
            shutdownOverlay.classList.add('show');
        }
    }

    // 隐藏关机界面
    function hideShutdownOverlay() {
        const shutdownOverlay = document.getElementById('shutdown-overlay');
        if (shutdownOverlay) {
            shutdownOverlay.classList.remove('show');
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
            if (shutdownOverlay) {
                shutdownOverlay.style.transition = 'opacity 0.3s ease';
                shutdownOverlay.style.opacity = '0';
            }
            
            setTimeout(() => {
                screen.classList.add('shutting-down');
            }, 300);
            
            setTimeout(() => {
                hideiPhoneSimulator();
                screen.classList.remove('shutting-down');
                hideShutdownOverlay();
                
                if (shutdownOverlay) {
                    shutdownOverlay.style.transition = '';
                    shutdownOverlay.style.opacity = '';
                }
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
            
            const progress = currentX / maxSlide;
            
            track.classList.add('sliding');
            track.style.setProperty('--slide-progress', `${progress * 100}%`);
            
            const textElement = document.querySelector('.shutdown-slider-text');
            if (textElement) {
                textElement.style.opacity = 1 - progress;
            }
            
            if (currentX >= maxSlide * 0.9) {
                isDragging = false;
                shutdownAnimation();
            }
        }
        
        function handleEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            
            const maxSlide = getMaxSlide();
            
            if (currentX < maxSlide * 0.9) {
                thumb.style.transition = 'transform 0.3s ease';
                thumb.style.transform = 'translateX(0)';
                
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
        
        thumb.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
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
            
            lockscreen.style.transition = 'none';
        }
        
        function handleMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            currentY = touch.clientY;
            
            const deltaY = currentY - startY;
            
            if (deltaY < 0) {
                const damping = 0.6;
                const translateY = deltaY * damping;
                lockscreen.style.transform = `translateY(${translateY}px)`;
                
                const opacity = 1 + (deltaY / 500);
                lockscreen.style.opacity = Math.max(0, opacity);
            }
        }
        
        function handleEnd(e) {
            if (!isDragging) return;
            
            isDragging = false;
            const deltaY = currentY - startY;
            const deltaTime = Date.now() - startTime;
            const velocity = Math.abs(deltaY) / deltaTime;
            
            lockscreen.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
            
            if (deltaY < -150 || (deltaY < -50 && velocity > 0.5)) {
                lockscreen.classList.add('unlocked');
                
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            } else {
                lockscreen.style.transform = 'translateY(0)';
                lockscreen.style.opacity = '1';
            }
        }
        
        lockscreen.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        lockscreen.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    }

    // 初始化事件监听器
    function initializeEventListeners() {
        // 灵动岛长按事件
        const dynamicIsland = document.getElementById('dynamic-island');
        if (dynamicIsland) {
            let pressTimer;
            
            function startPress(e) {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    showShutdownOverlay();
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }, 500);
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
        
        initializeSlider();
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
                console.log('应用被点击:', this.querySelector('.app-name')?.textContent || 'Dock应用');
            });
        });
    }

    // 绑定"查手机"按钮
    function initPhoneButton() {
        const phoneBtn = document.getElementById('btn-phone');
        if (phoneBtn) {
            const newPhoneBtn = phoneBtn.cloneNode(true);
            phoneBtn.parentNode.replaceChild(newPhoneBtn, phoneBtn);
            
            newPhoneBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showiPhoneSimulator();
            });
            
            console.log('iPhone模拟器已初始化 - 16:9可拖动缩放模态框');
        }
    }

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