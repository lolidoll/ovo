/**
 * iPhone 屏幕使用时间应用
 * 调用主API生成角色的屏幕使用时间数据
 */

(function() {
    'use strict';

    let currentScreenTimeData = null;
    let currentCharacter = null;
    const STORAGE_KEY_PREFIX = 'screentime_data_';

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
                        <div class="screentime-empty-hint">数据将自动生成<br>请稍候</div>
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
        console.log('返回按钮元素:', backBtn);
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                console.log('返回按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                hideScreenTime();
            });
        }

        // 生成按钮
        const generateBtn = document.getElementById('screentime-generate-btn');
        console.log('生成按钮元素:', generateBtn);
        if (generateBtn) {
            generateBtn.addEventListener('click', function(e) {
                console.log('生成按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                generateScreenTime();
            });
        }
    }

    // 获取当前角色信息
    function getCurrentCharacter() {
        // 从全局AppState获取当前聊天角色
        if (!window.AppState || !window.AppState.currentChat) {
            console.error('未找到当前聊天角色');
            return null;
        }
        
        const currentChat = window.AppState.currentChat;
        const convId = currentChat.id;
        
        // 从conversations数组中获取完整的角色信息
        const conv = window.AppState.conversations.find(c => c.id === convId);
        if (!conv) {
            console.error('未找到对话信息:', convId);
            return null;
        }
        
        // 获取用户人设
        let userName = conv.userNameForChar || window.AppState.user?.name || '用户';
        let userPersona = conv.userPersonality || window.AppState.user?.personality || '';
        
        // 如果有用户人设管理器，尝试获取当前角色的用户人设
        if (window.UserPersonaManager) {
            try {
                const currentPersona = window.UserPersonaManager.getPersonaForConversation(convId);
                if (currentPersona) {
                    userName = currentPersona.userName || userName;
                    userPersona = currentPersona.personality || userPersona;
                }
            } catch (e) {
                console.error('获取用户人设失败:', e);
            }
        }
        
        // 获取历史总结
        const summaries = conv.summaries || [];
        const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1].content : '';
        
        // 获取最新50条消息
        const messages = window.AppState.messages[convId] || [];
        const recentMessages = messages.slice(-50);
        
        console.log('===== 屏幕使用时间 - 角色信息 =====');
        console.log('角色ID:', convId);
        console.log('角色名称:', conv.name);
        console.log('角色设定:', conv.characterCard ? '已设置' : '未设置');
        console.log('用户名称:', userName);
        console.log('用户设定:', userPersona ? '已设置' : '未设置');
        console.log('历史总结:', latestSummary ? `共${summaries.length}条` : '无');
        console.log('最新消息数:', recentMessages.length);
        
        return {
            id: convId,
            name: conv.name,
            card: conv.characterCard || null,
            userName: userName,
            userPersona: userPersona,
            summaries: summaries,
            latestSummary: latestSummary,
            recentMessages: recentMessages,
            conversation: conv
        };
    }

    // 获取最近对话
    function getRecentMessages() {
        if (!window.AppState || !window.AppState.currentChat) {
            return [];
        }
        
        const convId = window.AppState.currentChat.id;
        const messages = window.AppState.messages[convId] || [];
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
            
            console.log('===== 屏幕使用时间 - 调试提示词构建 =====');
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
                messagesText = '\n最近对话（最新50条）：\n' +
                    recentMessages.map(m => {
                        const sender = m.type === 'sent' ? currentCharacter.userName : currentCharacter.name;
                        const content = m.content || (m.emojiUrl ? '[表情包]' : '');
                        return `${sender}: ${content}`;
                    }).join('\n');
            }
            
            // 构建提示词
            const prompt = `你是${currentCharacter.name}，现在需要生成你今天的手机屏幕使用时间数据。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

请根据角色性格、生活习惯、兴趣爱好，以及最近的对话内容，生成真实的屏幕使用时间数据。要求：

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

要求数据真实合理，符合角色人设和生活状态，要与最近的对话内容相呼应，要有活人感！

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

            console.log('完整提示词:', prompt);
            console.log('========================');

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            currentScreenTimeData = parseScreenTimeResponse(response);
            
            // 保存数据到localStorage
            saveScreenTimeData(currentCharacter.id, currentScreenTimeData);
            
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

    // 保存屏幕使用时间数据
    function saveScreenTimeData(convId, data) {
        if (!convId || !data) return;
        
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const saveData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(saveData));
            console.log('屏幕使用时间数据已保存:', convId);
        } catch (e) {
            console.error('保存屏幕使用时间数据失败:', e);
        }
    }

    // 加载屏幕使用时间数据
    function loadScreenTimeData(convId) {
        if (!convId) return null;
        
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log('屏幕使用时间数据已加载:', convId);
                return parsed.data;
            }
        } catch (e) {
            console.error('加载屏幕使用时间数据失败:', e);
        }
        
        return null;
    }

    // 调用主API
    async function callMainAPI(prompt) {
        // 获取API配置
        const api = window.AppState?.apiSettings;
        if (!api || !api.endpoint || !api.selectedModel) {
            throw new Error('请先在设置中配置API信息');
        }
        
        const apiKey = api.apiKey || '';
        if (!apiKey) {
            throw new Error('请先在设置中配置API密钥');
        }
        
        // 规范化endpoint（与备忘录保持一致）
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
            console.log('调用API生成屏幕使用时间数据...');
            console.log('API URL:', endpoint);
            console.log('模型:', api.selectedModel);
            
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

    // 解析屏幕使用时间响应
    function parseScreenTimeResponse(response) {
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
            
            // 尝试提取JSON对象 - 使用更宽松的正则
            let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/s);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    console.log('找到JSON对象，长度:', jsonStr.length);
                    
                    // 修复常见的JSON格式问题
                    let fixedJson = jsonStr;
                    
                    // 移除数组中的尾随逗号
                    fixedJson = fixedJson.replace(/,\s*\]/g, ']');
                    
                    // 移除对象中的尾随逗号（在 } 或 ] 之前）
                    fixedJson = fixedJson.replace(/,\s*}/g, '}');
                    
                    console.log('修复后的JSON:', fixedJson);
                    
                    let parsed = JSON.parse(fixedJson);
                    console.log('成功解析JSON:', parsed);
                    
                    // 验证并补充缺失的必要字段
                    const defaultData = getDefaultScreenTimeData();
                    
                    // 确保有所有必要字段
                    if (!parsed.totalTime) {
                        console.warn('缺少totalTime，使用默认值');
                        parsed.totalTime = defaultData.totalTime;
                    }
                    if (!parsed.comparison) {
                        console.warn('缺少comparison，使用默认值');
                        parsed.comparison = defaultData.comparison;
                    }
                    if (!parsed.weeklyData || !Array.isArray(parsed.weeklyData) || parsed.weeklyData.length !== 7) {
                        console.warn('weeklyData不完整，使用默认值');
                        parsed.weeklyData = defaultData.weeklyData;
                    }
                    if (!parsed.apps || !Array.isArray(parsed.apps)) {
                        console.warn('apps不完整，使用默认值');
                        parsed.apps = defaultData.apps;
                    }
                    if (!parsed.categories || !Array.isArray(parsed.categories)) {
                        console.warn('categories不完整，使用默认值');
                        parsed.categories = defaultData.categories;
                    }
                    if (!parsed.pickups) {
                        parsed.pickups = defaultData.pickups;
                    }
                    if (!parsed.notifications) {
                        parsed.notifications = defaultData.notifications;
                    }
                    
                    console.log('最终完整数据:', parsed);
                    return parsed;
                    
                } catch (jsonError) {
                    console.error('JSON解析错误:', jsonError);
                    console.error('错误的JSON字符串:', jsonMatch[0]);
                    
                    // 尝试使用Function构造函数作为后备方案（对于包含特殊字符的JSON）
                    try {
                        console.log('尝试使用备用解析方法...');
                        // 移除所有尾随逗号
                        let backupFix = jsonMatch[0]
                            .replace(/,\s*\]/g, ']')
                            .replace(/,\s*}/g, '}');
                        
                        // 使用Function构造函数解析（类似eval，但在这种情况下更安全）
                        const parsed = new Function('return ' + backupFix)();
                        console.log('备用方法成功解析JSON:', parsed);
                        
                        // 验证并补充缺失字段
                        const defaultData = getDefaultScreenTimeData();
                        if (!parsed.totalTime) parsed.totalTime = defaultData.totalTime;
                        if (!parsed.comparison) parsed.comparison = defaultData.comparison;
                        if (!parsed.weeklyData || !Array.isArray(parsed.weeklyData) || parsed.weeklyData.length !== 7) {
                            parsed.weeklyData = defaultData.weeklyData;
                        }
                        if (!parsed.apps || !Array.isArray(parsed.apps)) parsed.apps = defaultData.apps;
                        if (!parsed.categories || !Array.isArray(parsed.categories)) parsed.categories = defaultData.categories;
                        if (!parsed.pickups) parsed.pickups = defaultData.pickups;
                        if (!parsed.notifications) parsed.notifications = defaultData.notifications;
                        
                        return parsed;
                    } catch (backupError) {
                        console.error('备用解析方法也失败:', backupError);
                    }
                }
            }
            
            console.warn('未找到有效的JSON，使用默认数据');
            return getDefaultScreenTimeData();
            
        } catch (error) {
            console.error('解析响应失败:', error);
            console.error('错误堆栈:', error.stack);
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
        
        console.log('===== 渲染屏幕使用时间数据 =====');
        console.log('完整数据:', data);
        console.log('weeklyData:', data.weeklyData);
        console.log('apps数量:', data.apps?.length);
        console.log('categories数量:', data.categories?.length);
        console.log('================================');
        
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
            console.log(`柱形图 ${weekDays[index]}: ${time}小时, 高度=${height}%`);
            return `
                <div class="screentime-bar">
                    <div class="screentime-bar-fill" style="height: ${height}%"></div>
                    <div class="screentime-bar-label">${weekDays[index]}</div>
                </div>
            `;
        }).join('');
        
        console.log('生成的柱形图HTML:', barsHTML);
        
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
        
        const finalHTML = `
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
        
        console.log('最终HTML长度:', finalHTML.length);
        console.log('柱形图HTML在最终HTML中的位置:', finalHTML.indexOf('screentime-bars'));
        
        content.innerHTML = finalHTML;
        
        // 验证DOM元素是否正确创建
        setTimeout(() => {
            const chartBars = document.querySelector('.screentime-bars');
            const barFills = document.querySelectorAll('.screentime-bar-fill');
            console.log('DOM验证 - screentime-bars元素:', chartBars);
            console.log('DOM验证 - 柱形图填充元素数量:', barFills.length);
            if (barFills.length > 0) {
                barFills.forEach((fill, index) => {
                    const height = fill.style.height;
                    console.log(`柱形图${index + 1}高度: ${height}, 计算样式:`, getComputedStyle(fill).height);
                });
            }
        }, 100);
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
            
            // 尝试加载之前保存的数据
            const character = getCurrentCharacter();
            if (character) {
                const savedData = loadScreenTimeData(character.id);
                if (savedData) {
                    currentScreenTimeData = savedData;
                    renderScreenTime();
                    console.log('已加载保存的屏幕使用时间数据');
                }
                // 不自动生成，等待用户点击生成按钮
            }
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