/**
 * iPhone 邮件应用
 * 调用主API生成角色相关的邮件记录
 * 完全按照备忘录逻辑实现
 */

(function() {
    'use strict';

    let currentMailData = null;
    let currentCharacter = null;

    // 创建邮件页面HTML
    function createMailPage() {
        const mailHTML = `
            <div class="iphone-mail-page" id="iphone-mail-page">
                <div class="mail-header">
                    <button class="mail-back-btn" id="mail-back-btn">
                        <i class="fa fa-arrow-left"></i>
                    </button>
                    <div class="mail-title">邮箱</div>
                    <button class="mail-generate-btn" id="mail-generate-btn">生成</button>
                </div>
                
                <div class="mail-content" id="mail-content">
                    <div class="mail-empty">
                        <div class="mail-empty-icon">📧</div>
                        <div class="mail-empty-text">暂无邮件数据</div>
                        <div class="mail-empty-hint">点击右上角"生成"按钮创建角色的邮件记录</div>
                    </div>
                </div>
            </div>
             
            <div class="mail-detail-page" id="mail-detail-page">
                <div class="mail-detail-header">
                    <button class="mail-detail-back-btn" id="mail-detail-back-btn">
                        <i class="fa fa-arrow-left"></i>
                    </button>
                </div>
                <div class="mail-detail-content" id="mail-detail-content"></div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', mailHTML);
            initializeMailEvents();
        }
    }

    // 初始化事件
    function initializeMailEvents() {
        // 返回按钮
        const backBtn = document.getElementById('mail-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideMailPage);
        }

        // 生成按钮
        const generateBtn = document.getElementById('mail-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateMailData);
        }

        // 详情页返回按钮
        const detailBackBtn = document.getElementById('mail-detail-back-btn');
        if (detailBackBtn) {
            detailBackBtn.addEventListener('click', hideMailDetail);
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
        
        // 尝试加载已保存的邮件
        if (currentMailData === null) {
            if (loadMailFromStorage()) {
                renderMailList();
            }
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
    
    // 隐藏详情页
    function hideMailDetail() {
        const detailPage = document.getElementById('mail-detail-page');
        if (detailPage) {
            detailPage.classList.remove('show');
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
        const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        return messages.slice(-50); // 最近50条
    }

    // 生成邮件数据
    async function generateMailData() {
        const generateBtn = document.getElementById('mail-generate-btn');
        const content = document.getElementById('mail-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        // 显示加载状态
        content.innerHTML = `
            <div class="mail-loading">
                <div class="mail-loading-spinner"></div>
                <div class="mail-loading-text">正在生成邮件...</div>
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
            
            // 构建提示词 - 要求返回纯JSON，不要任何其他内容
            const prompt = `你是${currentCharacter.name}，这是你的手机邮箱。请生成10条真实的邮件记录。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 与${currentCharacter.userName}相关的邮件（约3-4条）
2. 工作邮件（约2-3条）
3. 生活相关（约3-4条）
4. 每条邮件包含：发件人、邮箱地址、主题、预览内容、完整正文、时间、分类（work/personal/promotion/social）
5. 要有真实感和活人感
6. 必须生成10条，不能少

直接返回JSON数组，不要任何说明文字或markdown标记：
[{
  "sender": "发件人",
  "email": "邮箱地址",
  "subject": "主题",
  "preview": "预览内容",
  "body": "完整正文",
  "time": "时间（如：今天 14:30）",
  "category": "work",
  "unread": true,
  "icon": "📧"
}]`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            const mailData = parseMailResponse(response);
            
            // 生成模拟的时间分布（最近3天内）
            const now = Date.now();
            const timeOffsets = [
                // 2-3条刚创建（0-30分钟前）
                ...Array.from({length: 2}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                ...Array.from({length: 1}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                // 3-4条今天创建（1-12小时前）
                ...Array.from({length: 4}, () => 60 * 60 * 1000 + Math.floor(Math.random() * 11 * 60 * 60 * 1000)),
                // 2-3条昨天创建（24-36小时前）
                ...Array.from({length: 3}, () => 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000))
            ];
            
            // 打乱时间偏移顺序
            timeOffsets.sort(() => Math.random() - 0.5);
            
            currentMailData = mailData.map((mail, index) => {
                const mailTime = new Date(now - timeOffsets[index]);
                return {
                    id: Date.now() + index,
                    sender: mail.sender,
                    email: mail.email,
                    subject: mail.subject,
                    preview: mail.preview,
                    body: mail.body,
                    time: formatTime(mailTime),
                    timestamp: mailTime.getTime(),
                    category: mail.category,
                    unread: mail.unread,
                    icon: mail.icon || '📧'
                };
            });
            
            // 按时间排序（最新的在前）
            currentMailData.sort((a, b) => b.timestamp - a.timestamp);
            
            // 保存到localStorage
            saveMailToStorage();
            
            // 渲染邮件列表
            renderMailList();
            
        } catch (error) {
            console.error('生成邮件失败:', error);
            content.innerHTML = `
                <div class="mail-empty">
                    <div class="mail-empty-icon">⚠️</div>
                    <div class="mail-empty-text">生成失败</div>
                    <div class="mail-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    }
    
    // 保存邮件到localStorage
    function saveMailToStorage() {
        try {
            localStorage.setItem('iphoneMailData', JSON.stringify({
                mails: currentMailData,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存邮件失败:', e);
        }
    }
    
    // 从localStorage加载邮件
    function loadMailFromStorage() {
        try {
            const saved = localStorage.getItem('iphoneMailData');
            if (saved) {
                const data = JSON.parse(saved);
                // 检查是否是同一角色
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    currentMailData = data.mails || [];
                    currentCharacter = data.character;
                    return true;
                }
            }
        } catch (e) {
            console.error('加载邮件失败:', e);
        }
        return false;
    }
    
    // 生成头像URL（使用Picsum Photos真实照片库）
    function getAvatarUrl(email, name) {
        // 基于邮箱地址生成一个稳定的随机数
        let hash = 0;
        const str = email || name || Math.random().toString();
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        const id = Math.abs(hash) % 1000;
        
        // 使用 Picsum Photos 提供的真实照片
        // 这是一个免费的随机照片服务，提供高质量的真实照片
        return `https://picsum.photos/150?random=${id}`;
    }
    
    // 渲染邮件列表
    function renderMailList() {
        const content = document.getElementById('mail-content');
        if (!content) return;
        
        if (currentMailData === null || currentMailData.length === 0) {
            content.innerHTML = `
                <div class="mail-empty">
                    <div class="mail-empty-icon">📧</div>
                    <div class="mail-empty-text">暂无邮件数据</div>
                    <div class="mail-empty-hint">点击右上角"生成"按钮创建角色的邮件记录</div>
                </div>
            `;
            return;
        }
        
        const mailHTML = currentMailData.map(mail => {
            const avatarUrl = getAvatarUrl(mail.email, mail.sender);
            return `
            <div class="mail-item ${mail.unread ? 'unread' : ''}" data-mail-id="${mail.id}">
                <div class="mail-item-avatar ${mail.category}">
                    <img src="${avatarUrl}" alt="${escapeHtml(mail.sender)}" class="mail-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="mail-avatar-fallback" style="display:none;">${mail.icon || '📧'}</div>
                </div>
                <div class="mail-item-content">
                    <div class="mail-item-header">
                        <div class="mail-item-sender">${escapeHtml(mail.sender)}</div>
                        <div class="mail-item-time">${escapeHtml(mail.time)}</div>
                    </div>
                    <div class="mail-item-subject">${escapeHtml(mail.subject)}</div>
                    <div class="mail-item-preview">${escapeHtml(mail.preview)}</div>
                </div>
            </div>
            `;
        }).join('');
        
        content.innerHTML = `<div class="mail-list">${mailHTML}</div>`;
        
        // 绑定点击事件
        content.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', () => {
                const mailId = parseInt(item.dataset.mailId);
                openMailDetail(mailId);
            });
        });
    }
    
    // 打开邮件详情
    function openMailDetail(mailId) {
        const mail = currentMailData.find(m => m.id === mailId);
        if (!mail) return;
        
        const detailPage = document.getElementById('mail-detail-page');
        const detailContent = document.getElementById('mail-detail-content');
        
        if (!detailPage || !detailContent) return;
        
        // 标记为已读
        mail.unread = false;
        saveMailToStorage();
        renderMailList();
        
        // 获取头像URL
        const avatarUrl = getAvatarUrl(mail.email, mail.sender);
        
        // 构建详情内容HTML
        detailContent.innerHTML = `
            <div class="mail-detail-subject">${escapeHtml(mail.subject)}</div>
            <div class="mail-detail-meta">
                <div class="mail-detail-sender-avatar ${mail.category}">
                    <img src="${avatarUrl}" alt="${escapeHtml(mail.sender)}" class="mail-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="mail-avatar-fallback" style="display:none;">${mail.icon || '📧'}</div>
                </div>
                <div class="mail-detail-sender-info">
                    <div class="mail-detail-sender-name">${escapeHtml(mail.sender)}</div>
                    <div class="mail-detail-sender-email">${escapeHtml(mail.email)}</div>
                </div>
                <div class="mail-detail-time">${escapeHtml(mail.time)}</div>
            </div>
            <div class="mail-detail-body">${escapeHtml(mail.body)}</div>
        `;
        
        detailPage.classList.add('show');
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
        
        // 规范化endpoint（确保包含/v1）
        const normalized = api.endpoint.replace(/\/+$/, '');
        const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        const endpoint = baseEndpoint + '/chat/completions';
        
        const body = {
            model: api.selectedModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 10000
        };
        
        // 验证请求体
        if (!validateRequestBody(body)) {
            throw new Error('请求参数验证失败');
        }
        
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
                let errorDetails = '';
                try {
                    const errorData = await response.text();
                    if (errorData) {
                        try {
                            const errorJson = JSON.parse(errorData);
                            if (errorJson.error) {
                                errorDetails = typeof errorJson.error === 'string'
                                    ? errorJson.error
                                    : (errorJson.error.message || JSON.stringify(errorJson.error));
                            }
                        } catch (e) {
                            errorDetails = errorData.substring(0, 200);
                        }
                    }
                } catch (e) {
                    console.error('无法读取错误响应:', e);
                }
                throw new Error(`API请求失败: ${response.status} ${response.statusText}${errorDetails ? '\n' + errorDetails : ''}`);
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

    // 解析邮件响应
    function parseMailResponse(response) {
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
            
            // 尝试直接解析JSON（处理完整或部分JSON）
            let jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    console.log('找到JSON数组，长度:', jsonStr.length);
                    
                    // 修复可能的JSON格式问题
                    const fixedJson = jsonStr
                        .replace(/,\s*\]/g, ']')  // 移除尾随逗号
                        .replace(/,\s*}/g, '}');   // 移除尾随逗号
                    
                    const parsed = JSON.parse(fixedJson);
                    console.log('解析的JSON数组，项目数:', parsed.length);
                    
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // 验证每个项目都有必需字段
                        const validMails = parsed.filter(item =>
                            item.sender && typeof item.sender === 'string' &&
                            item.subject && typeof item.subject === 'string'
                        );
                        console.log('有效的邮件数:', validMails.length);
                        
                        if (validMails.length > 0) {
                            return validMails;
                        }
                    }
                } catch (jsonError) {
                    console.log('JSON解析失败，尝试其他方法:', jsonError);
                }
            }
            
            // 如果JSON解析失败，返回默认邮件
            console.log('使用默认邮件');
            return Array.from({length: 10}, (_, i) => ({
                sender: `发件人${i + 1}`,
                email: `sender${i + 1}@example.com`,
                subject: `邮件主题 ${i + 1}`,
                preview: `这是邮件${i + 1}的预览内容`,
                body: `这是邮件${i + 1}的完整正文内容`,
                time: '今天',
                category: ['work', 'personal', 'promotion', 'social'][i % 4],
                unread: i < 3,
                icon: ['💼', '📧', '🎬', '🎉'][i % 4]
            }));
            
        } catch (error) {
            console.error('解析响应失败:', error);
            // 返回默认邮件
            return Array.from({length: 10}, (_, i) => ({
                sender: `发件人${i + 1}`,
                email: `sender${i + 1}@example.com`,
                subject: `邮件主题 ${i + 1}`,
                preview: `这是邮件${i + 1}的预览内容`,
                body: `这是邮件${i + 1}的完整正文内容`,
                time: '今天',
                category: ['work', 'personal', 'promotion', 'social'][i % 4],
                unread: i < 3,
                icon: ['💼', '📧', '🎬', '🎉'][i % 4]
            }));
        }
    }

    // 格式化时间
    function formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${month}月${day}日 ${hour}:${minute}`;
    }

    // HTML转义
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    // 渲染邮件数据（旧方法，保留兼容性）
    function renderMailData(data) {
        if (data && data.emails) {
            currentMailData = data.emails.map((email, index) => ({
                id: Date.now() + index,
                sender: email.sender,
                email: email.email,
                subject: email.subject,
                preview: email.preview,
                body: email.body,
                time: email.time,
                category: email.category || 'personal',
                unread: email.unread !== false,
                icon: email.icon || '📧'
            }));
            renderMailList();
        }
    }

    // 显示邮件详情（旧方法，保留兼容性）
    function showMailDetail(email) {
        const mail = {
            id: email.id,
            sender: email.sender,
            email: email.email,
            subject: email.subject,
            preview: email.preview,
            body: email.body,
            time: email.time,
            category: email.category || 'personal',
            unread: email.unread !== false,
            icon: email.icon || '📧'
        };
        
        const detailPage = document.getElementById('mail-detail-page');
        const detailSubject = document.getElementById('mail-detail-subject');
        const detailAvatar = document.getElementById('mail-detail-avatar');
        const detailSender = document.getElementById('mail-detail-sender');
        const detailEmail = document.getElementById('mail-detail-email');
        const detailTime = document.getElementById('mail-detail-time');
        const detailContent = document.getElementById('mail-detail-content');
        
        if (!detailPage) return;
        
        detailSubject.textContent = mail.subject;
        detailAvatar.textContent = mail.icon || '📧';
        detailAvatar.className = `mail-detail-sender-avatar ${mail.category}`;
        detailSender.textContent = mail.sender;
        detailEmail.textContent = mail.email;
        detailTime.textContent = mail.time;
        detailContent.innerHTML = `<div class="mail-detail-body">${escapeHtml(mail.body)}</div>`;
        
        detailPage.classList.add('show');
    }

    // Toast提示
    function showLocalToast(message) {
        const oldToast = document.getElementById('iphone-mail-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'iphone-mail-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 72px;
            left: 50%;
            transform: translateX(-50%) translateY(24px) scale(0.92);
            opacity: 0;
            background: linear-gradient(145deg, rgba(255, 251, 254, 0.98) 0%, rgba(255, 234, 245, 0.96) 100%);
            color: #8f4b67;
            padding: 12px 22px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.2px;
            border: 1px solid rgba(255, 194, 220, 0.9);
            box-shadow: 0 10px 28px rgba(255, 154, 196, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 2147483000;
            max-width: min(82vw, 360px);
            text-align: center;
            line-height: 1.45;
            word-break: break-word;
            pointer-events: none;
            transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(24px) scale(0.92)';
            setTimeout(() => toast.remove(), 280);
        }, 2000);
    }

    function showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            showLocalToast(message);
        }
    }

    // 初始化
    function init() {
        // 等待iPhone模拟器加载完成
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createMailPage();
                console.log('✅ iPhone邮件模块已初始化');
            }
        }, 100);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 验证请求体（与main-api-manager保持一致）
    function validateRequestBody(body) {
        if (!body || !body.model || !Array.isArray(body.messages)) {
            console.error('❌ 邮件API请求体验证失败');
            return false;
        }
        
        if (body.messages.length === 0) {
            console.error('❌ messages数组为空');
            return false;
        }
        
        for (let i = 0; i < body.messages.length; i++) {
            const msg = body.messages[i];
            if (!msg.role || !msg.content) {
                console.error(`❌ 消息 ${i} 缺少role或content`);
                return false;
            }
            if (typeof msg.content === 'string' && msg.content.trim().length === 0) {
                console.error(`❌ 消息 ${i} content为空字符串`);
                return false;
            }
        }
        
        if (body.temperature !== undefined && (body.temperature < 0 || body.temperature > 2)) {
            console.error('❌ temperature参数超出范围');
            return false;
        }
        
        console.log('✅ 邮件API请求体验证通过');
        return true;
    }

    // 导出函数
    window.iPhoneMail = {
        show: showMailPage,
        hide: hideMailPage,
        generate: generateMailData
    };

})();
