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

    // 生成日历数据
    async function generateCalendar() {
        const generateBtn = document.getElementById('calendar-generate-btn');
        const content = document.getElementById('calendar-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
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
            
            const prompt = `你是${currentCharacter.name}，现在需要生成你的手机日历事件。

当前真实时间：${currentYear}年${currentMonth}月${today.getDate()}日

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${JSON.stringify(currentCharacter.card)}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}

最近对话：
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

请根据角色性格、生活习惯、兴趣爱好，生成真实的日历事件。要求：

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
6. 要有真实感和活人感，符合角色人设

请以JSON格式返回，格式如下：
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

            const response = await callMainAPI(prompt);
            currentCalendarData = parseCalendarResponse(response);
            
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

    // 解析日历响应
    function parseCalendarResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
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

    // 显示日历页面
    function showCalendar() {
        const calendarPage = document.getElementById('iphone-calendar-page');
        if (calendarPage) {
            calendarPage.classList.add('show');
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