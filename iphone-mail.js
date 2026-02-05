/**
 * iPhone 邮件应用
 * 调用主API生成角色相关的邮件记录
 */

(function() {
    'use strict';

    let currentMailData = null;
    let currentCharacter = null;
    let isGenerating = false;

    // 创建邮件页面HTML
    function createMailPage() {
        const mailHTML = `
            <div class="iphone-mail-page" id="iphone-mail-page">
                <div class="mail-header">
                    <button class="mail-back-btn" id="mail-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        邮箱
                    </button>
                    <h1 class="mail-title">邮箱</h1>
                    <button class="mail-generate-btn" id="mail-generate-btn">生成</button>
                </div>
                
                <div class="mail-content" id="mail-content">
                    <div class="mail-empty">
                        <div class="mail-empty-icon">📧</div>
                        <div class="mail-empty-text">暂无邮件数据</div>
                        <div class="mail-empty-hint">点击右上角"生成"按钮<br>创建角色的邮件记录</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', mailHTML);
            initializeMailEvents();
        }
    }

    // 初始化事件监听
    function initializeMailEvents() {
        const backBtn = document.getElementById('mail-back-btn');
        const generateBtn = document.getElementById('mail-generate-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', hideMailPage);
        }
        
        if (generateBtn) {
            generateBtn.addEventListener('click', generateMailData);
        }
    }

    // 显示邮件页面
    function showMailPage() {
        const mailPage = document.getElementById('iphone-mail-page');
        if (!mailPage) {
            createMailPage();
        }
        
        const page = document.getElementById('iphone-mail-page');
        if (page) {
            page.classList.add('show');
        }
        
        // 隐藏主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'none';
        }
    }

    // 隐藏邮件页面
    function hideMailPage() {
        const mailPage = document.getElementById('iphone-mail-page');
        if (mailPage) {
            mailPage.classList.remove('show');
        }
        
        // 显示主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'block';
        }
    }

    // 生成邮件数据
    async function generateMailData() {
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
        const generateBtn = document.getElementById('mail-generate-btn');
        if (generateBtn) {
            generateBtn.classList.add('generating');
            generateBtn.textContent = '生成中...';
        }

        // 显示加载状态
        showLoadingState();

        try {
            // 调用主API生成邮件数据
            const mailData = await callMainAPIForMail(characterInfo);
            
            if (mailData) {
                currentMailData = mailData;
                currentCharacter = characterInfo;
                renderMailData(mailData);
            }
        } catch (error) {
            console.error('生成邮件数据失败:', error);
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

    // 调用主API生成邮件数据
    async function callMainAPIForMail(characterInfo) {
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
        const prompt = `你是一个创意十足的AI助手，现在需要为角色"${characterInfo.characterName}"生成最近的邮件来往记录。

【角色信息】
角色名称: ${characterInfo.characterName}
角色设定: ${characterSetting || '无'}

【用户信息】
用户名称: ${characterInfo.userName}
用户设定: ${characterInfo.userSetting || '无'}

【最近对话】
${conversationSummary || '暂无对话记录'}

【任务要求】
请根据以上信息，生成一个真实、详细、有活人感的邮件记录。想象这是角色真实的手机邮件app，他/她会和谁有邮件来往？收到什么邮件？

要求：
1. 生成5-10条邮件记录
2. 每条邮件包含：发件人、邮箱地址、主题、预览内容、完整正文、时间、分类（工作/个人/推广/社交）
3. 邮件内容要符合角色的性格、身份、生活场景、职业背景
4. 要有生活气息和真实感，比如工作邮件、朋友邮件、订阅通知、账单提醒等
5. 时间要合理（最近几天内），按时间倒序排列
6. 可以包含一些有趣的细节，体现角色个性和生活状态
7. 发挥你的创意与想象，让邮件记录仿佛真的是角色手机一样

【输出格式】
请严格按照以下JSON格式输出，不要有任何其他文字：

{
  "emails": [
    {
      "id": "mail_1",
      "sender": "张三",
      "email": "zhangsan@example.com",
      "subject": "关于周五会议的安排",
      "preview": "你好，关于本周五下午3点的项目讨论会议...",
      "body": "你好，\\n\\n关于本周五下午3点的项目讨论会议，我想和你确认一下具体的议程安排。\\n\\n会议地点：会议室A\\n参会人员：项目组全体成员\\n\\n请提前准备好相关资料。\\n\\n谢谢！\\n张三",
      "time": "今天 14:30",
      "category": "work",
      "unread": true,
      "icon": "💼"
    },
    {
      "id": "mail_2",
      "sender": "Netflix",
      "email": "info@netflix.com",
      "subject": "本月新片推荐",
      "preview": "本月精选影片已上线，快来观看吧...",
      "body": "亲爱的用户，\\n\\n本月Netflix为您精选了多部精彩影片：\\n\\n1. 《星际探索》- 科幻冒险\\n2. 《温暖的抱抱》- 浪漫喜剧\\n3. 《悬疑档案》- 惊悚推理\\n\\n立即观看，享受视听盛宴！",
      "time": "昨天 20:15",
      "category": "promotion",
      "unread": false,
      "icon": "🎬"
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
            
            const mailData = JSON.parse(jsonStr);
            return mailData;
        } catch (e) {
            console.error('解析API返回的JSON失败:', e);
            console.log('原始内容:', content);
            throw new Error('生成的数据格式错误');
        }
    }

    // 显示加载状态
    function showLoadingState() {
        const content = document.getElementById('mail-content');
        if (content) {
            content.innerHTML = `
                <div class="mail-loading">
                    <div class="mail-loading-spinner"></div>
                    <div class="mail-loading-text">正在生成邮件数据...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    function showErrorState(message) {
        const content = document.getElementById('mail-content');
        if (content) {
            content.innerHTML = `
                <div class="mail-empty">
                    <div class="mail-empty-icon">⚠️</div>
                    <div class="mail-empty-text">生成失败</div>
                    <div class="mail-empty-hint">${message}</div>
                </div>
            `;
        }
    }

    // 渲染邮件数据
    function renderMailData(data) {
        const content = document.getElementById('mail-content');
        if (!content) return;

        let html = '<div class="mail-list">';

        if (data.emails && data.emails.length > 0) {
            data.emails.forEach(email => {
                const unreadClass = email.unread ? 'unread' : '';
                const categoryClass = email.category || 'personal';
                
                html += `
                    <div class="mail-item ${unreadClass}" data-mail-id="${email.id}">
                        <div class="mail-item-icon ${categoryClass}">
                            ${email.icon || '📧'}
                        </div>
                        <div class="mail-item-content">
                            <div class="mail-item-header">
                                <div class="mail-item-sender">${escapeHtml(email.sender)}</div>
                                <div class="mail-item-time">${escapeHtml(email.time)}</div>
                            </div>
                            <div class="mail-item-subject">${escapeHtml(email.subject)}</div>
                            <div class="mail-item-preview">${escapeHtml(email.preview)}</div>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        content.innerHTML = html;

        // 添加点击事件
        const mailItems = content.querySelectorAll('.mail-item');
        mailItems.forEach(item => {
            item.addEventListener('click', function() {
                const mailId = this.getAttribute('data-mail-id');
                const email = data.emails.find(e => e.id === mailId);
                if (email) {
                    showMailDetail(email);
                }
            });
        });
    }

    // 显示邮件详情
    function showMailDetail(email) {
        // 创建详情页面
        let detailPage = document.getElementById('iphone-mail-detail-page');
        if (!detailPage) {
            detailPage = document.createElement('div');
            detailPage.id = 'iphone-mail-detail-page';
            detailPage.className = 'mail-detail-page';
            document.querySelector('.iphone-screen').appendChild(detailPage);
        }

        const categoryClass = email.category || 'personal';
        
        detailPage.innerHTML = `
            <div class="mail-detail-header">
                <button class="mail-detail-back-btn" id="mail-detail-back-btn">
                    <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                        <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                    </svg>
                    返回
                </button>
                <div class="mail-detail-subject">${escapeHtml(email.subject)}</div>
                <div class="mail-detail-meta">
                    <div class="mail-detail-sender-avatar ${categoryClass}">
                        ${email.icon || '📧'}
                    </div>
                    <div class="mail-detail-sender-info">
                        <div class="mail-detail-sender-name">${escapeHtml(email.sender)}</div>
                        <div class="mail-detail-sender-email">${escapeHtml(email.email)}</div>
                    </div>
                    <div class="mail-detail-time">${escapeHtml(email.time)}</div>
                </div>
            </div>
            <div class="mail-detail-content">
                <div class="mail-detail-body">${escapeHtml(email.body)}</div>
            </div>
        `;

        detailPage.classList.add('show');

        // 添加返回按钮事件
        const backBtn = detailPage.querySelector('#mail-detail-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                detailPage.classList.remove('show');
            });
        }
    }

    // HTML转义
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toast提示
    function showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // 导出到全局
    window.iPhoneMail = {
        show: showMailPage,
        hide: hideMailPage,
        generate: generateMailData
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ iPhone邮件模块已加载');
        });
    } else {
        console.log('✅ iPhone邮件模块已加载');
    }

})();