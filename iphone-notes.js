/**
 * iPhone 备忘录应用
 * 调用主API生成角色相关的备忘录
 */

(function() {
    'use strict';

    let currentNotes = [];
    let currentCharacter = null;
    let activeConvId = null;
    const STORAGE_KEY_PREFIX = 'iphoneNotesData_';

    // 创建备忘录页面HTML
    function createNotesPage() {
        const notesHTML = `
            <div class="iphone-notes-page" id="iphone-notes-page">
                <div class="notes-header">
                    <button class="notes-back-btn" id="notes-back-btn">
                        <i class="fa fa-arrow-left"></i>
                    </button>
                    <div class="notes-title">备忘录</div>
                    <button class="notes-generate-btn" id="notes-generate-btn">生成</button>
                </div>
                
                <div class="notes-content" id="notes-content">
                    <div class="notes-empty">
                        <div class="notes-empty-icon">📝</div>
                        <div class="notes-empty-text">暂无备忘录</div>
                        <div class="notes-empty-hint">点击右上角"生成"按钮创建备忘录</div>
                    </div>
                </div>
            </div>
            
            <div class="note-detail-page" id="note-detail-page">
                <div class="note-detail-header">
                    <button class="note-detail-back-btn" id="note-detail-back-btn">
                        <i class="fa fa-arrow-left"></i>
                    </button>
                </div>
                <div class="note-detail-content" id="note-detail-content"></div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', notesHTML);
            initializeNotesEvents();
        }
    }

    // 初始化事件
    function initializeNotesEvents() {
        // 返回按钮
        const backBtn = document.getElementById('notes-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideNotes);
        }

        // 生成按钮
        const generateBtn = document.getElementById('notes-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateNotes);
        }

        // 详情页返回按钮
        const detailBackBtn = document.getElementById('note-detail-back-btn');
        if (detailBackBtn) {
            detailBackBtn.addEventListener('click', hideNoteDetail);
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
        return messages.slice(-50); // 最近50条
    }

    // 生成备忘录
    async function generateNotes() {
        const generateBtn = document.getElementById('notes-generate-btn');
        const content = document.getElementById('notes-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        // 显示加载状态
        content.innerHTML = `
            <div class="notes-loading">
                <div class="notes-loading-spinner"></div>
                <div class="notes-loading-text">正在生成备忘录...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            activeConvId = currentCharacter?.id || null;
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
                messagesText = '\n最近聊天记录（最近50条）：\n' +
                    recentMessages.slice(-20).map(m => {
                        const isUserMessage = m.role === 'user' || m.type === 'sent' || m.sender === 'sent';
                        const role = isUserMessage ? currentCharacter.userName : currentCharacter.name;
                        return `${role}: ${m.content}`;
                    }).join('\n');
            }
            
            // 获取真实的现在时间和日期
            const nowDate = new Date();
            const year = nowDate.getFullYear();
            const month = String(nowDate.getMonth() + 1).padStart(2, '0');
            const date = String(nowDate.getDate()).padStart(2, '0');
            const hours = String(nowDate.getHours()).padStart(2, '0');
            const minutes = String(nowDate.getMinutes()).padStart(2, '0');
            const seconds = String(nowDate.getSeconds()).padStart(2, '0');
            
            // 获取星期几
            const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const weekDay = weekDays[nowDate.getDay()];
            
            const currentDateTime = `${year}年${month}月${date}日 ${hours}:${minutes}:${seconds} ${weekDay}`;
            
            console.log('当前时间:', currentDateTime);
            
            // 构建提示词 - 要求返回纯JSON，包含标题和内容
            const prompt = `你是${currentCharacter.name}，这是你的手机备忘录。请生成8条真实的备忘录，每条需包含标题和详细内容。

【当前时间】${currentDateTime}

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 可以为与${currentCharacter.userName}相关的备忘录或者日常生活相关（需结合世界观和现实）
2. 每条标题简短（8-20字）
3. 每条内容详细真实，有活人感（300-800字）
4. 语言风格：纯口语化，使用生活常用词汇，禁用书面化表达（如购置→买、前往→去）；可自然添加少量语气词（啊、啦、哦、呢）与emoij
5. 句式排版：短句为主，断句贴合口语停顿，多换行，多段落；标点仅用逗号、句号、顿号，禁用分号、冒号、括号嵌套等；清单类仅用「数字+顿号+短句」格式，无复杂层级。
6. 模糊信息标注「大概/待确认/可能」，口误/修正类表述直接复刻原句修正过程，不优化通顺度。
7. 细节补充：重要/紧急事项可添加一些提醒符号，单条记录可附带1句简短真人式提醒（如“别迟到/别忘带”）；未提及的个人偏好，不随意补充。
8. 场景化执行指令【按输入内容匹配】。场景1：多件碎片化事项（如“明天去银行，取快递，下午约朋友”）。执行：按时间/场景简单整合排序，短句连写/分行，禁用正式分类，保留口语随意感。示例：输入“明天去银行，还要取快递，下午约了朋友”→输出“明天：去银行、取快递，下午约朋友”。场景2：含口误/修正的表述（如“下午去书店？不对，取快递，改晚上”）。执行：完全复刻修正过程，保留口语化疑问/修正语气，不优化语句通顺度。示例：输入“下午去书店？不对，下午要取快递，改晚上去”→输出“下午去书店？不，取快递，书店改晚上”。场景3：模糊信息表述（如“下周和小张看电影，大概周六”）。执行：核心信息保留，模糊部分标注「大概/待确认」，不强行补全未知信息。示例：输入“下周和小张看电影，大概周六”→输出“下周（大概周六）和小张看电影”。场景4：重要/紧急事项（如“周五9点开会，必须到，带笔记本”）。执行：标注「⚠️/📍」提醒符号，明确核心要求，附带1句简短真人式提醒。示例：输入“周五9点开会，必须到，带笔记本”→输出“⚠️周五9点开会，必须到，带笔记本（别忘带！）”。场景5：明确要求列清单（如“买水果、牛奶、牙膏，水果要苹果香蕉”）。执行：仅用「数字+顿号+短句」格式，同类项合并，非必要项标注「可选」。示例：输入“买水果、牛奶、面包，还有牙膏，水果要苹果和香蕉”→输出“购物清单：1、水果（苹果、香蕉）2、牛奶3、面包4、牙膏”
9. 注意上述风格只供参考！具体输出仍需要针对角色设定来思考如何灵活地输出内容！所有内容绝对禁止脱离角色设定！
10. 必须生成8条，不能少

直接返回JSON数组，不要任何说明文字或markdown标记：
[{"title":"标题1","content":"详细内容1"},{"title":"标题2","content":"详细内容2"},...]`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            const notesData = parseNotesResponse(response);
            
            // 生成模拟的时间分布（最近3天内）
            const nowTimestamp = Date.now();
            const timeOffsets = [
                // 1-2条刚创建（0-30分钟前）
                ...Array.from({length: 2}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                // 2-3条今天创建（1-12小时前）
                ...Array.from({length: 3}, () => 60 * 60 * 1000 + Math.floor(Math.random() * 11 * 60 * 60 * 1000)),
                // 2条昨天创建（24-36小时前）
                ...Array.from({length: 2}, () => 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000)),
                // 1条前天创建（48-60小时前）
                ...Array.from({length: 1}, () => 48 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000))
            ];
            
            // 打乱时间偏移顺序
            timeOffsets.sort(() => Math.random() - 0.5);
            
            currentNotes = notesData.map((note, index) => {
                const noteTime = new Date(nowTimestamp - timeOffsets[index]);
                // 生成预览文本（取内容前50字）
                const preview = note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : '点击查看详情';
                return {
                    id: Date.now() + index,
                    title: note.title,
                    preview: preview,
                    time: formatTime(noteTime),
                    timestamp: noteTime.getTime(),
                    content: note.content || null
                };
            });
            
            // 按时间排序（最新的在前）
            currentNotes.sort((a, b) => b.timestamp - a.timestamp);
            
            // 保存到localStorage
            saveNotesToStorage(activeConvId);
            
            // 渲染备忘录列表
            renderNotesList();
            
        } catch (error) {
            console.error('生成备忘录失败:', error);
            content.innerHTML = `
                <div class="notes-empty">
                    <div class="notes-empty-icon">⚠️</div>
                    <div class="notes-empty-text">生成失败</div>
                    <div class="notes-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    }
    
    // 保存备忘录到localStorage
    function saveNotesToStorage(convId) {
        if (!convId) {
            console.warn('⚠️ 未找到对话ID，跳过备忘录保存');
            return;
        }

        try {
            localStorage.setItem(STORAGE_KEY_PREFIX + convId, JSON.stringify({
                notes: currentNotes,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存备忘录失败:', e);
        }
    }
    
    // 从localStorage加载备忘录
    function loadNotesFromStorage(convId) {
        if (!convId) return false;

        try {
            const saved = localStorage.getItem(STORAGE_KEY_PREFIX + convId);
            if (saved) {
                const data = JSON.parse(saved);
                currentNotes = data.notes || [];
                currentCharacter = data.character || currentCharacter;
                return true;
            }
        } catch (e) {
            console.error('加载备忘录失败:', e);
        }
        return false;
    }

    // 验证请求体（与main-api-manager保持一致）
    function validateRequestBody(body) {
        if (!body) {
            console.error('❌ 备忘录API请求体为空');
            return false;
        }
        
        if (!body.model || typeof body.model !== 'string') {
            console.error('❌ 无效的 model 参数:', body.model);
            return false;
        }
        
        if (!Array.isArray(body.messages)) {
            console.error('❌ messages 必须是数组');
            return false;
        }
        
        if (body.messages.length === 0) {
            console.error('❌ messages 数组为空');
            return false;
        }
        
        // 验证每条消息
        for (let i = 0; i < body.messages.length; i++) {
            const msg = body.messages[i];
            
            if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
                console.error(`❌ 消息 ${i} 角色无效:`, msg.role);
                return false;
            }
            
            if (msg.content === undefined || msg.content === null) {
                console.error(`❌ 消息 ${i} content 为空`);
                return false;
            }
        }
        
        return true;
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

    // 解析备忘录响应
    function parseNotesResponse(response) {
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
                        // 验证每个项目都有title和content字段
                        const validNotes = parsed.filter(item =>
                            item.title && typeof item.title === 'string' &&
                            item.content && typeof item.content === 'string'
                        );
                        console.log('有效的备忘录数:', validNotes.length);
                        
                        if (validNotes.length > 0) {
                            return validNotes;
                        }
                    }
                } catch (jsonError) {
                    console.log('JSON解析失败，尝试其他方法:', jsonError);
                }
            }
            
            // 如果JSON解析失败，尝试提取所有"title"和"content"字段
            const titleMatches = cleanedResponse.match(/"title"\s*:\s*"([^"]+)"/g);
            const contentMatches = cleanedResponse.match(/"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"(?=\s*[,\}])/g);
            console.log('找到title匹配数:', titleMatches ? titleMatches.length : 0);
            console.log('找到content匹配数:', contentMatches ? contentMatches.length : 0);
            
            if (titleMatches && titleMatches.length > 0) {
                const titles = titleMatches.map(match => {
                    const titleMatch = match.match(/"title"\s*:\s*"([^"]+)"/);
                    return titleMatch ? titleMatch[1] : '';
                }).filter(title => title.trim());
                
                let contents = [];
                if (contentMatches && contentMatches.length > 0) {
                    contents = contentMatches.map(match => {
                        const contentMatch = match.match(/"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                        if (contentMatch) {
                            // 处理转义字符
                            return contentMatch[1]
                                .replace(/\\n/g, '\n')
                                .replace(/\\t/g, '\t')
                                .replace(/\\"/g, '"')
                                .replace(/\\\\/g, '\\');
                        }
                        return '';
                    }).filter(content => content.trim());
                }
                
                console.log('提取的标题数:', titles.length);
                console.log('提取的内容数:', contents.length);
                
                if (titles.length > 0) {
                    return titles.slice(0, 8).map((title, index) => ({
                        title: title,
                        content: contents[index] || `关于"${title}"的备忘录内容。`
                    }));
                }
            }
            
            // 如果还是没有，尝试按行解析（每行一个标题）
            const lines = cleanedResponse
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && line.length < 200) // 过滤空行和过长的行
                .filter(line => !line.match(/^[\d\.\-\*]+$/)) // 过滤只有数字/符号的空行
                .slice(0, 8);
            
            console.log('按行解析的行数:', lines.length);
                
            if (lines.length > 0) {
                const parsed = lines.map(line => {
                    const cleanedLine = line
                        .replace(/^\d+[\.\、]\s*/, '')
                        .replace(/^[-*]\s*/, '')
                        .replace(/^["'`]|["'`]$/g, '')
                        .trim();
                    return {
                        title: cleanedLine,
                        content: `关于"${cleanedLine}"的备忘录内容。`
                    };
                });
                console.log('按行解析的结果:', parsed);
                return parsed;
            }
            
            // 如果都没有，返回默认备忘录
            console.log('使用默认备忘录');
            return Array.from({length: 8}, (_, i) => ({
                title: `备忘录 ${i + 1}`,
                content: `这是第${i + 1}条备忘录的默认内容。`
            }));
            
        } catch (error) {
            console.error('解析响应失败:', error);
            // 返回默认备忘录
            return Array.from({length: 8}, (_, i) => ({
                title: `备忘录 ${i + 1}`,
                content: `这是第${i + 1}条备忘录的默认内容。`
            }));
        }
    }

    // 渲染备忘录列表
    function renderNotesList() {
        const content = document.getElementById('notes-content');
        if (!content) return;
        
        if (currentNotes.length === 0) {
            content.innerHTML = `
                <div class="notes-empty">
                    <div class="notes-empty-icon">📝</div>
                    <div class="notes-empty-text">暂无备忘录</div>
                    <div class="notes-empty-hint">点击右上角"生成"按钮创建备忘录</div>
                </div>
            `;
            return;
        }
        
        const notesHTML = currentNotes.map(note => `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-item-header">
                    <div class="note-item-title">${note.title}</div>
                    <div class="note-item-time">${note.time}</div>
                </div>
                <div class="note-item-preview">${note.preview}</div>
            </div>
        `).join('');
        
        content.innerHTML = `<div class="notes-list">${notesHTML}</div>`;
        
        // 绑定点击事件
        content.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = parseInt(item.dataset.noteId);
                openNoteDetail(noteId);
            });
        });
    }

    // 打开备忘录详情（直接显示已生成的内容）
    function openNoteDetail(noteId) {
        const note = currentNotes.find(n => n.id === noteId);
        if (!note) return;
        
        const detailPage = document.getElementById('note-detail-page');
        const detailContent = document.getElementById('note-detail-content');
        
        if (!detailPage || !detailContent) return;
        
        // 显示详情页
        detailPage.classList.add('show');
        
        // 直接显示已生成的内容
        if (note.content) {
            renderNoteDetail(note);
        } else {
            // 如果没有内容（不应该发生），显示错误
            detailContent.innerHTML = `
                <div class="notes-empty">
                    <div class="notes-empty-icon">⚠️</div>
                    <div class="notes-empty-text">内容加载失败</div>
                    <div class="notes-empty-hint">请返回重新生成备忘录</div>
                </div>
            `;
        }
    }

    // 渲染备忘录详情
    function renderNoteDetail(note) {
        const detailContent = document.getElementById('note-detail-content');
        if (!detailContent) return;
        
        detailContent.innerHTML = `
            <div class="note-detail-title">${note.title}</div>
            <div class="note-detail-date">${note.time}</div>
            <div class="note-detail-body">${note.content}</div>
        `;
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
        return `${month}月${day}日`;
    }

    // 显示备忘录页面
    function showNotes() {
        const notesPage = document.getElementById('iphone-notes-page');
        if (notesPage) {
            notesPage.classList.add('show');

            const character = getCurrentCharacter();
            const convId = character?.id || null;

            if (convId !== activeConvId) {
                activeConvId = convId;
                currentCharacter = character;
                currentNotes = [];
            }

            if (convId && loadNotesFromStorage(convId)) {
                renderNotesList();
            } else {
                renderNotesList();
            }
        }
    }

    // 隐藏备忘录页面
    function hideNotes() {
        const notesPage = document.getElementById('iphone-notes-page');
        if (notesPage) {
            notesPage.classList.remove('show');
        }
    }

    // 隐藏详情页
    function hideNoteDetail() {
        const detailPage = document.getElementById('note-detail-page');
        if (detailPage) {
            detailPage.classList.remove('show');
        }
    }

    // 初始化
    function init() {
        // 等待iPhone模拟器加载完成
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createNotesPage();
                
                // 绑定备忘录按钮点击事件
                setTimeout(() => {
                    const appIcons = document.querySelectorAll('.app-icon');
                    if (appIcons[0]) { // 第一个是备忘录
                        appIcons[0].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showNotes();
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
    window.iPhoneNotes = {
        show: showNotes,
        hide: hideNotes
    };

})();
