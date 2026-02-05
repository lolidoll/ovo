/**
 * iPhone 设置页面功能
 * 允许用户自定义颜色、背景图、图标等
 */

(function() {
    'use strict';

    // 默认配置
    const defaultConfig = {
        colors: {
            statusBar: '#ffffff',
            lockscreenTime: '#ffffff',
            lockscreenDate: '#ffffff',
            appName: '#ffffff'
        },
        backgrounds: {
            lockscreen: 'https://image.uglycat.cc/fx1inq.jpg',
            homescreen: 'https://image.uglycat.cc/d2r7d4.jpg'
        },
        icons: {
            app0: { url: '', name: '备忘录' },
            app1: { url: '', name: '相机' },
            app2: { url: '', name: 'App Store' },
            app3: { url: '', name: '日历' },
            app4: { url: '', name: '地图' },
            app5: { url: '', name: '健康' },
            app6: { url: '', name: '钱包' },
            app7: { url: '', name: '邮件' },
            app8: { url: '', name: '抖音' },
            app9: { url: '', name: '小红书' }
        },
        dockIcons: {
            dock0: { url: '', name: '电话' },
            dock1: { url: '', name: '信息' },
            dock2: { url: '', name: 'Safari' },
            dock3: { url: '', name: '设置' }
        }
    };

    // 当前配置
    let currentConfig = JSON.parse(JSON.stringify(defaultConfig));

    // 加载保存的配置
    function loadConfig() {
        const saved = localStorage.getItem('iphone-simulator-config');
        if (saved) {
            try {
                currentConfig = JSON.parse(saved);
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }
        applyConfig();
    }

    // 保存配置
    function saveConfig() {
        localStorage.setItem('iphone-simulator-config', JSON.stringify(currentConfig));
        applyConfig();
    }

    // 应用配置
    function applyConfig() {
        // 应用颜色
        applyColors();
        // 应用背景
        applyBackgrounds();
        // 应用图标
        applyIcons();
    }

    // 应用颜色配置
    function applyColors() {
        const colors = currentConfig.colors;
        
        // 状态栏颜色
        const statusElements = document.querySelectorAll('.status-bar, .status-left, .status-right, .status-carrier, .status-5g');
        statusElements.forEach(el => {
            el.style.color = colors.statusBar;
        });
        
        // 信号条和电池
        const signalBars = document.querySelectorAll('.signal-bar');
        signalBars.forEach(bar => {
            bar.style.background = colors.statusBar;
        });
        
        const batteryIcon = document.querySelector('.battery-icon');
        if (batteryIcon) {
            batteryIcon.style.borderColor = colors.statusBar;
        }
        
        const batteryLevel = document.querySelector('.battery-level');
        if (batteryLevel) {
            batteryLevel.style.background = colors.statusBar;
        }
        
        // 锁屏时间
        const lockscreenHour = document.querySelector('.lockscreen-hour');
        if (lockscreenHour) {
            lockscreenHour.style.color = colors.lockscreenTime;
        }
        
        const lockscreenDate = document.querySelector('.lockscreen-date');
        if (lockscreenDate) {
            lockscreenDate.style.color = colors.lockscreenDate;
        }
        
        // 应用名称
        const appNames = document.querySelectorAll('.app-name');
        appNames.forEach(name => {
            name.style.color = colors.appName;
        });
    }

    // 应用背景配置
    function applyBackgrounds() {
        const backgrounds = currentConfig.backgrounds;
        
        // 锁屏背景
        const lockscreen = document.querySelector('.lockscreen');
        if (lockscreen && backgrounds.lockscreen) {
            lockscreen.style.backgroundImage = `url('${backgrounds.lockscreen}')`;
        }
        
        // 主屏幕背景
        const iphoneScreen = document.querySelector('.iphone-screen');
        if (iphoneScreen && backgrounds.homescreen) {
            iphoneScreen.style.backgroundImage = `url('${backgrounds.homescreen}')`;
        }
    }

    // 应用图标配置
    function applyIcons() {
        const icons = currentConfig.icons;
        const dockIcons = currentConfig.dockIcons;
        
        // 应用主屏幕图标
        const appIcons = document.querySelectorAll('.app-icon');
        appIcons.forEach((icon, index) => {
            const config = icons[`app${index}`];
            if (config) {
                const nameEl = icon.querySelector('.app-name');
                if (nameEl && config.name) {
                    nameEl.textContent = config.name;
                }
                
                if (config.url) {
                    const imageEl = icon.querySelector('.app-icon-image');
                    if (imageEl) {
                        imageEl.style.backgroundImage = `url('${config.url}')`;
                        imageEl.style.backgroundSize = 'cover';
                        imageEl.style.backgroundPosition = 'center';
                        // 隐藏SVG
                        const svg = imageEl.querySelector('svg');
                        if (svg) svg.style.display = 'none';
                    }
                }
            }
        });
        
        // 应用Dock图标
        const dockIconEls = document.querySelectorAll('.dock-icon');
        dockIconEls.forEach((icon, index) => {
            const config = dockIcons[`dock${index}`];
            if (config && config.url) {
                const imageEl = icon.querySelector('.dock-icon-image');
                if (imageEl) {
                    imageEl.style.backgroundImage = `url('${config.url}')`;
                    imageEl.style.backgroundSize = 'cover';
                    imageEl.style.backgroundPosition = 'center';
                    // 隐藏SVG
                    const svg = imageEl.querySelector('svg');
                    if (svg) svg.style.display = 'none';
                }
            }
        });
    }

    // 创建设置页面HTML
    function createSettingsPage() {
        const settingsHTML = `
            <div class="iphone-settings-page" id="iphone-settings-page">
                <div class="settings-header">
                    <button class="settings-back-btn" id="settings-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        返回
                    </button>
                    <div class="settings-title">设置</div>
                </div>
                
                <div class="settings-content">
                    <!-- 颜色设置 -->
                    <div class="settings-section">
                        <div class="settings-section-title">颜色设置</div>
                        <div class="settings-group">
                            <div class="settings-item">
                                <div class="settings-item-label">状态栏颜色</div>
                                <div class="color-picker-wrapper">
                                    <div class="color-preview" id="color-statusBar" style="background: ${currentConfig.colors.statusBar}"></div>
                                    <input type="color" class="color-input" id="color-input-statusBar" value="${currentConfig.colors.statusBar}">
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">锁屏时间颜色</div>
                                <div class="color-picker-wrapper">
                                    <div class="color-preview" id="color-lockscreenTime" style="background: ${currentConfig.colors.lockscreenTime}"></div>
                                    <input type="color" class="color-input" id="color-input-lockscreenTime" value="${currentConfig.colors.lockscreenTime}">
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">锁屏日期颜色</div>
                                <div class="color-picker-wrapper">
                                    <div class="color-preview" id="color-lockscreenDate" style="background: ${currentConfig.colors.lockscreenDate}"></div>
                                    <input type="color" class="color-input" id="color-input-lockscreenDate" value="${currentConfig.colors.lockscreenDate}">
                                </div>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-label">应用名称颜色</div>
                                <div class="color-picker-wrapper">
                                    <div class="color-preview" id="color-appName" style="background: ${currentConfig.colors.appName}"></div>
                                    <input type="color" class="color-input" id="color-input-appName" value="${currentConfig.colors.appName}">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 背景设置 -->
                    <div class="settings-section">
                        <div class="settings-section-title">背景设置</div>
                        <div class="settings-group">
                            <div class="settings-item" style="flex-direction: column; align-items: stretch;">
                                <div class="settings-item-label">锁屏背景</div>
                                <input type="text" class="settings-input" id="bg-lockscreen" placeholder="输入图片URL" value="${currentConfig.backgrounds.lockscreen}">
                                <button class="file-upload-btn" onclick="document.getElementById('file-lockscreen').click()">选择本地图片</button>
                                <input type="file" id="file-lockscreen" accept="image/*" style="display:none">
                            </div>
                            <div class="settings-item" style="flex-direction: column; align-items: stretch;">
                                <div class="settings-item-label">主屏幕背景</div>
                                <input type="text" class="settings-input" id="bg-homescreen" placeholder="输入图片URL" value="${currentConfig.backgrounds.homescreen}">
                                <button class="file-upload-btn" onclick="document.getElementById('file-homescreen').click()">选择本地图片</button>
                                <input type="file" id="file-homescreen" accept="image/*" style="display:none">
                            </div>
                        </div>
                    </div>
                    
                    <!-- 应用图标设置 -->
                    <div class="settings-section">
                        <div class="settings-section-title">应用图标</div>
                        <div class="settings-group">
                            <div class="icon-editor" id="app-icons-editor"></div>
                        </div>
                    </div>
                    
                    <!-- Dock图标设置 -->
                    <div class="settings-section">
                        <div class="settings-section-title">Dock栏图标</div>
                        <div class="settings-group">
                            <div class="icon-editor" id="dock-icons-editor"></div>
                        </div>
                    </div>
                    
                    <button class="settings-save-btn" id="settings-save-btn">保存设置</button>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', settingsHTML);
            initializeSettingsEvents();
            populateIconEditors();
        }
    }

    // 填充图标编辑器
    function populateIconEditors() {
        // 应用图标
        const appEditor = document.getElementById('app-icons-editor');
        if (appEditor) {
            Object.keys(currentConfig.icons).forEach(key => {
                const config = currentConfig.icons[key];
                const index = key.replace('app', '');
                appEditor.innerHTML += createIconEditorItem(key, config, index, 'app');
            });
        }
        
        // Dock图标
        const dockEditor = document.getElementById('dock-icons-editor');
        if (dockEditor) {
            Object.keys(currentConfig.dockIcons).forEach(key => {
                const config = currentConfig.dockIcons[key];
                const index = key.replace('dock', '');
                dockEditor.innerHTML += createIconEditorItem(key, config, index, 'dock');
            });
        }
    }

    // 创建图标编辑项
    function createIconEditorItem(key, config, index, type) {
        return `
            <div class="icon-editor-item">
                <div class="icon-editor-label">${config.name}</div>
                <input type="text" class="settings-input" data-icon-key="${key}" data-icon-type="name" placeholder="应用名称" value="${config.name}">
                <input type="text" class="settings-input" data-icon-key="${key}" data-icon-type="url" placeholder="图标URL" value="${config.url}" style="margin-top: 8px;">
                <button class="file-upload-btn" onclick="document.getElementById('file-${key}').click()">选择本地图片</button>
                <input type="file" id="file-${key}" accept="image/*" style="display:none" data-icon-key="${key}">
                ${config.url ? `<div class="icon-preview-wrapper"><div class="icon-preview"><img src="${config.url}" alt="${config.name}"></div></div>` : ''}
            </div>
        `;
    }

    // 初始化设置页面事件
    function initializeSettingsEvents() {
        // 返回按钮
        const backBtn = document.getElementById('settings-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('返回按钮被点击');
                hideSettings();
            });
        }
        
        // 颜色选择器
        ['statusBar', 'lockscreenTime', 'lockscreenDate', 'appName'].forEach(key => {
            const preview = document.getElementById(`color-${key}`);
            const input = document.getElementById(`color-input-${key}`);
            
            if (preview && input) {
                preview.addEventListener('click', () => input.click());
                input.addEventListener('change', (e) => {
                    const color = e.target.value;
                    preview.style.background = color;
                    currentConfig.colors[key] = color;
                });
            }
        });
        
        // 背景URL输入
        const bgLockscreen = document.getElementById('bg-lockscreen');
        const bgHomescreen = document.getElementById('bg-homescreen');
        
        if (bgLockscreen) {
            bgLockscreen.addEventListener('change', (e) => {
                currentConfig.backgrounds.lockscreen = e.target.value;
            });
        }
        
        if (bgHomescreen) {
            bgHomescreen.addEventListener('change', (e) => {
                currentConfig.backgrounds.homescreen = e.target.value;
            });
        }
        
        // 背景文件上传
        const fileLockscreen = document.getElementById('file-lockscreen');
        const fileHomescreen = document.getElementById('file-homescreen');
        
        if (fileLockscreen) {
            fileLockscreen.addEventListener('change', (e) => handleFileUpload(e, 'lockscreen'));
        }
        
        if (fileHomescreen) {
            fileHomescreen.addEventListener('change', (e) => handleFileUpload(e, 'homescreen'));
        }
        
        // 图标输入
        document.querySelectorAll('[data-icon-key]').forEach(el => {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.addEventListener('change', (e) => {
                    const key = e.target.dataset.iconKey;
                    const type = e.target.dataset.iconType;
                    const value = e.target.value;
                    
                    if (key.startsWith('app')) {
                        if (!currentConfig.icons[key]) currentConfig.icons[key] = {};
                        currentConfig.icons[key][type] = value;
                    } else if (key.startsWith('dock')) {
                        if (!currentConfig.dockIcons[key]) currentConfig.dockIcons[key] = {};
                        currentConfig.dockIcons[key][type] = value;
                    }
                });
            } else if (el.tagName === 'INPUT' && el.type === 'file') {
                el.addEventListener('change', (e) => handleIconFileUpload(e));
            }
        });
        
        // 保存按钮
        const saveBtn = document.getElementById('settings-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveConfig();
                alert('设置已保存！');
            });
        }
    }

    // 处理文件上传
    function handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                currentConfig.backgrounds[type] = dataUrl;
                document.getElementById(`bg-${type}`).value = dataUrl;
            };
            reader.readAsDataURL(file);
        }
    }

    // 处理图标文件上传
    function handleIconFileUpload(event) {
        const file = event.target.files[0];
        const key = event.target.dataset.iconKey;
        
        if (file && key) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                
                if (key.startsWith('app')) {
                    if (!currentConfig.icons[key]) currentConfig.icons[key] = {};
                    currentConfig.icons[key].url = dataUrl;
                } else if (key.startsWith('dock')) {
                    if (!currentConfig.dockIcons[key]) currentConfig.dockIcons[key] = {};
                    currentConfig.dockIcons[key].url = dataUrl;
                }
                
                // 更新输入框
                const urlInput = document.querySelector(`[data-icon-key="${key}"][data-icon-type="url"]`);
                if (urlInput) urlInput.value = dataUrl;
            };
            reader.readAsDataURL(file);
        }
    }

    // 显示设置页面
    function showSettings() {
        const settingsPage = document.getElementById('iphone-settings-page');
        if (settingsPage) {
            settingsPage.classList.add('show');
        }
    }

    // 隐藏设置页面
    function hideSettings() {
        const settingsPage = document.getElementById('iphone-settings-page');
        if (settingsPage) {
            settingsPage.classList.remove('show');
        }
    }

    // 初始化
    function init() {
        loadConfig();
        
        // 等待iPhone模拟器加载完成后创建设置页面
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createSettingsPage();
                
                // 绑定Dock设置按钮点击事件
                setTimeout(() => {
                    const dockIcons = document.querySelectorAll('.dock-icon');
                    if (dockIcons[3]) { // 第4个是设置按钮
                        dockIcons[3].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showSettings();
                        });
                    }
                }, 500);
            }
        }, 100);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出函数
    window.iPhoneSettings = {
        show: showSettings,
        hide: hideSettings,
        save: saveConfig,
        load: loadConfig
    };

})();