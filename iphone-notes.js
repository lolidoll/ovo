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

    // 获取当前角色信息
    function getCurrentCharacter() {
        // 从主应用获取当前角色信息
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
            
            // 构建提示词
            const prompt = `你是${currentCharacter.name}，这是你的手机备忘录。请根据以下信息生成15条真实的备忘录标题：

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${JSON.stringify(currentCharacter.card)}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}

最近对话：
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

要求：
1. 生成15条备忘录标题
2. 一部分与用户相关（约5-7条）
3. 一部分是角色日常生活相关（约5-7条）
4. 一部分结合角色世界观和现实（约3-4条）
5. 要有真实感和活人感
6. 每条标题简短（10-30字）

请以JSON数组格式返回，格式：[{"title": "标题1"}, {"title": "标题2"}, ...]`;

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            const notesData = parseNotesResponse(response);
            currentNotes = notesData.map((note, index) => ({
                id: Date.now() + index,
                title: note.title,
                preview: '点击查看详情',
                time: formatTime(new Date()),
                content: null
            }));
            
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

    // 调用主API
    async function callMainAPI(prompt) {
        // 从AppState获取API配置
        let apiConfig = {};
        
        // 尝试从window.AppState获取
        if (window.AppState && window.AppState.apiSettings) {
            apiConfig = {
                url: window.AppState.apiSettings.endpoint || '',
                key: window.AppState.apiSettings.apiKey || '',
                model: window.AppState.apiSettings.selectedModel || 'gpt-3.5-turbo'
            };
        } else {
            // 从localStorage的shupianjAppState中获取
            try {
                const savedState = localStorage.getItem('shupianjAppState');
                if (savedState) {
                    const state = JSON.parse(savedState);
                    if (state.apiSettings) {
                        apiConfig = {
                            url: state.apiSettings.endpoint || '',
                            key: state.apiSettings.apiKey || '',
                            model: state.apiSettings.selectedModel || 'gpt-3.5-turbo'
                        };
                    }
                }
            } catch (e) {
                console.error('读取API配置失败:', e);
            }
        }
        
        const apiUrl = apiConfig.url || '';
        const apiKey = apiConfig.key || '';
        const model = apiConfig.model || 'gpt-3.5-turbo';
        
        if (!apiUrl || !apiKey) {
            throw new Error('请先在设置中配置API信息');
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
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // 解析备忘录响应
    function parseNotesResponse(response) {
        try {
            // 尝试直接解析JSON
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // 如果不是JSON，尝试按行解析
            const lines = response.split('\n').filter(line => line.trim());
            return lines.slice(0, 15).map(line => ({
                title: line.replace(/^\d+[\.\、]\s*/, '').replace(/^[-*]\s*/, '').trim()
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
            const prompt = `你是${currentCharacter.name}，这是你手机备忘录中的一条记录："${note.title}"。

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
5. 直接输出内容，不要额外说明`;

            const response = await callMainAPI(prompt);
            note.content = response.trim();
            
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