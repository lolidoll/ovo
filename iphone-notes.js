/**
 * iPhone 备忘录应用
 * 调用主API生成角色相关的备忘录
 */

(function() {
    'use strict';

    let currentNotes = [];
    let currentCharacter = null;

    // 创建备忘录页面HTML
    function createNotesPage() {
        const notesHTML = `
            <div class="iphone-notes-page" id="iphone-notes-page">
                <div class="notes-header">
                    <button class="notes-back-btn" id="notes-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        备忘录
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
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        备忘录
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
        const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
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
            const prompt = `你是${currentCharacter.name}，请生成15条真实的备忘录标题。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 与${currentCharacter.userName}相关的备忘录（约5-7条）
2. 日常生活相关（约5-7条）
3. 结合世界观和现实（约3-4条）
4. 每条标题简短（8-20字）
5. 要有真实感和活人感
6. 必须生成15条，不能少

直接返回JSON数组，不要任何说明文字或markdown标记：
[{"title":"标题1"},{"title":"标题2"},...]`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            const notesData = parseNotesResponse(response);
            
            // 生成模拟的时间分布（最近3天内）
            const now = Date.now();
            const timeOffsets = [
                // 2-3条刚创建（0-30分钟前）
                ...Array.from({length: 2}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                ...Array.from({length: 1}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                // 3-4条今天创建（1-12小时前）
                ...Array.from({length: 4}, () => 60 * 60 * 1000 + Math.floor(Math.random() * 11 * 60 * 60 * 1000)),
                // 4-5条昨天创建（24-36小时前）
                ...Array.from({length: 5}, () => 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000)),
                // 3-4条前天创建（48-60小时前）
                ...Array.from({length: 3}, () => 48 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000))
            ];
            
            // 打乱时间偏移顺序
            timeOffsets.sort(() => Math.random() - 0.5);
            
            currentNotes = notesData.map((note, index) => {
                const noteTime = new Date(now - timeOffsets[index]);
                return {
                    id: Date.now() + index,
                    title: note.title,
                    preview: '点击查看详情',
                    time: formatTime(noteTime),
                    timestamp: noteTime.getTime(),
                    content: null
                };
            });
            
            // 按时间排序（最新的在前）
            currentNotes.sort((a, b) => b.timestamp - a.timestamp);
            
            // 保存到localStorage
            saveNotesToStorage();
            
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
    function saveNotesToStorage() {
        try {
            localStorage.setItem('iphoneNotesData', JSON.stringify({
                notes: currentNotes,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存备忘录失败:', e);
        }
    }
    
    // 从localStorage加载备忘录
    function loadNotesFromStorage() {
        try {
            const saved = localStorage.getItem('iphoneNotesData');
            if (saved) {
                const data = JSON.parse(saved);
                // 检查是否是同一角色
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    currentNotes = data.notes || [];
                    currentCharacter = data.character;
                    return true;
                }
            }
        } catch (e) {
            console.error('加载备忘录失败:', e);
        }
        return false;
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
                        // 验证每个项目都有title字段
                        const validNotes = parsed.filter(item => item.title && typeof item.title === 'string');
                        console.log('有效的备忘录数:', validNotes.length);
                        
                        if (validNotes.length > 0) {
                            return validNotes;
                        }
                    }
                } catch (jsonError) {
                    console.log('JSON解析失败，尝试其他方法:', jsonError);
                }
            }
            
            // 如果JSON解析失败，尝试提取所有"title"字段
            const titleMatches = cleanedResponse.match(/"title"\s*:\s*"([^"]+)"/g);
            console.log('找到title匹配数:', titleMatches ? titleMatches.length : 0);
            
            if (titleMatches && titleMatches.length > 0) {
                const titles = titleMatches.map(match => {
                    const titleMatch = match.match(/"title"\s*:\s*"([^"]+)"/);
                    return titleMatch ? titleMatch[1] : '';
                }).filter(title => title.trim());
                
                console.log('提取的标题数:', titles.length);
                
                if (titles.length > 0) {
                    return titles.slice(0, 15).map(title => ({ title }));
                }
            }
            
            // 如果还是没有，尝试按行解析（每行一个标题）
            const lines = cleanedResponse
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && line.length < 100) // 过滤空行和过长的行
                .filter(line => !line.match(/^[\d\.\-\*]+$/)) // 过滤只有数字/符号的空行
                .slice(0, 15);
            
            console.log('按行解析的行数:', lines.length);
                
            if (lines.length > 0) {
                const parsed = lines.map(line => ({
                    title: line
                        .replace(/^\d+[\.\、]\s*/, '')
                        .replace(/^[-*]\s*/, '')
                        .replace(/^["'`]|["'`]$/g, '')
                        .trim()
                }));
                console.log('按行解析的结果:', parsed);
                return parsed;
            }
            
            // 如果都没有，返回默认备忘录
            console.log('使用默认备忘录');
            return Array.from({length: 15}, (_, i) => ({
                title: `备忘录 ${i + 1}`
            }));
            
        } catch (error) {
            console.error('解析响应失败:', error);
            // 返回默认备忘录
            return Array.from({length: 15}, (_, i) => ({
                title: `备忘录 ${i + 1}`
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

    // 打开备忘录详情
    async function openNoteDetail(noteId) {
        const note = currentNotes.find(n => n.id === noteId);
        if (!note) return;
        
        const detailPage = document.getElementById('note-detail-page');
        const detailContent = document.getElementById('note-detail-content');
        
        if (!detailPage || !detailContent) return;
        
        // 显示详情页
        detailPage.classList.add('show');
        
        // 如果已有内容，直接显示
        if (note.content) {
            renderNoteDetail(note);
            return;
        }
        
        // 显示加载状态
        detailContent.innerHTML = `
            <div class="note-detail-loading">
                <div class="notes-loading-spinner"></div>
                <div class="notes-loading-text">正在加载详情...</div>
            </div>
        `;
        
        try {
            // 生成详细内容
            const prompt = `你是${currentCharacter.name}，这是你手机备忘录中的一条记录，标题是："${note.title}"。

请根据以下信息，生成这条备忘录的详细内容（300-500字）：

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${JSON.stringify(currentCharacter.card)}` : ''}

要求：
1. 内容要真实自然，符合角色性格
2. 可以包含具体的时间、地点、人物、事件
3. 要有情感和细节
4. 300-500字左右
5. 直接输出正文内容，不要重复标题，不要说"这是备忘录"之类的话`;

            const response = await callMainAPI(prompt);
            // 清理可能的标题重复
            let content = response.trim();
            content = content.replace(new RegExp(`^${note.title}\\s*`, 'i'), '');
            content = content.replace(/^【备忘录】\s*/, '');
            content = content.replace(/^备忘录[:：]\s*/, '');
            note.content = content;
            
            // 渲染详情
            renderNoteDetail(note);
            
        } catch (error) {
            console.error('加载详情失败:', error);
            detailContent.innerHTML = `
                <div class="notes-empty">
                    <div class="notes-empty-icon">⚠️</div>
                    <div class="notes-empty-text">加载失败</div>
                    <div class="notes-empty-hint">${error.message || '请稍后重试'}</div>
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
            
            // 尝试加载已保存的备忘录
            if (currentNotes.length === 0) {
                if (loadNotesFromStorage()) {
                    renderNotesList();
                }
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