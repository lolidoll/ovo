/**
 * iPhone 健康应用
 * 调用主API生成角色的健康数据
 */

(function() {
    'use strict';

    let currentHealthData = null;
    let currentCharacter = null;

    // 创建健康页面HTML
    function createHealthPage() {
        const healthHTML = `
            <div class="iphone-health-page" id="iphone-health-page">
                <div class="health-header">
                    <button class="health-back-btn" id="health-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        健康
                    </button>
                    <div class="health-title">健康</div>
                    <button class="health-generate-btn" id="health-generate-btn">生成</button>
                </div>
                
                <div class="health-content" id="health-content">
                    <div class="health-empty">
                        <div class="health-empty-icon">❤️</div>
                        <div class="health-empty-text">暂无健康数据</div>
                        <div class="health-empty-hint">点击右上角"生成"按钮<br>查看健康数据</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', healthHTML);
            initializeHealthEvents();
        }
    }

    // 初始化事件
    function initializeHealthEvents() {
        const backBtn = document.getElementById('health-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideHealth);
        }

        const generateBtn = document.getElementById('health-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateHealth);
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

    // 生成健康数据
    async function generateHealth() {
        const generateBtn = document.getElementById('health-generate-btn');
        const content = document.getElementById('health-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        content.innerHTML = `
            <div class="health-loading">
                <div class="health-loading-spinner"></div>
                <div class="health-loading-text">正在生成健康数据...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            const recentMessages = getRecentMessages();
            
            const prompt = `你是${currentCharacter.name}，现在需要生成你今天的健康数据。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${JSON.stringify(currentCharacter.card)}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}

最近对话：
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

请根据角色性格、生活习惯、身体状况，生成真实的健康数据。要求：

1. 今日步数（5000-15000步）
2. 心率（60-100 bpm）
3. 睡眠时长（6-9小时）
4. 过去7天睡眠数据（小时）
5. 健身记录（3-5条，包括活动名称、时长、消耗卡路里）
6. 心理健康评分（0-100分）
7. 心理健康描述

要有真实感和活人感，符合角色人设。

请以JSON格式返回，格式如下：
{
  "steps": 8520,
  "stepsGoal": 10000,
  "heartRate": 72,
  "sleep": {
    "hours": 7.5,
    "quality": "良好",
    "weekData": [7.2, 6.8, 7.5, 8.0, 7.3, 6.5, 7.5]
  },
  "activities": [
    {"name": "跑步", "duration": "30分钟", "calories": 250, "time": "07:00", "icon": "🏃"},
    {"name": "瑜伽", "duration": "45分钟", "calories": 180, "time": "18:30", "icon": "🧘"}
  ],
  "mindfulness": {
    "score": 75,
    "description": "今天的心理状态不错，保持积极乐观"
  }
}`;

            const response = await callMainAPI(prompt);
            currentHealthData = parseHealthResponse(response);
            
            renderHealth();
            
        } catch (error) {
            console.error('生成健康数据失败:', error);
            content.innerHTML = `
                <div class="health-empty">
                    <div class="health-empty-icon">⚠️</div>
                    <div class="health-empty-text">生成失败</div>
                    <div class="health-empty-hint">${error.message || '请稍后重试'}</div>
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
                max_tokens: 1500
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // 解析健康响应
    function parseHealthResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return getDefaultHealthData();
        } catch (error) {
            console.error('解析响应失败:', error);
            return getDefaultHealthData();
        }
    }

    // 获取默认健康数据
    function getDefaultHealthData() {
        return {
            steps: 8520,
            stepsGoal: 10000,
            heartRate: 72,
            sleep: {
                hours: 7.5,
                quality: '良好',
                weekData: [7.2, 6.8, 7.5, 8.0, 7.3, 6.5, 7.5]
            },
            activities: [
                { name: '跑步', duration: '30分钟', calories: 250, time: '07:00', icon: '🏃' },
                { name: '瑜伽', duration: '45分钟', calories: 180, time: '18:30', icon: '🧘' }
            ],
            mindfulness: {
                score: 75,
                description: '今天的心理状态不错，保持积极乐观'
            }
        };
    }

    // 渲染健康数据
    function renderHealth() {
        const content = document.getElementById('health-content');
        if (!content || !currentHealthData) return;
        
        const stepsPercent = Math.round((currentHealthData.steps / currentHealthData.stepsGoal) * 100);
        
        const sleepBarsHTML = currentHealthData.sleep.weekData.map((hours, index) => {
            const height = (hours / 9) * 100;
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            return `
                <div class="health-sleep-bar">
                    <div class="health-sleep-bar-fill" style="height: ${height}%"></div>
                    <div class="health-sleep-bar-label">${days[index]}</div>
                </div>
            `;
        }).join('');
        
        const activitiesHTML = currentHealthData.activities.map(activity => `
            <div class="health-activity-item">
                <div class="health-activity-icon" style="background: linear-gradient(135deg, #34c759 0%, #30d158 100%);">
                    ${activity.icon}
                </div>
                <div class="health-activity-info">
                    <div class="health-activity-name">${activity.name}</div>
                    <div class="health-activity-detail">${activity.duration} · ${activity.calories}千卡</div>
                </div>
                <div class="health-activity-time">${activity.time}</div>
            </div>
        `).join('');
        
        content.innerHTML = `
            <div class="health-data">
                <div class="health-main-card">
                    <div class="health-main-title">步数</div>
                    <div class="health-main-value">${currentHealthData.steps.toLocaleString()}</div>
                    <div class="health-main-subtitle">目标 ${currentHealthData.stepsGoal.toLocaleString()} 步 · ${stepsPercent}%</div>
                </div>
                
                <div class="health-metrics">
                    <div class="health-metric-card">
                        <div class="health-metric-header">
                            <div class="health-metric-icon heart">❤️</div>
                            <div class="health-metric-title">心率</div>
                        </div>
                        <div class="health-metric-value">${currentHealthData.heartRate}</div>
                        <div class="health-metric-subtitle">bpm</div>
                    </div>
                    
                    <div class="health-metric-card">
                        <div class="health-metric-header">
                            <div class="health-metric-icon sleep">😴</div>
                            <div class="health-metric-title">睡眠</div>
                        </div>
                        <div class="health-metric-value">${currentHealthData.sleep.hours}</div>
                        <div class="health-metric-subtitle">小时 · ${currentHealthData.sleep.quality}</div>
                    </div>
                </div>
                
                <div class="health-sleep-chart">
                    <div class="health-sleep-title">过去7天睡眠</div>
                    <div class="health-sleep-bars">${sleepBarsHTML}</div>
                </div>
                
                <div class="health-activities">
                    <div class="health-activities-title">今日活动</div>
                    ${activitiesHTML}
                </div>
                
                <div class="health-mindfulness">
                    <div class="health-mindfulness-title">心理健康</div>
                    <div class="health-mindfulness-score">
                        <div class="health-mindfulness-circle" style="--score: ${currentHealthData.mindfulness.score}">
                            <div class="health-mindfulness-value">${currentHealthData.mindfulness.score}</div>
                        </div>
                    </div>
                    <div class="health-mindfulness-desc">${currentHealthData.mindfulness.description}</div>
                </div>
            </div>
        `;
    }

    // 显示健康页面
    function showHealth() {
        const healthPage = document.getElementById('iphone-health-page');
        if (healthPage) {
            healthPage.classList.add('show');
        }
    }

    // 隐藏健康页面
    function hideHealth() {
        const healthPage = document.getElementById('iphone-health-page');
        if (healthPage) {
            healthPage.classList.remove('show');
        }
    }

    // 初始化
    function init() {
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createHealthPage();
                
                // 绑定健康按钮点击事件（第6个应用图标）
                setTimeout(() => {
                    const appIcons = document.querySelectorAll('.app-icon');
                    if (appIcons[5]) {
                        appIcons[5].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showHealth();
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
    window.iPhoneHealth = {
        show: showHealth,
        hide: hideHealth
    };

})();