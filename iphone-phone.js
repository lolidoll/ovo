/**
 * iPhone 电话应用
 * 调用主API生成角色相关的电话联系人记录
 */

(function() {
    'use strict';

    let currentPhoneData = null;
    let currentCharacter = null;
    let isGenerating = false;

    // 创建电话页面HTML
    function createPhonePage() {
        const phoneHTML = `
            <div class="iphone-phone-page" id="iphone-phone-page">
                <div class="phone-header">
                    <button class="phone-back-btn" id="phone-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        电话
                    </button>
                    <h1 class="phone-title">电话</h1>
                    <button class="phone-generate-btn" id="phone-generate-btn">生成</button>
                </div>
                
                <div class="phone-content" id="phone-content">
                    <div class="phone-empty">
                        <div class="phone-empty-icon">📱</div>
                        <div class="phone-empty-text">暂无电话记录</div>
                        <div class="phone-empty-hint">点击右上角"生成"按钮<br>创建角色的电话联系人</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', phoneHTML);
            initializePhoneEvents();
        }
    }

    // 初始化事件监听
    function initializePhoneEvents() {
        const backBtn = document.getElementById('phone-back-btn');
        const generateBtn = document.getElementById('phone-generate-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', hidePhonePage);
        }
        
        if (generateBtn) {
            generateBtn.addEventListener('click', generatePhoneData);
        }
    }

    // 显示电话页面
    function showPhonePage() {
        const phonePage = document.getElementById('iphone-phone-page');
        if (!phonePage) {
            createPhonePage();
        }
        
        const page = document.getElementById('iphone-phone-page');
        if (page) {
            page.classList.add('show');
        }
        
        // 隐藏主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'none';
        }
    }

    // 隐藏电话页面
    function hidePhonePage() {
        const phonePage = document.getElementById('iphone-phone-page');
        if (phonePage) {
            phonePage.classList.remove('show');
        }
        
        // 显示主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'block';
        }
    }

    // 生成电话数据
    async function generatePhoneData() {
        if (isGenerating) {
            return;
        }

        // 获取当前角色信息
        const characterInfo = getCurrentCharacterInfo();
        if (!characterInfo) {
            showToast('请先在聊天页面打开一个角色对话');
            return;
        }

        isGenerating = true;
        const generateBtn = document.getElementById('phone-generate-btn');
        if (generateBtn) {
            generateBtn.classList.add('generating');
            generateBtn.textContent = '生成中...';
        }

        // 显示加载状态
        showLoadingState();

        try {
            // 调用主API生成电话数据
            const phoneData = await callMainAPIForPhone(characterInfo);
            
            if (phoneData) {
                currentPhoneData = phoneData;
                currentCharacter = characterInfo;
                renderPhoneData(phoneData);
            }
        } catch (error) {
            console.error('生成电话数据失败:', error);
            showErrorState(error.message || '生成失败，请重试');
        } finally {
            isGenerating = false;
            if (generateBtn) {
                generateBtn.classList.remove('generating');
                generateBtn.textContent = '生成';
            }
        }
    }

    // 获取当前角色信息
    function getCurrentCharacterInfo() {
        // 从全局AppState获取当前聊天角色
        if (!window.AppState || !window.AppState.currentChat) {
            return null;
        }

        const currentChat = window.AppState.currentChat;
        const convId = currentChat.id;
        
        // 获取角色设定
        const characterName = currentChat.name || '角色';
        const characterAvatar = currentChat.avatar || '';
        
        // 获取角色设定（从conversation对象中）
        let characterSetting = '';
        const conversation = window.AppState.conversations.find(c => c.id === convId);
        if (conversation && conversation.characterSetting) {
            characterSetting = conversation.characterSetting;
        }
        
        // 获取用户设定
        let userSetting = '';
        if (conversation && conversation.userSetting) {
            userSetting = conversation.userSetting;
        }
        
        // 获取用户名称
        const userName = window.AppState.user?.name || '用户';
        
        // 获取最近50条对话
        const messages = window.AppState.messages[convId] || [];
        const recentMessages = messages.slice(-50);
        
        return {
            convId,
            characterName,
            characterAvatar,
            characterSetting,
            userName,
            userSetting,
            recentMessages
        };
    }

    // 调用主API生成电话数据
    async function callMainAPIForPhone(characterInfo) {
        // 检查API配置
        if (!window.MainAPIManager || !window.AppState.apiSettings) {
            throw new Error('API未配置');
        }

        const api = window.AppState.apiSettings;
        if (!api.endpoint || !api.selectedModel) {
            throw new Error('请先配置API端点和模型');
        }

        // 构建对话历史摘要
        let conversationSummary = '';
        if (characterInfo.recentMessages && characterInfo.recentMessages.length > 0) {
            conversationSummary = characterInfo.recentMessages
                .map(msg => {
                    const sender = msg.sender === 'user' ? characterInfo.userName : characterInfo.characterName;
                    return `${sender}: ${msg.content}`;
                })
                .join('\n');
        }

        // 构建提示词
        const prompt = `你是一个创意十足的AI助手，现在需要为角色"${characterInfo.characterName}"生成真实的电话联系人记录和通话历史。

【角色信息】
角色名称: ${characterInfo.characterName}
角色设定: ${characterInfo.characterSetting || '无'}

【用户信息】
用户名称: ${characterInfo.userName}
用户设定: ${characterInfo.userSetting || '无'}

【最近对话】
${conversationSummary || '暂无对话记录'}

【任务要求】
请根据以上信息，生成一个真实、详细、有活人感的电话联系人和通话记录。想象这是角色真实的手机电话app，TA会和谁联系？TA的社交圈是什么样的？

要求：
1. 生成5-10个联系人（NPC），每个联系人要有独特的身份、性格和关系
2. 每个联系人包含：姓名、头像（emoji图标）、关系标签、联系电话、备注
3. 为每个联系人生成3-5条最近的通话记录
4. 通话记录要包含：来电/去电/未接、通话时间、通话时长、日期
5. 联系人要多样化：家人、朋友、同事、客户、同学等
6. 通话内容要符合角色的生活轨迹和社交关系
7. 要有生活气息，比如早起问候、工作沟通、约会安排等
8. 可以包含一些有趣的细节，体现角色的个性和人际关系
9. 统计总通话次数、接通率、最长通话时间等数据

【输出格式】
请严格按照以下JSON格式输出，不要有任何其他文字：

{
  "contacts": [
    {
      "id": "contact_1",
      "name": "联系人姓名",
      "avatar": "👨‍💼",
      "relationship": "工作伙伴",
      "phone": "138****1234",
      "label": "重要",
      "calls": [
        {
          "type": "outgoing",
          "direction": "去电",
          "date": "今天",
          "time": "09:30",
          "duration": "3分25秒",
          "detail": "讨论项目进度"
        }
      ]
    }
  ],
  "stats": {
    "totalCalls": 156,
    "missedCalls": 12,
    "incomingCalls": 89,
    "outgoingCalls": 67,
    "avgDuration": "2分30秒",
    "longestCall": "45分12秒"
  },
  "recentCalls": [
    {
      "name": "联系人姓名",
      "type": "outgoing",
      "direction": "去电",
      "date": "今天",
      "time": "09:30",
      "duration": "3分25秒",
      "avatar": "👨‍💼"
    }
  ]
}`;

        // 调用API
        const baseEndpoint = window.APIUtils.normalizeEndpoint(api.endpoint);
        const apiKey = api.apiKey || '';

        const requestBody = {
            model: api.selectedModel,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.9,
            max_tokens: 3000
        };

        const response = await fetch(baseEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // 解析JSON
        try {
            // 尝试提取JSON（可能包含在代码块中）
            let jsonStr = content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            
            const phoneData = JSON.parse(jsonStr);
            return phoneData;
        } catch (e) {
            console.error('解析API返回的JSON失败:', e);
            console.log('原始内容:', content);
            throw new Error('生成的数据格式错误');
        }
    }

    // 显示加载状态
    function showLoadingState() {
        const content = document.getElementById('phone-content');
        if (content) {
            content.innerHTML = `
                <div class="phone-loading">
                    <div class="phone-loading-spinner"></div>
                    <div class="phone-loading-text">正在生成电话数据...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    function showErrorState(message) {
        const content = document.getElementById('phone-content');
        if (content) {
            content.innerHTML = `
                <div class="phone-empty">
                    <div class="phone-empty-icon">⚠️</div>
                    <div class="phone-empty-text">生成失败</div>
                    <div class="phone-empty-hint">${message}</div>
                </div>
            `;
        }
    }

    // 渲染电话数据
    function renderPhoneData(phoneData) {
        const content = document.getElementById('phone-content');
        if (!content) return;

        let html = '';

        // 渲染统计卡片
        if (phoneData.stats) {
            html += `
                <div class="phone-stats">
                    <div class="stats-header">通话统计</div>
                    <div class="stats-row">
                        <span class="stats-label">总通话次数</span>
                        <span class="stats-value total-calls">${phoneData.stats.totalCalls || 0}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">未接来电</span>
                        <span class="stats-value missed-calls">${phoneData.stats.missedCalls || 0}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">来电信</span>
                        <span class="stats-value">${phoneData.stats.incomingCalls || 0}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">去电信</span>
                        <span class="stats-value">${phoneData.stats.outgoingCalls || 0}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">平均时长</span>
                        <span class="stats-value">${phoneData.stats.avgDuration || '0'}</span>
                    </div>
                </div>
            `;
        }

        // 渲染最近通话
        if (phoneData.recentCalls && phoneData.recentCalls.length > 0) {
            html += `
                <div class="contact-section">
                    <div class="contact-section-header">最近通话</div>
            `;
            
            phoneData.recentCalls.forEach(call => {
                const typeClass = call.type;
                const iconSvg = getCallIcon(call.type);
                
                html += `
                    <div class="recent-call-item">
                        <div class="call-icon ${typeClass}">
                            ${iconSvg}
                        </div>
                        <div class="call-info">
                            <div class="call-name">${call.name || '未知号码'}</div>
                            <div class="call-detail">
                                <span class="call-type ${typeClass}">${call.direction || ''}</span>
                                <span class="call-duration">${call.duration || ''}</span>
                            </div>
                        </div>
                        <div class="contact-time">${call.date || ''} ${call.time || ''}</div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        // 渲染联系人列表
        if (phoneData.contacts && phoneData.contacts.length > 0) {
            html += `
                <div class="contact-section">
                    <div class="contact-section-header">联系人</div>
                    <div class="phone-contacts">
            `;
            
            phoneData.contacts.forEach(contact => {
                html += `
                    <div class="contact-item">
                        <div class="contact-avatar">
                            ${contact.avatar || '👤'}
                        </div>
                        <div class="contact-info">
                            <div class="contact-name">${contact.name || '未知'}</div>
                            <div class="contact-subtitle">${contact.relationship || contact.phone || ''}</div>
                        </div>
                        <div class="contact-meta">
                            <div class="contact-type ${contact.label ? 'incoming' : ''}">${contact.label || '联系人'}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        content.innerHTML = html;
    }

    // 获取通话图标
    function getCallIcon(type) {
        switch(type) {
            case 'incoming':
                return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.49-5.15-3.8-6.62-6.63l1.97-1.57c.26-.27.36-.66.24-1.01-.36-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>`;
            case 'outgoing':
                return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
            case 'missed':
                return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 7L12 14.59 6.41 9H11V7H3v8h2v-6.59l7 7 9-9z"/></svg>`;
            default:
                return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
        }
    }

    // Toast提示函数
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            z-index: 9999;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            max-width: 80%;
            text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // 导出函数供外部使用
    window.iPhonePhone = {
        show: showPhonePage,
        hide: hidePhonePage
    };

})();