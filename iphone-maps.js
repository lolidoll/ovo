/**
 * iPhone 地图应用
 * 调用主API生成角色的今日行程轨迹
 * 完全参考备忘录实现
 */

(function() {
    'use strict';

    let currentMapsData = null;
    let currentCharacter = null;

    // 创建地图页面HTML
    function createMapsPage() {
        const mapsHTML = `
            <div class="iphone-maps-page" id="iphone-maps-page">
                <div class="maps-header">
                    <button class="maps-back-btn" id="maps-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        地图
                    </button>
                    <div class="maps-title">地图</div>
                    <button class="maps-generate-btn" id="maps-generate-btn">生成</button>
                </div>
                
                <div class="maps-content" id="maps-content">
                    <div class="maps-empty">
                        <div class="maps-empty-icon">🗺️</div>
                        <div class="maps-empty-text">暂无行程数据</div>
                        <div class="maps-empty-hint">点击右上角"生成"按钮<br>查看今日行程轨迹</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', mapsHTML);
            initializeMapsEvents();
        }
    }

    // 初始化事件
    function initializeMapsEvents() {
        const backBtn = document.getElementById('maps-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideMaps);
        }

        const generateBtn = document.getElementById('maps-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateMaps);
        }
    }

    // 获取当前角色信息（从当前聊天页面获取，与备忘录完全一致）
    function getCurrentCharacter() {
        console.log('=== 地图 - 获取当前聊天角色信息 ===');
        
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
        
        console.log('----- 地图 - 角色设置信息 -----');
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
        
        console.log('✅ 地图 - 获取到的角色信息:', {
            name: characterInfo.name,
            userName: characterInfo.userName,
            userPersona: characterInfo.userPersona ? '有' : '无',
            hasCard: !!characterInfo.card,
            summariesCount: characterInfo.summaries.length
        });
        console.log('========================');
        
        return characterInfo;
    }

    // 获取最近对话（与备忘录完全一致）
    function getRecentMessages() {
        const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        return messages.slice(-50); // 最近50条
    }

    // 生成地图数据
    async function generateMaps() {
        const generateBtn = document.getElementById('maps-generate-btn');
        const content = document.getElementById('maps-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        // 显示加载状态
        content.innerHTML = `
            <div class="maps-loading">
                <div class="maps-loading-spinner"></div>
                <div class="maps-loading-text">正在生成行程...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            const recentMessages = getRecentMessages();
            
            console.log('===== 地图 - 调试提示词构建 =====');
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
            
            // 构建提示词 - 要求返回纯JSON，不要任何其他内容
            const prompt = `你是${currentCharacter.name}，请生成今日的行程轨迹数据。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 生成5-8个真实的行程地点
2. 每个地点包含：
   - 地点名称（具体的地点，如"星巴克(中山路店)"、"公司"、"健身房"等）
   - 详细地址
   - 到达时间（HH:MM格式）
   - 停留时长（分钟）
   - 地点类型（home/work/food/shopping/entertainment/transport/other）
3. 行程要符合逻辑：
   - 早上从家出发
   - 中午可能去餐厅
   - 下午可能工作或活动
   - 晚上回家或娱乐
4. 要有真实感和活人感，符合角色人设
5. 总行程时间、总距离、访问地点数

直接返回JSON，不要任何说明文字或markdown标记：
{
  "summary": {
    "totalTime": "8小时30分钟",
    "totalDistance": "15.2公里",
    "locations": 6
  },
  "timeline": [
    {
      "time": "08:00",
      "location": "家",
      "address": "XX市XX区XX路XX号",
      "duration": 30,
      "type": "home"
    }
  ]
}`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            currentMapsData = parseMapsResponse(response);
            
            // 保存到localStorage
            saveMapsToStorage();
            
            // 渲染地图
            renderMaps();
            
        } catch (error) {
            console.error('生成地图失败:', error);
            content.innerHTML = `
                <div class="maps-empty">
                    <div class="maps-empty-icon">⚠️</div>
                    <div class="maps-empty-text">生成失败</div>
                    <div class="maps-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    }

    // 保存地图数据到localStorage
    function saveMapsToStorage() {
        try {
            localStorage.setItem('iphoneMapsData', JSON.stringify({
                mapsData: currentMapsData,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存地图数据失败:', e);
        }
    }
    
    // 从localStorage加载地图数据
    function loadMapsFromStorage() {
        try {
            const saved = localStorage.getItem('iphoneMapsData');
            if (saved) {
                const data = JSON.parse(saved);
                // 检查是否是同一角色
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    currentMapsData = data.mapsData || null;
                    currentCharacter = data.character;
                    return true;
                }
            }
        } catch (e) {
            console.error('加载地图数据失败:', e);
        }
        return false;
    }

    // 调用主API（与备忘录完全一致）
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

    // 解析地图响应
    function parseMapsResponse(response) {
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
            
            // 尝试提取JSON对象
            let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/s);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    console.log('找到JSON对象，长度:', jsonStr.length);
                    
                    // 修复可能的JSON格式问题
                    const fixedJson = jsonStr
                        .replace(/,\s*\]/g, ']')  // 移除尾随逗号
                        .replace(/,\s*\}/g, '}');   // 移除尾随逗号
                    
                    const parsed = JSON.parse(fixedJson);
                    console.log('成功解析JSON:', parsed);
                    
                    // 验证数据结构
                    if (parsed.summary && parsed.timeline && Array.isArray(parsed.timeline)) {
                        return parsed;
                    }
                } catch (jsonError) {
                    console.log('JSON解析失败:', jsonError);
                }
            }
            
            console.warn('使用默认地图数据');
            return getDefaultMapsData();
            
        } catch (error) {
            console.error('解析响应失败:', error);
            return getDefaultMapsData();
        }
    }

    // 获取默认地图数据
    function getDefaultMapsData() {
        return {
            summary: {
                totalTime: '8小时30分钟',
                totalDistance: '15.2公里',
                locations: 5
            },
            timeline: [
                {
                    time: '08:00',
                    location: '家',
                    address: '温馨的家',
                    duration: 30,
                    type: 'home'
                },
                {
                    time: '09:00',
                    location: '咖啡厅',
                    address: '市中心咖啡厅',
                    duration: 60,
                    type: 'food'
                },
                {
                    time: '10:30',
                    location: '公司',
                    address: '工作的地方',
                    duration: 240,
                    type: 'work'
                },
                {
                    time: '14:30',
                    location: '餐厅',
                    address: '午餐地点',
                    duration: 45,
                    type: 'food'
                },
                {
                    time: '18:00',
                    location: '家',
                    address: '温馨的家',
                    duration: 0,
                    type: 'home'
                }
            ]
        };
    }

    // 渲染地图
    function renderMaps() {
        const content = document.getElementById('maps-content');
        if (!content || !currentMapsData) return;
        
        const statsHTML = `
            <div class="maps-stats">
                <div class="maps-stat-item">
                    <div class="maps-stat-value">${currentMapsData.summary.totalTime}</div>
                    <div class="maps-stat-label">总时长</div>
                </div>
                <div class="maps-stat-item">
                    <div class="maps-stat-value">${currentMapsData.summary.totalDistance}</div>
                    <div class="maps-stat-label">总距离</div>
                </div>
                <div class="maps-stat-item">
                    <div class="maps-stat-value">${currentMapsData.summary.locations}</div>
                    <div class="maps-stat-label">地点数</div>
                </div>
            </div>
        `;
        
        const timelineHTML = currentMapsData.timeline.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === currentMapsData.timeline.length - 1;
            const markerClass = isFirst ? 'start' : (isLast ? 'end' : item.type);
            const durationText = item.duration > 0 ? `停留 ${item.duration}分钟` : '当前位置';
            
            return `
                <div class="maps-timeline-item">
                    <div class="maps-timeline-time">
                        <div class="maps-timeline-time-text">${item.time}</div>
                    </div>
                    <div class="maps-timeline-marker ${markerClass}">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                    </div>
                    <div class="maps-timeline-info">
                        <div class="maps-timeline-location">${item.location}</div>
                        <div class="maps-timeline-address">${item.address}</div>
                        ${item.duration > 0 ? `
                            <div class="maps-timeline-duration">
                                <svg viewBox="0 0 24 24">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                                </svg>
                                ${durationText}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = `
            <div class="maps-view">
                <div class="maps-grid"></div>
                ${renderMapMarkers()}
            </div>
            <div class="maps-timeline">
                <div class="maps-timeline-handle"></div>
                ${statsHTML}
                <div class="maps-timeline-header">
                    <div class="maps-timeline-title">今日行程</div>
                    <div class="maps-timeline-subtitle">${currentMapsData.timeline.length}个地点</div>
                </div>
                <div class="maps-timeline-content">
                    ${timelineHTML}
                </div>
            </div>
        `;
    }

    // 渲染地图标记
    function renderMapMarkers() {
        if (!currentMapsData || !currentMapsData.timeline) return '';
        
        const markers = currentMapsData.timeline.map((item, index) => {
            const total = currentMapsData.timeline.length;
            const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
            const radius = 35;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            
            const isFirst = index === 0;
            const isCurrent = index === total - 1;
            const markerClass = isCurrent ? 'current' : '';
            
            return `
                <div class="maps-marker ${markerClass}" style="left: ${x}%; top: ${y}%;">
                    <svg class="maps-marker-icon" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                </div>
            `;
        }).join('');
        
        return markers;
    }

    // 显示地图页面
    function showMaps() {
        const mapsPage = document.getElementById('iphone-maps-page');
        if (mapsPage) {
            mapsPage.classList.add('show');
            
            // 尝试加载已保存的地图数据
            if (!currentMapsData) {
                if (loadMapsFromStorage() && currentMapsData) {
                    renderMaps();
                }
            }
        }
    }

    // 隐藏地图页面
    function hideMaps() {
        const mapsPage = document.getElementById('iphone-maps-page');
        if (mapsPage) {
            mapsPage.classList.remove('show');
        }
    }

    // 初始化
    function init() {
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createMapsPage();
                
                // 绑定地图按钮点击事件（第5个应用图标）
                setTimeout(() => {
                    const appIcons = document.querySelectorAll('.app-icon');
                    if (appIcons[4]) {
                        appIcons[4].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showMaps();
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
    window.iPhoneMaps = {
        show: showMaps,
        hide: hideMaps
    };

})();