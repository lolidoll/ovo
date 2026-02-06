/**
 * iPhone 日历应用
 * 调用主API生成角色的日历事件
 */

(function() {
    'use strict';

    let currentCalendarData = null;
    let currentCharacter = null;
    let currentDate = new Date();
    let selectedDate = null;
    const STORAGE_KEY_PREFIX = 'calendar_data_';

    // 创建日历页面HTML
    function createCalendarPage() {
        const calendarHTML = `
            <div class="iphone-calendar-page" id="iphone-calendar-page">
                <div class="calendar-header">
                    <button class="calendar-back-btn" id="calendar-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        日历
                    </button>
                    <div class="calendar-title">日历</div>
                    <button class="calendar-generate-btn" id="calendar-generate-btn">生成</button>
                </div>
                
                <div class="calendar-content" id="calendar-content">
                    <div class="calendar-empty">
                        <div class="calendar-empty-icon">📅</div>
                        <div class="calendar-empty-text">暂无日历数据</div>
                        <div class="calendar-empty-hint">点击右上角"生成"按钮<br>创建日历事件</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', calendarHTML);
            initializeCalendarEvents();
        }
    }

    // 初始化事件
    function initializeCalendarEvents() {
        const backBtn = document.getElementById('calendar-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideCalendar);
        }

        const generateBtn = document.getElementById('calendar-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateCalendar);
        }
    }

    // 获取当前角色信息（从当前聊天页面获取，与备忘录完全一致）
    function getCurrentCharacter() {
        console.log('=== 日历 - 获取当前聊天角色信息 ===');
        
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
        
        console.log('----- 日历 - 角色设置信息 -----');
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
        
        console.log('✅ 日历 - 获取到的角色信息:', {
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
        if (!window.AppState || !window.AppState.currentChat) {
            return [];
        }
        
        const currentChatId = window.AppState.currentChat.id;
        const messages = window.AppState.messages[currentChatId] || [];
        return messages.slice(-50);
    }

    // 保存日历数据到localStorage
    function saveCalendarData(convId, data) {
        if (!convId || !data) return;
        
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const saveData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(saveData));
            console.log('日历数据已保存:', convId);
        } catch (e) {
            console.error('保存日历数据失败:', e);
        }
    }
    
    // 加载日历数据
    function loadCalendarData(convId) {
        if (!convId) return null;
        
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log('日历数据已加载:', convId);
                return parsed.data;
            }
        } catch (e) {
            console.error('加载日历数据失败:', e);
        }
        
        return null;
    }

    // 生成日历数据
    async function generateCalendar() {
        const generateBtn = document.getElementById('calendar-generate-btn');
        const content = document.getElementById('calendar-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        // 显示加载状态
        content.innerHTML = `
            <div class="calendar-loading">
                <div class="calendar-loading-spinner"></div>
                <div class="calendar-loading-text">正在生成日历...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            const recentMessages = getRecentMessages();
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            
            console.log('===== 日历 - 调试提示词构建 =====');
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
                    recentMessages.map(m => {
                        const role = m.type === 'sent' ? currentCharacter.userName : currentCharacter.name;
                        const content = m.content || (m.emojiUrl ? '[表情包]' : '');
                        return `${role}: ${content}`;
                    }).join('\n');
            }
            
            const prompt = `你是${currentCharacter.name}，现在需要生成你的手机日历事件。

当前真实时间：${currentYear}年${currentMonth}月${today.getDate()}日

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

请根据角色性格、生活习惯、兴趣爱好，以及最近的对话内容，生成真实的日历事件。要求：

1. 生成10-15个日历事件
2. 事件时间要与现实时间同步，可以是：
   - 过去的事件（最近1-2个月内）
   - 今天的事件
   - 未来的计划（未来1-2个月内）
3. 必须结合现实生活中的节假日、节气（如春节、清明、端午、中秋、国庆、元旦等）
4. 事件类型包括：
   - work（工作）
   - personal（个人）
   - holiday（节假日）
   - birthday（生日）
   - meeting（会议）
   - reminder（提醒）
5. 每个事件包含：
   - 日期（YYYY-MM-DD格式）
   - 时间（HH:MM格式，可选）
   - 标题（简短）
   - 描述（详细，可选）
   - 地点（可选）
   - 类型
6. 要有真实感和活人感，符合角色人设，要与最近的对话内容相呼应

直接返回JSON对象，不要任何说明文字或markdown标记：
{
  "events": [
    {
      "date": "2026-02-05",
      "time": "14:00",
      "title": "与朋友喝咖啡",
      "description": "在星巴克见面聊天",
      "location": "星巴克(中山路店)",
      "type": "personal"
    }
  ]
}`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            const response = await callMainAPI(prompt);
            currentCalendarData = parseCalendarResponse(response);
            
            // 保存数据到localStorage
            saveCalendarData(currentCharacter.id, currentCalendarData);
            
            renderCalendar();
            
        } catch (error) {
            console.error('生成日历失败:', error);
            content.innerHTML = `
                <div class="calendar-empty">
                    <div class="calendar-empty-icon">⚠️</div>
                    <div class="calendar-empty-text">生成失败</div>
                    <div class="calendar-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
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

    // 解析日历响应（与备忘录类似）
    function parseCalendarResponse(response) {
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
                    
                    // 修复常见的JSON格式问题
                    let fixedJson = jsonStr;
                    
                    // 移除数组中的尾随逗号
                    fixedJson = fixedJson.replace(/,\s*\]/g, ']');
                    
                    // 移除对象中的尾随逗号
                    fixedJson = fixedJson.replace(/,\s*}/g, '}');
                    
                    console.log('修复后的JSON:', fixedJson);
                    
                    let parsed = JSON.parse(fixedJson);
                    console.log('成功解析JSON:', parsed);
                    
                    // 验证并补充缺失的必要字段
                    if (!parsed.events || !Array.isArray(parsed.events)) {
                        console.warn('events不完整，使用默认值');
                        parsed.events = getDefaultCalendarData().events;
                    }
                    
                    console.log('最终完整数据:', parsed);
                    return parsed;
                    
                } catch (jsonError) {
                    console.error('JSON解析错误:', jsonError);
                }
            }
            
            console.warn('未找到有效的JSON，使用默认数据');
            return getDefaultCalendarData();
            
        } catch (error) {
            console.error('解析响应失败:', error);
            return getDefaultCalendarData();
        }
    }

    // 获取默认日历数据
    function getDefaultCalendarData() {
        const today = new Date();
        return {
            events: [
                {
                    date: formatDate(today),
                    time: '14:00',
                    title: '下午茶时间',
                    description: '放松一下',
                    location: '',
                    type: 'personal'
                }
            ]
        };
    }

    // 渲染日历
    function renderCalendar() {
        const content = document.getElementById('calendar-content');
        if (!content || !currentCalendarData) return;
        
        const monthView = renderMonthView();
        const eventsList = renderEventsList();
        
        content.innerHTML = `
            <div class="calendar-data">
                ${monthView}
                ${eventsList}
            </div>
        `;
        
        bindCalendarDayEvents();
    }

    // 渲染月视图
    function renderMonthView() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekdaysHTML = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('');
        
        let daysHTML = '';
        const prevMonthDays = new Date(year, month, 0).getDate();
        
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            daysHTML += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }
        
        const today = new Date();
        const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvent = currentCalendarData.events.some(e => e.date === dateStr);
            const isToday = isCurrentMonth && day === today.getDate();
            
            const classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (hasEvent) classes.push('has-event');
            
            const dots = hasEvent ? '<div class="calendar-day-dots"><div class="calendar-day-dot"></div></div>' : '';
            
            daysHTML += `
                <div class="${classes.join(' ')}" data-date="${dateStr}">
                    <span class="calendar-day-number">${day}</span>
                    ${dots}
                </div>
            `;
        }
        
        const remainingDays = 42 - (startDay + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            daysHTML += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }
        
        return `
            <div class="calendar-month-view">
                <div class="calendar-month-header">
                    <div class="calendar-month-title">${year}年${monthNames[month]}</div>
                    <button class="calendar-today-btn" onclick="window.iPhoneCalendar.goToToday()">今天</button>
                </div>
                <div class="calendar-weekdays">${weekdaysHTML}</div>
                <div class="calendar-days">${daysHTML}</div>
            </div>
        `;
    }

    // 渲染事件列表
    function renderEventsList() {
        if (!currentCalendarData.events || currentCalendarData.events.length === 0) {
            return '';
        }
        
        const sortedEvents = [...currentCalendarData.events].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        const eventsHTML = sortedEvents.map(event => {
            const eventDate = new Date(event.date);
            const dateStr = formatDateChinese(eventDate);
            const timeStr = event.time || '全天';
            
            return `
                <div class="calendar-event-item ${event.type}">
                    <div class="calendar-event-header">
                        <div class="calendar-event-time">${timeStr}</div>
                        <div class="calendar-event-date">${dateStr}</div>
                    </div>
                    <div class="calendar-event-title">${event.title}</div>
                    ${event.description ? `<div class="calendar-event-description">${event.description}</div>` : ''}
                    ${event.location ? `
                        <div class="calendar-event-location">
                            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            ${event.location}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        return `
            <div class="calendar-events-section">
                <div class="calendar-events-title">即将到来</div>
                ${eventsHTML}
            </div>
        `;
    }

    // 绑定日期点击事件
    function bindCalendarDayEvents() {
        const days = document.querySelectorAll('.calendar-day[data-date]');
        days.forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                showEventsForDate(date);
            });
        });
    }

    // 显示指定日期的事件
    function showEventsForDate(dateStr) {
        const events = currentCalendarData.events.filter(e => e.date === dateStr);
        if (events.length === 0) return;
        
        console.log('Events for', dateStr, events);
    }

    // 回到今天
    function goToToday() {
        currentDate = new Date();
        renderCalendar();
    }

    // 格式化日期
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 格式化日期（中文）
    function formatDateChinese(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];
        return `${month}月${day}日 ${weekday}`;
    }

    // 显示日历页面（尝试加载已保存的数据）
    function showCalendar() {
        const calendarPage = document.getElementById('iphone-calendar-page');
        if (calendarPage) {
            calendarPage.classList.add('show');
            
            // 尝试加载已保存的数据
            const character = getCurrentCharacter();
            if (character.id) {
                const savedData = loadCalendarData(character.id);
                if (savedData) {
                    currentCharacter = character;
                    currentCalendarData = savedData;
                    renderCalendar();
                }
            }
        }
    }

    // 隐藏日历页面
    function hideCalendar() {
        const calendarPage = document.getElementById('iphone-calendar-page');
        if (calendarPage) {
            calendarPage.classList.remove('show');
        }
    }

    // 初始化
    function init() {
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createCalendarPage();
                
                // 绑定日历按钮点击事件（第4个应用图标）
                setTimeout(() => {
                    const appIcons = document.querySelectorAll('.app-icon');
                    if (appIcons[3]) {
                        appIcons[3].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showCalendar();
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
    window.iPhoneCalendar = {
        show: showCalendar,
        hide: hideCalendar,
        goToToday: goToToday
    };

})();