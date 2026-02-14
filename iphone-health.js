/**
 * iPhone 健康应用
 * 调用主API生成角色的健康数据
 * 完全参考备忘录实现
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
                        <i class="fa fa-arrow-left"></i>
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

    // 获取当前角色信息（从当前聊天页面获取）
    function getCurrentCharacter() {
        console.log('=== 获取当前聊天角色信息 ===');
        
        // 获取当前聊天的ID
        const currentChatId = window.AppState?.currentChat?.id;
        console.log('当前聊天ID:', currentChatId);
        
        if (!currentChatId) {
            console.warn('⚠️ 未找到当前聊天ID，使用默认值');
            return {
                name: '角色',
                card: null,
                userName: '用户',
                userPersona: '',
                summaries: []
            };
        }
        
        // 从conversations中找到对应的conversation
        const conversation = window.AppState?.conversations?.find(c => c.id === currentChatId);
        console.log('找到的conversation:', conversation);
        
        if (!conversation) {
            console.warn('⚠️ 未找到对应的conversation，使用默认值');
            return {
                name: '角色',
                card: null,
                userName: '用户',
                userPersona: '',
                summaries: []
            };
        }
        
        // 从角色设置中获取用户名和人设
        let userName = conversation.userNameForChar || window.AppState?.user?.name || '用户';
        let userPersona = conversation.userPersonality || window.AppState?.user?.personality || '';
        
        console.log('----- 角色设置信息 -----');
        console.log('1. conversation.userNameForChar:', conversation.userNameForChar);
        console.log('2. conversation.userPersonality:', conversation.userPersonality);
        console.log('3. window.AppState?.user?.name:', window.AppState?.user?.name);
        console.log('4. window.AppState?.user?.personality:', window.AppState?.user?.personality);
        console.log('最终使用的用户名:', userName);
        console.log('最终使用的人设:', userPersona ? userPersona.substring(0, 50) + '...' : '无');
        console.log('=======================');
        
        // 提取角色信息
        const characterInfo = {
            name: conversation.name || '角色',
            card: conversation.characterSetting || null,
            userName: userName,
            userPersona: userPersona,
            summaries: conversation.summaries || [],
            id: currentChatId
        };
        
        console.log('✅ 获取到的角色信息:', {
            name: characterInfo.name,
            userName: characterInfo.userName,
            userPersona: characterInfo.userPersona ? '有' : '无',
            hasCard: !!characterInfo.card,
            summariesCount: characterInfo.summaries.length
        });
        console.log('========================');
        
        return characterInfo;
    }

    // 获取最近对话
    function getRecentMessages() {
        const currentChatId = window.AppState?.currentChat?.id;
        if (!currentChatId) {
            console.warn('⚠️ 未找到当前聊天ID，无法获取消息');
            return [];
        }
        
        const messages = window.AppState?.messages?.[currentChatId] || [];
        console.log('获取到的消息数量:', messages.length);
        return messages.slice(-50); // 最近50条
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
            
            console.log('===== 调试提示词构建 =====');
            console.log('角色名:', currentCharacter.name);
            console.log('用户名:', currentCharacter.userName);
            console.log('是否有角色设定:', !!currentCharacter.card);
            console.log('历史总结数:', currentCharacter.summaries?.length || 0);
            console.log('最近消息数:', recentMessages.length);
            
            // 构建历史总结文本
            let summariesText = '';
            if (currentCharacter.summaries && currentCharacter.summaries.length > 0) {
                summariesText = '\n历史总结：\n' + currentCharacter.summaries.join('\n');
            }
            
            // 构建最近对话文本
            let messagesText = '';
            if (recentMessages.length > 0) {
                messagesText = '\n最近对话（最近50条）：\n' +
                    recentMessages.slice(-20).map(m => {
                        const role = m.role === 'user' ? currentCharacter.userName : currentCharacter.name;
                        return `${role}: ${m.content}`;
                    }).join('\n');
            }
            
            const prompt = `你是${currentCharacter.name}，现在需要生成你今天的健康数据。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

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

            console.log('完整提示词:', prompt);
            console.log('========================');

            const response = await callMainAPI(prompt);
            currentHealthData = parseHealthResponse(response);
            
            // 保存到localStorage
            saveHealthToStorage();
            
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

    // 保存健康数据到localStorage
    function saveHealthToStorage() {
        try {
            localStorage.setItem('iphoneHealthData', JSON.stringify({
                healthData: currentHealthData,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存健康数据失败:', e);
        }
    }

    // 从localStorage加载健康数据
    function loadHealthFromStorage() {
        try {
            const saved = localStorage.getItem('iphoneHealthData');
            if (saved) {
                const data = JSON.parse(saved);
                // 检查是否是同一角色
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    currentHealthData = data.healthData;
                    currentCharacter = data.character;
                    return true;
                }
            }
        } catch (e) {
            console.error('加载健康数据失败:', e);
        }
        return false;
    }

    // 调用主API（参考备忘录实现）
    async function callMainAPI(prompt) {
        const api = window.AppState?.apiSettings;
        if (!api || !api.endpoint || !api.selectedModel) {
            throw new Error('请先在设置中配置API信息');
        }
        
        const apiKey = api.apiKey || '';
        if (!apiKey) {
            throw new Error('请先在设置中配置API密钥');
        }
        
        // 规范化endpoint（与其他文件保持一致）
        const baseEndpoint = api.endpoint.replace(/\/+$/, '');
        const endpoint = baseEndpoint + '/v1/chat/completions';
        
        const body = {
            model: api.selectedModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 10000
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('API响应格式错误');
            }
            
            return data.choices[0].message.content;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('API请求超时（5分钟）');
            }
            throw error;
        }
    }

    // 解析健康响应
    function parseHealthResponse(response) {
        console.log('原始API响应:', response);
        console.log('响应长度:', response.length);
        
        try {
            // 清理响应内容，移除markdown代码块标记
            let cleanedResponse = response
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/gi, '')
                .trim();
            
            console.log('清理后的响应:', cleanedResponse);
            console.log('清理后长度:', cleanedResponse.length);
            
            // 尝试直接解析JSON
            let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    console.log('找到JSON对象，长度:', jsonStr.length);
                    
                    // 修复可能的JSON格式问题
                    const fixedJson = jsonStr
                        .replace(/,\s*\]/g, ']')  // 移除尾随逗号
                        .replace(/,\s*}/g, '}');   // 移除尾随逗号
                    
                    const parsed = JSON.parse(fixedJson);
                    console.log('解析成功');
                    
                    return parsed;
                } catch (jsonError) {
                    console.log('JSON解析失败，使用默认值:', jsonError);
                }
            }
            
            console.log('使用默认健康数据');
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
        
        // 计算睡眠柱形图高度 - 参考屏幕使用时间实现
        const maxSleepHours = Math.max(...currentHealthData.sleep.weekData);
        const sleepBarsHTML = currentHealthData.sleep.weekData.map((hours, index) => {
            const height = (hours / maxSleepHours) * 100;
            console.log(`睡眠柱形图 ${index + 1}: ${hours}小时, 高度=${height}%`);
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
                    <div class="health-activity-detail">${activity.duration} · ${activity.calories} 卡路里</div>
                </div>
                <div class="health-activity-time">${activity.time}</div>
            </div>
        `).join('');
        
        content.innerHTML = `
            <div class="health-data">
                <div class="health-main-card">
                    <div class="health-main-title">今日步数</div>
                    <div class="health-main-value">${currentHealthData.steps.toLocaleString()}</div>
                    <div class="health-main-unit">步</div>
                    <div class="health-main-subtitle">目标 ${currentHealthData.stepsGoal.toLocaleString()} 步 (${stepsPercent}%)</div>
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
                    <div class="health-metric-card">
                        <div class="health-metric-header">
                            <div class="health-metric-icon exercise">🏃</div>
                            <div class="health-metric-title">活动</div>
                        </div>
                        <div class="health-metric-value">${currentHealthData.activities.length}</div>
                        <div class="health-metric-subtitle">项记录</div>
                    </div>
                    <div class="health-metric-card">
                        <div class="health-metric-header">
                            <div class="health-metric-icon mind">🧠</div>
                            <div class="health-metric-title">心情</div>
                        </div>
                        <div class="health-metric-value">${currentHealthData.mindfulness.score}</div>
                        <div class="health-metric-subtitle">分</div>
                    </div>
                </div>
                
                <div class="health-sleep-chart">
                    <div class="health-sleep-title">过去7天睡眠</div>
                    <div class="health-sleep-bars">
                        ${sleepBarsHTML}
                    </div>
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
            
            // 尝试加载已保存的健康数据
            if (!currentHealthData) {
                if (loadHealthFromStorage()) {
                    renderHealth();
                }
            }
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
        // 等待iPhone模拟器加载完成
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createHealthPage();
                // 注意：不要在这里绑定点击事件，由 iphone-simulator.js 统一处理
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