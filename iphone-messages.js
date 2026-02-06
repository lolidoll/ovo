/**
 * iPhone 短信应用
 * 调用主API生成角色相关的短信来往记录
 */

(function() {
    'use strict';

    let currentMessagesData = null;
    let currentCharacter = null;
    let isGenerating = false;
    const STORAGE_KEY_PREFIX = 'messages_data_';

    // 创建短信页面HTML
    function createMessagesPage() {
        const messagesHTML = `
            <div class="iphone-messages-page" id="iphone-messages-page">
                <div class="messages-header">
                    <button class="messages-back-btn" id="messages-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        信息
                    </button>
                    <h1 class="messages-title">信息</h1>
                    <button class="messages-generate-btn" id="messages-generate-btn">生成</button>
                </div>
                
                <div class="messages-content" id="messages-content">
                    <div class="messages-empty">
                        <div class="messages-empty-icon">💬</div>
                        <div class="messages-empty-text">暂无短信记录</div>
                        <div class="messages-empty-hint">点击右上角"生成"按钮<br>创建角色的短信来往记录</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', messagesHTML);
            initializeMessagesEvents();
        }
    }

    // 初始化事件监听
    function initializeMessagesEvents() {
        const backBtn = document.getElementById('messages-back-btn');
        const generateBtn = document.getElementById('messages-generate-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', hideMessagesPage);
        }
        
        if (generateBtn) {
            generateBtn.addEventListener('click', generateMessagesData);
        }
    }

    // 显示短信页面
    function showMessagesPage() {
        const messagesPage = document.getElementById('iphone-messages-page');
        if (!messagesPage) {
            createMessagesPage();
        }
        
        const page = document.getElementById('iphone-messages-page');
        if (page) {
            page.classList.add('show');
        }
        
        // 隐藏主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'none';
        }

        // 尝试加载已保存的短信数据
        const characterInfo = getCurrentCharacterInfo();
        if (characterInfo && characterInfo.convId) {
            const savedData = loadMessagesData(characterInfo.convId);
            if (savedData) {
                currentMessagesData = savedData;
                currentCharacter = characterInfo;
                renderMessagesData(savedData);
            }
        }
    }

    // 隐藏短信页面
    function hideMessagesPage() {
        const messagesPage = document.getElementById('iphone-messages-page');
        if (messagesPage) {
            messagesPage.classList.remove('show');
        }
        
        // 显示主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'block';
        }

        // 同时隐藏详情页
        const detailPage = document.getElementById('iphone-messages-detail-page');
        if (detailPage) {
            detailPage.classList.remove('show');
        }
    }

    // 生成短信数据
    async function generateMessagesData() {
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
        const generateBtn = document.getElementById('messages-generate-btn');
        if (generateBtn) {
            generateBtn.classList.add('generating');
            generateBtn.textContent = '生成中...';
        }

        // 显示加载状态
        showLoadingState();

        try {
            // 调用主API生成短信数据
            const messagesData = await callMainAPIForMessages(characterInfo);
            
            if (messagesData) {
                currentMessagesData = messagesData;
                currentCharacter = characterInfo;
                renderMessagesData(messagesData);
            }
        } catch (error) {
            console.error('生成短信数据失败:', error);
            showErrorState(error.message || '生成失败，请重试');
        } finally {
            isGenerating = false;
            if (generateBtn) {
                generateBtn.classList.remove('generating');
                generateBtn.textContent = '生成';
            }
        }
    }

    // 获取当前角色信息（参考备忘录实现）
    function getCurrentCharacterInfo() {
        console.log('=== 获取当前聊天角色信息 ===');
        
        // 从全局AppState获取当前聊天角色
        if (!window.AppState || !window.AppState.currentChat) {
            console.warn('⚠️ 未找到当前聊天');
            return null;
        }

        const currentChat = window.AppState.currentChat;
        const convId = currentChat.id;
        console.log('当前聊天ID:', convId);
        
        // 从conversations中找到对应的conversation
        const conversation = window.AppState.conversations.find(c => c.id === convId);
        console.log('找到的conversation:', conversation);
        
        if (!conversation) {
            console.warn('⚠️ 未找到对应的conversation');
            return null;
        }
        
        // 获取角色设定
        const characterName = conversation.name || '角色';
        const characterAvatar = currentChat.avatar || '';
        const characterSetting = conversation.characterSetting || '';
        
        // 从角色设置中获取用户名和人设（conversation.userNameForChar 和 userPersonality）
        let userName = conversation.userNameForChar || window.AppState.user?.name || '用户';
        let userSetting = conversation.userPersonality || window.AppState.user?.personality || '';
        
        console.log('----- 角色设置信息 -----');
        console.log('1. conversation.userNameForChar:', conversation.userNameForChar);
        console.log('2. conversation.userPersonality:', conversation.userPersonality);
        console.log('3. 角色名称:', characterName);
        console.log('4. 角色设定:', characterSetting ? '已设置' : '未设置');
        console.log('最终使用的用户名:', userName);
        console.log('最终使用的用户设定:', userSetting ? '已设置' : '未设置');
        
        // 获取历史总结（该角色的角色设置页面里绑定的）
        const summaries = conversation.summaries || [];
        const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1].content : '';
        console.log('历史总结数:', summaries.length);
        
        // 获取最近50条对话
        const messages = window.AppState.messages[convId] || [];
        const recentMessages = messages.slice(-50);
        console.log('最新消息数:', recentMessages.length);
        console.log('=======================');
        
        return {
            convId,
            characterName,
            characterAvatar,
            characterSetting,
            userName,
            userSetting,
            summaries,
            latestSummary,
            recentMessages
        };
    }

    // 调用主API生成短信数据（参考备忘录实现）
    async function callMainAPIForMessages(characterInfo) {
        // 检查API配置
        if (!window.AppState || !window.AppState.apiSettings) {
            throw new Error('API未配置');
        }

        const api = window.AppState.apiSettings;
        if (!api.endpoint || !api.selectedModel) {
            throw new Error('请先配置API端点和模型');
        }

        // 构建历史总结文本
        let summariesText = '';
        if (characterInfo.summaries && characterInfo.summaries.length > 0) {
            summariesText = '\n历史总结：\n' + characterInfo.summaries.map(s => s.content || s).join('\n');
        }

        // 构建对话历史摘要
        let conversationSummary = '';
        if (characterInfo.recentMessages && characterInfo.recentMessages.length > 0) {
            conversationSummary = '\n最近对话（最新50条）：\n' + characterInfo.recentMessages
                .map(msg => {
                    const sender = msg.type === 'sent' ? characterInfo.userName : characterInfo.characterName;
                    const content = msg.content || (msg.emojiUrl ? '[表情包]' : '');
                    return `${sender}: ${content}`;
                })
                .join('\n');
        }

        console.log('===== 短信 - 调试提示词构建 =====');
        console.log('角色名:', characterInfo.characterName);
        console.log('用户名:', characterInfo.userName);
        console.log('是否有角色设定:', !!characterInfo.characterSetting);
        console.log('历史总结数:', characterInfo.summaries?.length || 0);
        console.log('最近消息数:', characterInfo.recentMessages.length);

        // 构建提示词
        const prompt = `你是一个创意十足的AI助手，现在需要为角色"${characterInfo.characterName}"生成最近的短信来往记录。

【角色信息】
角色名称: ${characterInfo.characterName}
角色设定: ${characterInfo.characterSetting || '无'}

【用户信息】
用户名称: ${characterInfo.userName}
用户设定: ${characterInfo.userSetting || '无'}
${summariesText}
${conversationSummary}

【任务要求】
请根据以上信息，生成一个真实、详细、有活人感的短信来往记录。想象这是角色真实的手机短信app，他/她会和谁有短信来往？讨论什么话题？

要求：
1. 生成5-10个联系人的短信对话
2. 每个联系人包含：姓名、头像emoji、分类（工作/家人/朋友/服务）、最后一条短信预览、时间、未读状态
3. 每个联系人的对话记录要详细，包含多条短信往来（建议5-15条对话）
4. 短信内容要符合角色的性格、身份、生活场景、职业背景
5. 要有生活气息和真实感，比如和同事讨论工作、和家人闲聊、和朋友约饭、和服务通知等
6. 时间要合理（最近几天内），按时间倒序排列
7. 可以包含一些有趣的细节，比如表情符号、网络用语、语音消息标记等
8. 发挥你的创意与想象，让短信记录仿佛真的是角色手机一样，有活人感

【对话分类参考】
- 工作：同事、上司、客户、工作群等
- 家人：父母、兄弟姐妹、亲戚等
- 朋友：同学、闺蜜、兄弟、约会对象等
- 服务：快递、外卖、银行、验证码、系统通知等

【输出格式】
请严格按照以下JSON格式输出，不要有任何其他文字：

{
  "conversations": [
    {
      "id": "conv_1",
      "name": "张三",
      "avatar": "👨‍💼",
      "category": "work",
      "unread": true,
      "lastMessage": "好的，明天见！",
      "time": "14:30",
      "messages": [
        {
          "id": "msg_1",
          "text": "明天下午的会议改到3点了",
          "sent": false,
          "timestamp": "今天 14:28"
        },
        {
          "id": "msg_2",
          "text": "好的，明天见！",
          "sent": true,
          "timestamp": "今天 14:30"
        }
      ]
    }
  ]
}

注意：
- sent: true表示角色发送的，false表示对方发送的
- messages数组中的短信按时间顺序排列（从旧到新）
- 可以使用emoji表情增加真实感
- 时间格式参考："今天 14:30"、"昨天 20:15"、"2月3日"等`;

        console.log('完整提示词:', prompt);
        console.log('========================');

        // 调用API（规范化endpoint，与备忘录保持一致）
        const baseEndpoint = api.endpoint.replace(/\/+$/, '');
        const endpoint = baseEndpoint + '/v1/chat/completions';
        const apiKey = api.apiKey || '';

        const requestBody = {
            model: api.selectedModel,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.95,
            max_tokens: 40000
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

        try {
            console.log('调用API生成短信数据...');
            console.log('API URL:', endpoint);
            console.log('模型:', api.selectedModel);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody),
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
            
            const content = data.choices[0].message.content;
            
            console.log('===== 开始解析短信数据 =====');
            console.log('原始API响应长度:', content.length);
            console.log('原始API响应前500字符:', content.substring(0, 500));
            
            // 解析JSON（参考备忘录的多层解析逻辑）
            try {
                // 清理响应内容，移除markdown代码块标记
                let cleanedResponse = content
                    .replace(/```json\s*/gi, '')
                    .replace(/```\s*/gi, '')
                    .trim();
                
                console.log('清理后长度:', cleanedResponse.length);
                
                // 尝试提取JSON对象 - 使用贪婪匹配确保获取完整JSON
                let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/s);
                
                if (!jsonMatch) {
                    console.error('❌ 未找到JSON对象');
                    throw new Error('API返回的内容中未找到有效的JSON对象');
                }
                
                let jsonStr = jsonMatch[0];
                console.log('找到JSON对象，长度:', jsonStr.length);
                console.log('JSON开头:', jsonStr.substring(0, 100));
                console.log('JSON结尾:', jsonStr.substring(jsonStr.length - 100));
                
                // 修复常见的JSON格式问题
                let fixedJson = jsonStr;
                
                // 1. 移除尾随逗号（在数组和对象中）
                fixedJson = fixedJson.replace(/,(\s*[\]}])/g, '$1');
                
                // 2. 修复可能的换行问题（在字符串中的换行）
                // 注意：这里要小心处理，不要破坏有意的换行
                
                // 3. 确保所有字符串都正确闭合
                // 检查是否有未闭合的引号
                
                console.log('开始解析JSON...');
                
                let messagesData;
                try {
                    messagesData = JSON.parse(fixedJson);
                } catch (parseError) {
                    console.error('JSON.parse失败:', parseError);
                    console.log('失败的JSON片段（前1000字符）:', fixedJson.substring(0, 1000));
                    console.log('失败的JSON片段（后1000字符）:', fixedJson.substring(fixedJson.length - 1000));
                    
                    // 尝试更激进的修复
                    console.log('尝试激进修复...');
                    
                    // 移除所有可能的问题字符
                    let aggressiveFixed = fixedJson
                        .replace(/\n/g, ' ')  // 移除换行
                        .replace(/\r/g, '')   // 移除回车
                        .replace(/\t/g, ' ')  // 移除制表符
                        .replace(/,(\s*[\]}])/g, '$1')  // 再次移除尾随逗号
                        .replace(/\s+/g, ' '); // 压缩多余空格
                    
                    try {
                        messagesData = JSON.parse(aggressiveFixed);
                        console.log('✅ 激进修复成功！');
                    } catch (aggressiveError) {
                        console.error('❌ 激进修复也失败:', aggressiveError);
                        throw new Error(`JSON解析失败: ${parseError.message}。请检查API返回的数据格式。`);
                    }
                }
                
                console.log('成功解析JSON');
                console.log('数据结构:', Object.keys(messagesData));
                
                // 验证数据结构
                if (!messagesData.conversations) {
                    console.error('❌ 缺少conversations字段');
                    throw new Error('API返回的数据缺少conversations字段');
                }
                
                if (!Array.isArray(messagesData.conversations)) {
                    console.error('❌ conversations不是数组');
                    throw new Error('API返回的conversations不是数组');
                }
                
                if (messagesData.conversations.length === 0) {
                    console.error('❌ conversations数组为空');
                    throw new Error('API返回的conversations数组为空');
                }
                
                console.log('✅ 数据验证通过，conversations数量:', messagesData.conversations.length);
                
                // 保存数据到localStorage
                saveMessagesData(characterInfo.convId, messagesData);
                console.log('✅ 短信数据已保存');
                
                return messagesData;
                
            } catch (e) {
                console.error('❌ 解析短信数据失败:', e);
                console.error('错误堆栈:', e.stack);
                throw new Error(`解析失败: ${e.message}`);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('API请求超时（5分钟）');
            }
            throw error;
        }
    }

    // 保存短信数据到localStorage
    function saveMessagesData(convId, data) {
        if (!convId || !data) return;
        
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const saveData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(saveData));
            console.log('短信数据已保存:', convId);
        } catch (e) {
            console.error('保存短信数据失败:', e);
        }
    }

    // 加载短信数据
    function loadMessagesData(convId) {
        if (!convId) return null;
        
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log('短信数据已加载:', convId);
                return parsed.data;
            }
        } catch (e) {
            console.error('加载短信数据失败:', e);
        }
        
        return null;
    }

    // 显示加载状态
    function showLoadingState() {
        const content = document.getElementById('messages-content');
        if (content) {
            content.innerHTML = `
                <div class="messages-loading">
                    <div class="messages-loading-spinner"></div>
                    <div class="messages-loading-text">正在生成短信数据...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    function showErrorState(message) {
        const content = document.getElementById('messages-content');
        if (content) {
            content.innerHTML = `
                <div class="messages-empty">
                    <div class="messages-empty-icon">⚠️</div>
                    <div class="messages-empty-text">生成失败</div>
                    <div class="messages-empty-hint">${message}</div>
                </div>
            `;
        }
    }

    // 渲染短信数据
    function renderMessagesData(data) {
        const content = document.getElementById('messages-content');
        if (!content) return;

        let html = '<div class="messages-list">';

        if (data.conversations && data.conversations.length > 0) {
            data.conversations.forEach(conv => {
                const unreadClass = conv.unread ? 'unread' : '';
                const categoryClass = conv.category || 'friends';
                
                html += `
                    <div class="messages-item ${unreadClass}" data-conv-id="${conv.id}">
                        <div class="messages-item-avatar ${categoryClass}">
                            ${conv.avatar || '👤'}
                        </div>
                        <div class="messages-item-content">
                            <div class="messages-item-header">
                                <div class="messages-item-name">${escapeHtml(conv.name)}</div>
                                <div class="messages-item-time">${escapeHtml(conv.time)}</div>
                            </div>
                            <div class="messages-item-preview">${escapeHtml(conv.lastMessage)}</div>
                        </div>
                        ${conv.unread ? '<div class="messages-unread-badge">1</div>' : ''}
                    </div>
                `;
            });
        }

        html += '</div>';
        content.innerHTML = html;

        // 添加点击事件
        const messagesItems = content.querySelectorAll('.messages-item');
        messagesItems.forEach(item => {
            item.addEventListener('click', function() {
                const convId = this.getAttribute('data-conv-id');
                const conversation = data.conversations.find(c => c.id === convId);
                if (conversation) {
                    showMessagesDetail(conversation);
                }
            });
        });
    }

    // 显示短信详情
    function showMessagesDetail(conversation) {
        // 创建详情页面
        let detailPage = document.getElementById('iphone-messages-detail-page');
        if (!detailPage) {
            detailPage = document.createElement('div');
            detailPage.id = 'iphone-messages-detail-page';
            detailPage.className = 'messages-detail-page';
            document.querySelector('.iphone-screen').appendChild(detailPage);
        }

        const categoryClass = conversation.category || 'friends';
        
        // 构建短信气泡HTML
        let messagesHtml = '';
        let lastDate = '';
        
        if (conversation.messages && conversation.messages.length > 0) {
            conversation.messages.forEach((msg, index) => {
                // 检查是否需要添加时间戳分隔
                const currentDate = msg.timestamp.split(' ')[0] || '';
                if (currentDate !== lastDate && index > 0) {
                    messagesHtml += `
                        <div class="messages-timestamp">
                            <span class="messages-timestamp-text">${formatDateLabel(msg.timestamp)}</span>
                        </div>
                    `;
                    lastDate = currentDate;
                } else if (index === 0) {
                    messagesHtml += `
                        <div class="messages-timestamp">
                            <span class="messages-timestamp-text">${formatDateLabel(msg.timestamp)}</span>
                        </div>
                    `;
                    lastDate = currentDate;
                }
                
                const sentClass = msg.sent ? 'sent' : 'received';
                const statusHtml = msg.sent ? `
                    <div class="messages-bubble-status">
                        <span class="messages-bubble-${msg.status || 'delivered'}">${msg.status === 'read' ? '已读' : '已送达'}</span>
                    </div>
                ` : '';
                
                messagesHtml += `
                    <div class="messages-bubble-row ${sentClass}">
                        <div class="messages-bubble ${sentClass}">
                            <div class="messages-bubble-text">${escapeHtml(msg.text)}</div>
                        </div>
                        ${statusHtml}
                    </div>
                `;
            });
        }

        detailPage.innerHTML = `
            <div class="messages-detail-header">
                <div class="messages-detail-top">
                    <button class="messages-detail-back-btn" id="messages-detail-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        返回
                    </button>
                    <div class="messages-detail-contact">
                        <div class="messages-detail-avatar ${categoryClass}">
                            ${conversation.avatar || '👤'}
                        </div>
                        <div class="messages-detail-name">${escapeHtml(conversation.name)}</div>
                    </div>
                </div>
            </div>
            <div class="messages-detail-content" id="messages-detail-content">
                ${messagesHtml}
            </div>
            <div class="messages-input-area">
                <input type="text" class="messages-input-field" placeholder="iMessage" readonly>
                <button class="messages-send-btn">
                    <svg viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        `;

        detailPage.classList.add('show');

        // 滚动到底部
        setTimeout(() => {
            const contentDiv = document.getElementById('messages-detail-content');
            if (contentDiv) {
                contentDiv.scrollTop = contentDiv.scrollHeight;
            }
        }, 100);

        // 添加返回按钮事件
        const backBtn = detailPage.querySelector('#messages-detail-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                detailPage.classList.remove('show');
            });
        }
    }

    // 格式化日期标签
    function formatDateLabel(timestamp) {
        const today = new Date();
        const dateStr = timestamp.split(' ')[0];
        
        if (dateStr === '今天') {
            return timestamp;
        } else if (dateStr === '昨天') {
            return '昨天';
        }
        
        return timestamp;
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
    window.iPhoneMessages = {
        show: showMessagesPage,
        hide: hideMessagesPage,
        generate: generateMessagesData
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ iPhone短信模块已加载');
        });
    } else {
        console.log('✅ iPhone短信模块已加载');
    }

})();