/**
 * iPhone 屏幕使用时间应用
 * 调用主API生成角色的屏幕使用时间数据
 */

(function() {
    'use strict';

    let currentScreenTimeData = null;
    let currentCharacter = null;

    // 创建屏幕使用时间页面HTML
    function createScreenTimePage() {
        const screenTimeHTML = `
            <div class="iphone-screentime-page" id="iphone-screentime-page">
                <div class="screentime-header">
                    <button class="screentime-back-btn" id="screentime-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        屏幕使用时间
                    </button>
                    <div class="screentime-title">屏幕使用时间</div>
                    <button class="screentime-generate-btn" id="screentime-generate-btn">生成</button>
                </div>
                
                <div class="screentime-content" id="screentime-content">
                    <div class="screentime-empty">
                        <div class="screentime-empty-icon">📊</div>
                        <div class="screentime-empty-text">暂无数据</div>
                        <div class="screentime-empty-hint">点击右上角"生成"按钮<br>查看屏幕使用时间</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', screenTimeHTML);
            initializeScreenTimeEvents();
        }
    }

    // 初始化事件
    function initializeScreenTimeEvents() {
        // 返回按钮
        const backBtn = document.getElementById('screentime-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideScreenTime);
        }

        // 生成按钮
        const generateBtn = document.getElementById('screentime-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateScreenTime);
        }
    }

    // 获取当前角色信息
    function getCurrentCharacter() {
        const characterName = localStorage.getItem('currentCharacterName') || '角色';
        const characterCard = localStorage.getItem('currentCharacterCard');
        const userName = localStorage.getItem('userName') || '用户';
        const userPersona = localStorage.getItem('userPersona') || '';
        
        return {
            name: characterName,
            card: characterCard ? JSON.parse(characterCard) : null,
            userName: userName,
            userPersona: userPersona
        };
    }

    // 获取最近对话
    function getRecentMessages() {
        const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        return messages.slice(-50);
    }

    // 生成屏幕使用时间数据
    async function generateScreenTime() {
        const generateBtn = document.getElementById('screentime-generate-btn');
        const content = document.getElementById('screentime-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        // 显示加载状态
        content.innerHTML = `
            <div class="screentime-loading">
                <div class="screentime-loading-spinner"></div>
                <div class="screentime-loading-text">正在生成屏幕使用时间...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            const recentMessages = getRecentMessages();
            
            // 构建提示词
            const prompt = `你是${currentCharacter.name}，现在需要生成你今天的手机屏幕使用时间数据。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${JSON.stringify(currentCharacter.card)}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}

最近对话：
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

请根据角色性格、生活习惯、兴趣爱好，生成真实的屏幕使用时间数据。要求：

1. 总使用时间（小时和分钟）
2. 与昨天对比（增加或减少的百分比）
3. 过去7天每天的使用时间（用于图表，单位：小时）
4. 10-15个常用APP及使用时间，包括：
   - APP名称（要符合现实，如微信、抖音、B站、网易云音乐、淘宝、美团、微博、小红书、知乎等）
   - 使用时长（小时和分钟）
   - APP类别（社交、娱乐、效率、阅读、创意、其他）
   - APP图标emoji
5. 类别统计（社交、娱乐、效率、阅读、创意、其他的总时长和占比）
6. 提取次数（今天拿起手机的次数）
7. 通知数量（今天收到的通知数）

要求数据真实合理，符合角色人设和生活状态，要有活人感！

请以JSON格式返回，格式如下：
{
  "totalTime": {"hours": 5, "minutes": 30},
  "comparison": {"type": "up", "percent": 15},
  "weeklyData": [4.5, 5.2, 3.8, 6.1, 5.5, 4.9, 5.5],
  "apps": [
    {"name": "微信", "hours": 2, "minutes": 15, "category": "社交", "icon": "💬"},
    {"name": "抖音", "hours": 1, "minutes": 30, "category": "娱乐", "icon": "🎵"}
  ],
  "categories": [
    {"name": "社交", "hours": 2, "minutes": 30, "percent": 45, "color": "#667eea"},
    {"name": "娱乐", "hours": 1, "minutes": 45, "percent": 32, "color": "#f5576c"}
  ],
  "pickups": 85,
  "notifications": 127
}`;

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            currentScreenTimeData = parseScreenTimeResponse(response);
            
            // 渲染屏幕使用时间
            renderScreenTime();
            
        } catch (error) {
            console.error('生成屏幕使用时间失败:', error);
            content.innerHTML = `
                <div class="screentime-empty">
                    <div class="screentime-empty-icon">⚠️</div>
                    <div class="screentime-empty-text">生成失败</div>
                    <div class="screentime-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    }

    // 调用主API
    async function callMainAPI(prompt) {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        const apiUrl = apiConfig.url || '';
        const apiKey = apiConfig.key || '';
        const model = apiConfig.model || 'gpt-3.5-turbo';
        
        if (!apiUrl || !apiKey) {
            throw new Error('请先配置API设置');
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // 解析屏幕使用时间响应
    function parseScreenTimeResponse(response) {
        try {
            // 尝试提取JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // 返回默认数据
            return getDefaultScreenTimeData();
        } catch (error) {
            console.error('解析响应失败:', error);
            return getDefaultScreenTimeData();
        }
    }

    // 获取默认屏幕使用时间数据
    function getDefaultScreenTimeData() {
        return {
            totalTime: { hours: 5, minutes: 30 },
            comparison: { type: 'up', percent: 15 },
            weeklyData: [4.5, 5.2, 3.8, 6.1, 5.5, 4.9, 5.5],
            apps: [
                { name: '微信', hours: 2, minutes: 15, category: '社交', icon: '💬' },
                { name: '抖音', hours: 1, minutes: 30, category: '娱乐', icon: '🎵' },
                { name: 'B站', hours: 0, minutes: 45, category: '娱乐', icon: '📺' },
                { name: '网易云音乐', hours: 0, minutes: 40, category: '娱乐', icon: '🎧' },
                { name: '淘宝', hours: 0, minutes: 25, category: '其他', icon: '🛒' },
                { name: '微博', hours: 0, minutes: 20, category: '社交', icon: '📱' },
                { name: '小红书', hours: 0, minutes: 15, category: '社交', icon: '📖' },
                { name: '知乎', hours: 0, minutes: 12, category: '阅读', icon: '💡' }
            ],
            categories: [
                { name: '社交', hours: 2, minutes: 50, percent: 52, color: '#667eea' },
                { name: '娱乐', hours: 2, minutes: 15, percent: 41, color: '#f5576c' },
                { name: '阅读', hours: 0, minutes: 12, percent: 4, color: '#43e97b' },
                { name: '其他', hours: 0, minutes: 25, percent: 3, color: '#30cfd0' }
            ],
            pickups: 85,
            notifications: 127
        };
    }

    // 渲染屏幕使用时间
    function renderScreenTime() {
        const content = document.getElementById('screentime-content');
        if (!content || !currentScreenTimeData) return;
        
        const data = currentScreenTimeData;
        
        // 格式化总时间
        const totalTimeStr = data.totalTime.hours > 0 
            ? `${data.totalTime.hours}小时${data.totalTime.minutes}分钟`
            : `${data.totalTime.minutes}分钟`;
        
        // 对比文本
        const comparisonClass = data.comparison.type === 'up' ? 'up' : 'down';
        const comparisonSymbol = data.comparison.type === 'up' ? '↑' : '↓';
        const comparisonText = `${comparisonSymbol} 比昨天${data.comparison.type === 'up' ? '增加' : '减少'}${data.comparison.percent}%`;
        
        // 生成周数据图表
        const maxWeeklyTime = Math.max(...data.weeklyData);
        const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const barsHTML = data.weeklyData.map((time, index) => {
            const height = (time / maxWeeklyTime) * 100;
            return `
                <div class="screentime-bar">
                    <div class="screentime-bar-fill" style="height: ${height}%"></div>
                    <div class="screentime-bar-label">${weekDays[index]}</div>
                </div>
            `;
        }).join('');
        
        // 生成应用列表
        const appsHTML = data.apps.map(app => {
            const timeStr = app.hours > 0 
                ? `${app.hours}小时${app.minutes}分`
                : `${app.minutes}分钟`;
            const categoryClass = getCategoryClass(app.category);
            return `
                <div class="screentime-app-item">
                    <div class="screentime-app-icon ${categoryClass}">${app.icon}</div>
                    <div class="screentime-app-info">
                        <div class="screentime-app-name">${app.name}</div>
                        <div class="screentime-app-category">${app.category}</div>
                    </div>
                    <div class="screentime-app-time">${timeStr}</div>
                </div>
            `;
        }).join('');
        
        // 生成类别统计
        const categoriesHTML = data.categories.map(cat => {
            const timeStr = cat.hours > 0 
                ? `${cat.hours}小时${cat.minutes}分`
                : `${cat.minutes}分钟`;
            return `
                <div class="screentime-category-item">
                    <div class="screentime-category-color" style="background: ${cat.color}"></div>
                    <div class="screentime-category-name">${cat.name}</div>
                    <div class="screentime-category-time">${timeStr}</div>
                </div>
                <div class="screentime-category-bar">
                    <div class="screentime-category-bar-fill" style="width: ${cat.percent}%; background: ${cat.color}"></div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = `
            <div class="screentime-data">
                <!-- 总览 -->
                <div class="screentime-overview">
                    <div class="screentime-overview-title">今天</div>
                    <div class="screentime-total-time">${totalTimeStr}</div>
                    <div class="screentime-comparison ${comparisonClass}">${comparisonText}</div>
                </div>
                
                <!-- 图表 -->
                <div class="screentime-chart">
                    <div class="screentime-chart-title">过去7天</div>
                    <div class="screentime-bars">${barsHTML}</div>
                </div>
                
                <!-- 应用列表 -->
                <div class="screentime-apps">
                    <div class="screentime-apps-title">最常使用</div>
                    ${appsHTML}
                </div>
                
                <!-- 类别统计 -->
                <div class="screentime-categories">
                    <div class="screentime-categories-title">按类别</div>
                    ${categoriesHTML}
                </div>
                
                <!-- 提取次数 -->
                <div class="screentime-pickups">
                    <div class="screentime-pickups-title">提取次数</div>
                    <div class="screentime-pickups-count">${data.pickups}</div>
                    <div class="screentime-pickups-label">次</div>
                </div>
                
                <!-- 通知 -->
                <div class="screentime-notifications">
                    <div class="screentime-notifications-title">通知</div>
                    <div class="screentime-notifications-count">${data.notifications}</div>
                    <div class="screentime-notifications-label">条</div>
                </div>
            </div>
        `;
    }

    // 获取类别对应的CSS类
    function getCategoryClass(category) {
        const map = {
            '社交': 'social',
            '娱乐': 'entertainment',
            '效率': 'productivity',
            '阅读': 'reading',
            '创意': 'creativity',
            '其他': 'other'
        };
        return map[category] || 'other';
    }

    // 显示屏幕使用时间页面
    function showScreenTime() {
        const screenTimePage = document.getElementById('iphone-screentime-page');
        if (screenTimePage) {
            screenTimePage.classList.add('show');
        }
    }

    // 隐藏屏幕使用时间页面
    function hideScreenTime() {
        const screenTimePage = document.getElementById('iphone-screentime-page');
        if (screenTimePage) {
            screenTimePage.classList.remove('show');
        }
    }

    // 初始化
    function init() {
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createScreenTimePage();
                
                // 绑定屏幕使用时间按钮点击事件（第3个应用图标）
                setTimeout(() => {
                    const appIcons = document.querySelectorAll('.app-icon');
                    if (appIcons[2]) {
                        appIcons[2].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showScreenTime();
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
    window.iPhoneScreenTime = {
        show: showScreenTime,
        hide: hideScreenTime
    };

})();