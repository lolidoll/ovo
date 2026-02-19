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
                        <i class="fa fa-arrow-left"></i>
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

        // 尝试加载已保存的数据
        const characterInfo = getCurrentCharacterInfo();
        if (characterInfo) {
            const savedData = loadPhoneData(characterInfo.convId);
            if (savedData) {
                currentPhoneData = savedData;
                currentCharacter = characterInfo;
                renderPhoneData(savedData);
            }
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
                
                // 保存到localStorage
                savePhoneData(characterInfo.convId, phoneData);
                
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

    // 保存电话数据到localStorage
    function savePhoneData(convId, data) {
        if (!convId || !data) return;
        
        try {
            const storageKey = 'phone_data_' + convId;
            const saveData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(saveData));
            console.log('电话数据已保存:', convId);
        } catch (e) {
            console.error('保存电话数据失败:', e);
        }
    }

    // 加载电话数据从localStorage
    function loadPhoneData(convId) {
        if (!convId) return null;
        
        try {
            const storageKey = 'phone_data_' + convId;
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log('电话数据已加载:', convId);
                return parsed.data;
            }
        } catch (e) {
            console.error('加载电话数据失败:', e);
        }
        
        return null;
    }

    // 获取当前角色信息
    function getCurrentCharacterInfo() {
        // 从全局AppState获取当前聊天角色
        if (!window.AppState || !window.AppState.currentChat) {
            console.error('未找到当前聊天角色');
            return null;
        }

        const currentChat = window.AppState.currentChat;
        const convId = currentChat.id;
        
        // 从conversations数组中获取完整的角色信息
        const conversation = window.AppState.conversations.find(c => c.id === convId);
        if (!conversation) {
            console.error('未找到对话信息:', convId);
            return null;
        }
        
        // 获取角色名称和设定
        const characterName = conversation.name || '角色';
        const characterAvatar = conversation.avatar || '';
        const characterSetting = conversation.characterCard || '';
        
        // 获取用户人设 - 优先使用角色专属的用户人设
        let userName = conversation.userNameForChar || window.AppState.user?.name || '用户';
        let userPersonality = conversation.userPersonality || '';
        
        // 如果有用户人设管理器，尝试获取当前角色的用户人设
        if (window.UserPersonaManager) {
            try {
                const currentPersona = window.UserPersonaManager.getPersonaForConversation(convId);
                if (currentPersona) {
                    userName = currentPersona.userName || userName;
                    userPersonality = currentPersona.personality || userPersonality;
                }
            } catch (e) {
                console.error('获取用户人设失败:', e);
            }
        }
        
        // 获取历史总结 - 从角色设置页面绑定的总结
        const summaries = conversation.summaries || [];
        const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1].content : '';
        
        // 获取最近50条对话
        const messages = window.AppState.messages[convId] || [];
        const recentMessages = messages.slice(-50);
        
        console.log('===== 电话App - 角色信息 =====');
        console.log('角色ID:', convId);
        console.log('角色名称:', characterName);
        console.log('角色设定:', characterSetting ? '已设置' : '未设置');
        console.log('用户名称:', userName);
        console.log('用户设定:', userPersonality ? '已设置' : '未设置');
        console.log('历史总结:', latestSummary ? `共${summaries.length}条` : '无');
        console.log('最新消息数:', recentMessages.length);
        console.log('==============================');
        
        return {
            convId,
            characterName,
            characterAvatar,
            characterSetting,
            userName,
            userPersonality,
            summaries,
            latestSummary,
            recentMessages,
            conversation
        };
    }

    // 调用主API生成电话数据
    async function callMainAPIForPhone(characterInfo) {
        // 检查API配置
        const api = window.AppState?.apiSettings;
        if (!api || !api.endpoint || !api.selectedModel) {
            throw new Error('请先在设置中配置API信息');
        }

        const apiKey = api.apiKey || '';
        if (!apiKey) {
            throw new Error('请先在设置中配置API密钥');
        }

        // 构建历史总结文本
        let summariesText = '';
        if (characterInfo.summaries && characterInfo.summaries.length > 0) {
            summariesText = '\n历史总结：\n' + characterInfo.summaries.map(s => s.content).join('\n');
        }

        // 构建最近对话文本
        let messagesText = '';
        if (characterInfo.recentMessages && characterInfo.recentMessages.length > 0) {
            messagesText = '\n最近对话（最新50条）：\n' +
                characterInfo.recentMessages.map(m => {
                    const sender = m.type === 'sent' ? characterInfo.userName : characterInfo.characterName;
                    const content = m.content || (m.emojiUrl ? '[表情包]' : '');
                    return `${sender}: ${content}`;
                }).join('\n');
        }

        // 构建提示词
        const prompt = `你是${characterInfo.characterName}，现在需要生成你的手机电话联系人记录和通话历史。

角色信息：
- 角色名：${characterInfo.characterName}
- 用户名：${characterInfo.userName}
${characterInfo.characterSetting ? `- 角色设定：${characterInfo.characterSetting}` : ''}
${characterInfo.userPersonality ? `- 用户设定：${characterInfo.userPersonality}` : ''}
${summariesText}
${messagesText}

请根据角色性格、生活状态、社交关系，以及最近的对话内容，生成真实的电话联系人和通话记录。

【重要要求】
1. 生成8-12条最近通话记录（recentCalls）
2. 每条通话记录必须包含详细的通话内容（detail字段），内容要丰富具体（30-80字）
3. 通话内容要符合角色关系和情境，比如：
   - 亲密关系：聊天内容、关心问候、约会计划等
   - 工作关系：工作汇报、项目讨论、会议安排等
   - 朋友关系：闲聊、约饭、分享生活等
4. 必须返回完整、有效的JSON格式
5. 不要在JSON中使用注释
6. 确保所有括号、引号、逗号都正确闭合

请严格按照以下JSON格式返回（不要添加任何其他文字）：
{
  "recentCalls": [
    {
      "name": "联系人姓名",
      "type": "outgoing",
      "direction": "去电",
      "date": "今天",
      "time": "09:30",
      "duration": "3分25秒",
      "avatar": "👨‍💼",
      "detail": "详细的通话内容描述，至少30字，包括谈话的主要话题和重要细节"
    },
    {
      "name": "另一个联系人",
      "type": "incoming",
      "direction": "来电",
      "date": "昨天",
      "time": "18:45",
      "duration": "12分18秒",
      "avatar": "👩",
      "detail": "另一段详细的通话内容，要真实生动，符合角色性格和关系"
    }
  ]
}`;

        // 规范化endpoint（确保包含/v1）
        const normalized = api.endpoint.replace(/\/+$/, '');
        const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        const endpoint = baseEndpoint + '/chat/completions';

        const requestBody = {
            model: api.selectedModel,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 6000
        };

        console.log('调用API生成电话数据...');
        console.log('API URL:', endpoint);
        console.log('模型:', api.selectedModel);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

        try {
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
            
            // 解析JSON
            return parsePhoneResponse(content);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('API请求超时（5分钟）');
            }
            throw error;
        }
    }

    // 解析电话数据响应
    function parsePhoneResponse(response) {
        console.log('===== 电话数据解析 =====');
        console.log('原始API响应长度:', response.length);
        console.log('原始API响应前500字符:', response.substring(0, 500));
        
        try {
            // 清理响应内容，移除markdown代码块标记
            let cleanedResponse = response
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/gi, '')
                .trim();
            
            console.log('清理后长度:', cleanedResponse.length);
            
            // 尝试提取JSON对象 - 使用更宽松的正则
            let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/s);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];
                console.log('找到JSON对象，长度:', jsonStr.length);
                
                // 检查JSON是否完整（最后一个字符应该是}）
                if (!jsonStr.trim().endsWith('}')) {
                    console.warn('JSON可能不完整，尝试修复...');
                    // 尝试找到最后一个完整的对象或数组
                    const lastBrace = jsonStr.lastIndexOf('}');
                    if (lastBrace > 0) {
                        jsonStr = jsonStr.substring(0, lastBrace + 1);
                        console.log('修复后的JSON长度:', jsonStr.length);
                    }
                }
                
                try {
                    // 修复常见的JSON格式问题
                    let fixedJson = jsonStr;
                    
                    // 移除数组中的尾随逗号
                    fixedJson = fixedJson.replace(/,(\s*[\]}])/g, '$1');
                    
                    // 尝试修复不完整的数组或对象
                    // 如果最后是逗号，移除它
                    fixedJson = fixedJson.replace(/,\s*$/, '');
                    
                    // 确保JSON以}结尾
                    if (!fixedJson.trim().endsWith('}')) {
                        // 计算未闭合的括号
                        const openBraces = (fixedJson.match(/\{/g) || []).length;
                        const closeBraces = (fixedJson.match(/\}/g) || []).length;
                        const openBrackets = (fixedJson.match(/\[/g) || []).length;
                        const closeBrackets = (fixedJson.match(/\]/g) || []).length;
                        
                        console.log('括号统计:', { openBraces, closeBraces, openBrackets, closeBrackets });
                        
                        // 添加缺失的闭合括号
                        for (let i = 0; i < openBrackets - closeBrackets; i++) {
                            fixedJson += ']';
                        }
                        for (let i = 0; i < openBraces - closeBraces; i++) {
                            fixedJson += '}';
                        }
                        
                        console.log('添加闭合括号后的JSON长度:', fixedJson.length);
                    }
                    
                    console.log('修复后的JSON前500字符:', fixedJson.substring(0, 500));
                    console.log('修复后的JSON后100字符:', fixedJson.substring(fixedJson.length - 100));
                    
                    let parsed = JSON.parse(fixedJson);
                    console.log('✅ 成功解析JSON');
                    console.log('recentCalls数量:', parsed.recentCalls?.length || 0);
                    
                    // 验证并补充缺失的必要字段（只需要recentCalls）
                    if (!parsed.recentCalls || !Array.isArray(parsed.recentCalls)) {
                        console.warn('缺少recentCalls字段，使用空数组');
                        parsed.recentCalls = [];
                    }
                    
                    // 不再需要contacts和stats字段，但为了兼容性保留空值
                    parsed.contacts = [];
                    parsed.stats = {
                        totalCalls: 0,
                        missedCalls: 0,
                        incomingCalls: 0,
                        outgoingCalls: 0,
                        avgDuration: '0分0秒',
                        longestCall: '0分0秒'
                    };
                    
                    return parsed;
                    
                } catch (jsonError) {
                    console.error('❌ JSON解析错误:', jsonError.message);
                    console.error('错误位置:', jsonError.message.match(/position (\d+)/)?.[1]);
                }
            } else {
                console.error('未找到JSON对象');
            }
            
            console.warn('⚠️ 解析失败，返回默认数据');
            return getDefaultPhoneData();
            
        } catch (error) {
            console.error('❌ 解析响应失败:', error);
            return getDefaultPhoneData();
        }
    }

    // 获取默认电话数据
    function getDefaultPhoneData() {
        return {
            contacts: [],
            stats: {
                totalCalls: 0,
                missedCalls: 0,
                incomingCalls: 0,
                outgoingCalls: 0,
                avgDuration: '0分0秒',
                longestCall: '0分0秒'
            },
            recentCalls: []
        };
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

    // 渲染电话数据 - 只显示最近通话
    function renderPhoneData(phoneData) {
        const content = document.getElementById('phone-content');
        if (!content) return;

        let html = '';

        // 只渲染最近通话
        if (phoneData.recentCalls && phoneData.recentCalls.length > 0) {
            html += `
                <div class="contact-section">
                    <div class="contact-section-header">最近通话</div>
            `;
            
            phoneData.recentCalls.forEach((call, index) => {
                const typeClass = call.type;
                const iconSvg = getCallIcon(call.type);
                
                html += `
                    <div class="recent-call-item" data-call-index="${index}">
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
                        <div class="call-arrow">
                            <i class="fa fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        } else {
            html = `
                <div class="phone-empty">
                    <div class="phone-empty-icon">📱</div>
                    <div class="phone-empty-text">暂无通话记录</div>
                    <div class="phone-empty-hint">点击右上角"生成"按钮<br>创建角色的通话记录</div>
                </div>
            `;
        }

        content.innerHTML = html;
        
        // 添加点击事件监听
        attachCallItemListeners(phoneData);
    }

    // 添加通话记录点击事件
    function attachCallItemListeners(phoneData) {
        const callItems = document.querySelectorAll('.recent-call-item');
        callItems.forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-call-index'));
                const call = phoneData.recentCalls[index];
                if (call) {
                    showCallDetail(call);
                }
            });
        });
    }

    // 显示通话详情弹窗
    function showCallDetail(call) {
        // 使用Picsum Photos真实照片库生成头像
        const name = call.name || '用户';
        // 根据名字生成一个稳定的随机ID (1-1000)
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash;
        }
        const photoId = Math.abs(hash % 1000) + 1;
        
        // 使用Picsum Photos API获取真实照片
        const avatarUrl = `https://picsum.photos/id/${photoId}/200/200`;
        
        // 创建详情弹窗
        const detailHTML = `
            <div class="call-detail-modal" id="call-detail-modal">
                <div class="call-detail-overlay"></div>
                <div class="call-detail-content">
                    <div class="call-detail-header">
                        <h3>通话详情</h3>
                        <button class="call-detail-close" id="call-detail-close">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                    <div class="call-detail-body">
                        <div class="call-detail-avatar">
                            <img src="${avatarUrl}" alt="${call.name || '头像'}" onerror="this.style.display='none'; this.parentElement.innerHTML='📱';">
                        </div>
                        <div class="call-detail-name">${call.name || '未知号码'}</div>
                        <div class="call-detail-info-grid">
                            <div class="call-detail-info-item">
                                <div class="call-detail-info-label">通话类型</div>
                                <div class="call-detail-info-value ${call.type}">${call.direction || '未知'}</div>
                            </div>
                            <div class="call-detail-info-item">
                                <div class="call-detail-info-label">通话时长</div>
                                <div class="call-detail-info-value">${call.duration || '未知'}</div>
                            </div>
                            <div class="call-detail-info-item">
                                <div class="call-detail-info-label">通话日期</div>
                                <div class="call-detail-info-value">${call.date || '未知'}</div>
                            </div>
                            <div class="call-detail-info-item">
                                <div class="call-detail-info-label">通话时间</div>
                                <div class="call-detail-info-value">${call.time || '未知'}</div>
                            </div>
                            ${call.detail ? `
                                <div class="call-detail-info-item full-width">
                                    <div class="call-detail-info-label">通话内容</div>
                                    <div class="call-detail-info-value">${call.detail}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', detailHTML);
        
        // 添加关闭事件
        const modal = document.getElementById('call-detail-modal');
        const closeBtn = document.getElementById('call-detail-close');
        const overlay = modal.querySelector('.call-detail-overlay');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeCallDetail());
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => closeCallDetail());
        }
        
        // 显示动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // 关闭通话详情弹窗
    function closeCallDetail() {
        const modal = document.getElementById('call-detail-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
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