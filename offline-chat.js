/**
 * 线下功能模块 - SillyTavern风格 (增强版)
 * 新增功能: 消息分支、导出导入、Token统计、自动重试、右键菜单等
 */
(function() {
    'use strict';

        const State = {
        isOpen: false,
        chatId: null,
        messages: {},
        streaming: null,
        abortController: null,
        autoContinue: false,
        selectedMessages: new Set(), // 多选消息
        isSelectMode: false, // 多选模式
        retryCount: 0, // 最大重试次数
        maxRetries: 3, // 最大重试次数
        theme: 'dark', // 主题: dark, light, girly
        customBackground: null, // 自定义背景图
        messageLayout: 'default' // 消息布局: default (默认), centered (居中)
    };
    
    // 加载/保存数据
    function load() {
        try {
            const d = localStorage.getItem('stOfflineData');
            if (d) {
                const data = JSON.parse(d);
                State.messages = data.messages || {};
                State.theme = data.theme || 'dark';
                State.customBackground = data.customBackground || null;
                State.messageLayout = data.messageLayout || 'default';
            }
        } catch(e) {}
    }
    
    function save() {
        try {
            localStorage.setItem('stOfflineData', JSON.stringify({
                messages: State.messages,
                theme: State.theme,
                customBackground: State.customBackground,
                messageLayout: State.messageLayout
            }));
        } catch(e) {}
    }
    
    // 打开页面
    function open() {
        const chat = window.AppState?.currentChat;
        if (!chat) { showToast('请先打开一个聊天'); return; }
        
        State.chatId = chat.id;
        if (!State.messages[State.chatId]) State.messages[State.chatId] = [];
        
        createPage();
        updateNav(chat);
        applyTheme(); // 应用主题
        applyMessageLayout(); // 应用消息布局
        render();
        
        document.getElementById('st-chat-page').classList.add('show');
        State.isOpen = true;
        scrollBottom();
    }
    
    function close() {
        document.getElementById('st-chat-page')?.classList.remove('show');
        save();
        State.isOpen = false;
        State.isSelectMode = false;
        State.selectedMessages.clear();
        State.chatId = null;
        const contextBar = document.getElementById('st-context-bar');
        if (contextBar) contextBar.style.display = 'none';
    }

    // 重试最后一条消息（AI消息=重新生成，用户消息=生成AI回复）
    function retryLast() {
        if (State.streaming) return;
        const msgs = State.messages[State.chatId];
        if (!msgs?.length) {
            showToast('没有消息可重试');
            return;
        }

        const lastMsg = msgs[msgs.length - 1];

        // 最后一条是用户消息：直接生成AI回复
        if (lastMsg.role === 'user') {
            save();
            callAI();
            return;
        }

        // 最后一条是AI消息：重新生成（swipe）
        let lastAiIdx = msgs.length - 1;
        if (lastMsg.role !== 'char') {
            // 向前找最后一条AI消息
            lastAiIdx = -1;
            for (let i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i].role === 'char') {
                    lastAiIdx = i;
                    break;
                }
            }
            if (lastAiIdx < 0) {
                showToast('没有AI消息可重试');
                return;
            }
        }

        // 删除该消息之后的所有消息并重试
        msgs.splice(lastAiIdx + 1);
        if (!msgs[lastAiIdx].swipes) {
            msgs[lastAiIdx].swipes = [msgs[lastAiIdx].content];
        }
        save();
        callAI(lastAiIdx);
    }
    
    // 创建页面DOM
    function createPage() {
        if (document.getElementById('st-chat-page')) return;

        const page = document.createElement('div');
        page.id = 'st-chat-page';
        page.className = 'st-chat-page';
        page.innerHTML = `
            <div class="st-nav">
                <div class="st-char-info" id="st-back" style="cursor:pointer;">
                    <div class="st-char-avatar-small" id="st-nav-avatar"></div>
                    <div class="st-char-info-text">
                        <div class="st-char-name" id="st-nav-name">线下聊天</div>
                        <div class="st-token-stats" id="st-token-stats">0 tokens</div>
                    </div>
                </div>
                <div class="st-nav-actions">
                    <button class="st-nav-btn" id="st-theme-btn" title="主题设置">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2.69l5.74 5.88-5.74 5.88-5.74-5.88L12 2.69zM12 21.31l-5.74-5.88 5.74-5.88 5.74 5.88-5.74 5.88zM2.69 12l5.88-5.74 5.88 5.74-5.88 5.74L2.69 12zM21.31 12l-5.88 5.74-5.88-5.74 5.88-5.74 5.88 5.74z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                    </button>
                    <button class="st-nav-btn" id="st-export-btn" title="导出对话">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                    </button>
                    <button class="st-nav-btn" id="st-summary-btn" title="对话总结">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                    </button>
                    <button class="st-nav-btn" id="st-preset-btn" title="预设管理">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                    </button>
                </div>
            </div>
            <div class="st-context-bar" id="st-context-bar" style="display:none;">
                <span class="st-context-info">已选择 <strong id="st-select-count">0</strong> 条消息</span>
                <button class="st-context-btn" id="st-select-copy">复制</button>
                <button class="st-context-btn" id="st-select-delete">删除</button>
                <button class="st-context-btn" id="st-select-cancel">取消</button>
            </div>
            <div class="st-messages" id="st-messages"></div>
            <div class="st-typing" id="st-typing">
                <div class="st-typing-dots"><span></span><span></span><span></span></div>
                <span>正在输入...</span>
            </div>
            <div class="st-input-area">
                <div class="st-input-actions">
                    <button class="st-input-action-btn" id="st-continue-btn" title="继续生成">继续</button>
                    <button class="st-input-action-btn" id="st-retry-btn" title="重试最后一条">重试</button>
                    <button class="st-input-action-btn" id="st-firstmsg-btn" title="生成开场白">开场</button>
                    <button class="st-input-action-btn" id="st-impersonate-btn" title="帮回">帮回</button>
                    <button class="st-input-action-btn" id="st-select-btn" title="多选模式">多选</button>
                    <button class="st-input-action-btn" id="st-clear-btn" title="清空聊天">清空</button>
                    <button class="st-input-action-btn" id="st-stop-btn" title="停止生成" style="display:none">停止</button>
                </div>
                <div class="st-input-wrapper">
                    <textarea id="st-input" class="st-input-field" placeholder="" rows="1"></textarea>
                    <button id="st-send" class="st-send-btn"></button>
                </div>
            </div>
        `;
        document.getElementById('app-container').appendChild(page);
        bindEvents();
    }
    
    function updateNav(chat) {
        const avatar = document.getElementById('st-nav-avatar');
        const name = document.getElementById('st-nav-name');
        if (avatar) avatar.innerHTML = chat.avatar ? `<img src="${chat.avatar}">` : '';
        if (name) name.textContent = chat.remark || chat.name || '线下聊天';
    }
    
    // 渲染消息
    function render() {
        const container = document.getElementById('st-messages');
        if (!container || !State.chatId) return;

        const msgs = State.messages[State.chatId] || [];
        const chat = window.AppState?.currentChat;
        const charAvatar = chat?.avatar || '';
        const userAvatar = chat?.userAvatar || window.AppState?.user?.avatar || '';
        const charName = chat?.remark || chat?.name || '角色';
        const userName = window.AppState?.user?.name || '我';
        const isCentered = State.messageLayout === 'centered';

        // 更新token统计
        updateTokenStats(msgs);

        // 空消息提示
        if (!msgs.length) {
            container.innerHTML = `<div class="st-empty-hint">发送消息开始对话，或点击下方"代入"让AI以你的身份开场</div>`;
            return;
        }

        container.innerHTML = msgs.map((m, idx) => {
            const isUser = m.role === 'user';
            const avatar = isUser ? userAvatar : charAvatar;
            const displayName = isUser ? userName : charName;
            const time = m.timestamp ? formatTime(m.timestamp) : '';
            const isSelected = State.selectedMessages.has(m.id);

            // 思维链处理 - 对齐ST: 优先从extra.reasoning读取，其次从文本解析
            let thinking = '', content = m.content || '';
            // 支持swipes：获取当前版本内容
            if (m.swipes?.length) {
                content = m.swipes[m.swipeIndex ?? 0] || '';
            }
            // 应用正则替换（仅AI消息）
            if (!isUser && content) {
                content = window.STPresetManager?.applyRegexReplacements?.(content) || content;
            }
            // ST风格: 优先使用已分离存储的reasoning (message.extra.reasoning)
            if (m.extra?.reasoning) {
                thinking = m.extra.reasoning;
                // 确保content中不包含reasoning标签
                content = removeThinking(content);
            } else if (reasoningSettings.auto_parse) {
                // 对齐ST: 仅在auto_parse开启时从文本解析（兼容旧数据）
                thinking = extractThinking(content);
                if (thinking) content = removeThinking(content);
            }

            // swipe导航（仅AI消息且有多个版本时显示）
            const hasSwipes = !isUser && m.swipes?.length > 1;
            const swipeNav = hasSwipes ? `
                <div class="st-swipe-nav">
                    <div class="st-swipe-btn prev" data-dir="prev">‹</div>
                    <span class="st-swipe-info">${(m.swipeIndex ?? 0) + 1}/${m.swipes.length}</span>
                    <div class="st-swipe-btn next" data-dir="next">›</div>
                </div>
            ` : '';

            // 对齐ST: reasoning显示 - 支持auto_expand和duration
            const reasoningDuration = m.extra?.reasoning_duration;
            const durationText = reasoningDuration 
                ? `${(reasoningDuration / 1000).toFixed(1)}s` 
                : '';
            const autoExpanded = reasoningSettings.auto_expand ? 'expanded' : '';
            const autoShow = reasoningSettings.auto_expand ? 'show' : '';

            // 根据布局类型渲染不同的HTML结构
            if (isCentered) {
                // 居中布局：头像居中，名字和时间在头像下方同一行
                return `
                    <div class="st-message ${isUser ? 'user' : 'char'} ${isSelected ? 'selected' : ''} ${State.isSelectMode ? 'select-mode' : ''}" data-id="${m.id}" data-idx="${idx}">
                        ${State.isSelectMode ? `
                            <div class="st-message-checkbox">
                                <input type="checkbox" class="st-select-checkbox" ${isSelected ? 'checked' : ''}>
                            </div>
                        ` : ''}
                        <div class="st-message-header st-header-centered">
                            <div class="st-message-avatar">
                                ${avatar ? `<img src="${avatar}">` : `<div class="st-message-avatar-text">${displayName[0]}</div>`}
                            </div>
                            <div class="st-message-info-row">
                                <span class="st-message-name">${esc(displayName)}</span>
                                <span class="st-message-time">${time}</span>
                            </div>
                        </div>
                        ${thinking ? `
                            <div class="st-thinking-toggle ${autoExpanded}" onclick="this.classList.toggle('expanded');this.nextElementSibling.classList.toggle('show')">
                                <span class="st-thinking-icon"></span>
                                ${durationText ? `<span class="st-thinking-duration">${durationText}</span>` : ''}
                            </div>
                            <div class="st-thinking-content ${autoShow}">${renderMarkdown(thinking)}</div>
                        ` : ''}
                        <div class="st-message-content">${renderMarkdown(content)}${State.streaming?.id === m.id ? '<span class="st-cursor"></span>' : ''}</div>
                        ${swipeNav}
                        <div class="st-message-actions">
                            ${!isUser ? `<div class="st-action-btn" data-action="retry" title="重新回复">
                                <svg viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </div>` : ''}
                            ${idx > 0 ? `<div class="st-action-btn" data-action="insert" title="插入消息">
                                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </div>` : ''}
                            <div class="st-action-btn" data-action="edit" title="编辑">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </div>
                            <div class="st-action-btn" data-action="copy" title="复制">
                                <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </div>
                            <div class="st-action-btn" data-action="delete" title="删除">
                                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 默认布局
            return `
                <div class="st-message ${isUser ? 'user' : 'char'} ${isSelected ? 'selected' : ''} ${State.isSelectMode ? 'select-mode' : ''}" data-id="${m.id}" data-idx="${idx}">
                    ${State.isSelectMode ? `
                        <div class="st-message-checkbox">
                            <input type="checkbox" class="st-select-checkbox" ${isSelected ? 'checked' : ''}>
                        </div>
                    ` : ''}
                    <div class="st-message-header">
                        <div class="st-message-avatar">
                            ${avatar ? `<img src="${avatar}">` : `<div class="st-message-avatar-text">${displayName[0]}</div>`}
                        </div>
                        <div class="st-message-name">${esc(displayName)}</div>
                        <div class="st-message-time">${time}</div>
                    </div>
                    ${thinking ? `
                        <div class="st-thinking-toggle ${autoExpanded}" onclick="this.classList.toggle('expanded');this.nextElementSibling.classList.toggle('show')">
                            <span class="st-thinking-icon"></span>
                            ${durationText ? `<span class="st-thinking-duration">${durationText}</span>` : ''}
                        </div>
                        <div class="st-thinking-content ${autoShow}">${renderMarkdown(thinking)}</div>
                    ` : ''}
                    <div class="st-message-content">${renderMarkdown(content)}${State.streaming?.id === m.id ? '<span class="st-cursor"></span>' : ''}</div>
                    ${swipeNav}
                    <div class="st-message-actions">
                        ${!isUser ? `<div class="st-action-btn" data-action="retry" title="重新回复">
                            <svg viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                        </div>` : ''}
                        ${idx > 0 ? `<div class="st-action-btn" data-action="insert" title="插入消息">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                        </div>` : ''}
                        <div class="st-action-btn" data-action="edit" title="编辑">
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                        </div>
                        <div class="st-action-btn" data-action="copy" title="复制">
                            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                        </div>
                        <div class="st-action-btn" data-action="delete" title="删除">
                            <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 发送消息
    function send() {
        const input = document.getElementById('st-input');
        const content = input?.value.trim();
        if (!content || !State.chatId) return;
        
        const msg = { id: 'msg_' + Date.now(), role: 'user', content, timestamp: new Date().toISOString() };
        State.messages[State.chatId].push(msg);
        input.value = '';
        input.style.height = 'auto';
        
        save();
        render();
        scrollBottom();
        
        setTimeout(() => callAI(), 300);
    }
    
    // 调用AI
    async function callAI(swipeIdx = null, isContinue = false, isImpersonate = false, isFirstMsg = false) {
        const input = document.getElementById('st-input');
        const sendBtn = document.getElementById('st-send');
        const typing = document.getElementById('st-typing');
        const stopBtn = document.getElementById('st-stop-btn');
        const continueBtn = document.getElementById('st-continue-btn');
        
        State.isContinuing = isContinue;
        
        if (input) { input.disabled = true; input.placeholder = ''; }
        if (sendBtn) sendBtn.disabled = true;
        if (typing) typing.classList.add('show');
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (continueBtn) continueBtn.style.display = 'none';
        
        State.abortController = new AbortController();
        
        try {
            const api = window.AppState?.apiSettings;
            if (!api?.endpoint || !api?.selectedModel) throw new Error('请先配置API');
            
            const chat = window.AppState?.currentChat;
            const conv = window.AppState?.conversations?.find(c => c.id === chat?.id);
            const charName = conv?.name || 'Assistant';
            const userName = conv?.userNameForChar || window.AppState?.user?.name || 'User';
            
            // 收集聊天历史
            const chatHistory = [];
            
            // 线上消息历史
            const online = window.AppState?.messages?.[chat?.id] || [];
            online.slice(-50).forEach(m => {
                if (m.type === 'sent') chatHistory.push({ role: 'user', content: m.content || '' });
                else if (m.type === 'received') chatHistory.push({ role: 'assistant', content: m.content || '' });
            });
            
            // 线下消息（swipe模式时不包含当前AI消息）
            const msgs = State.messages[State.chatId] || [];
            const limit = swipeIdx !== null ? swipeIdx : msgs.length;
            msgs.slice(0, limit).forEach(m => {
                const c = m.swipes ? m.swipes[m.swipeIndex ?? 0] : m.content;
                chatHistory.push({ role: m.role === 'user' ? 'user' : 'assistant', content: c || '' });
            });
            
            // 使用预设管理器构建消息，如果没有则使用默认
            let apiMsgs;
            const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
            if (window.STPresetManager?.buildMessages) {
                apiMsgs = window.STPresetManager.buildMessages(chatHistory, lastUserMsg);
            } else {
                // 默认提示词
                apiMsgs = [
                    { role: 'system', content: `Write ${charName}'s next reply in a fictional chat between ${charName} and ${userName}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.` },
                    ...chatHistory
                ];
            }
            
            // 添加线下世界书内容
            if (window.WorldbookManager?.getOfflineWorldbooksContent) {
                const wbContent = window.WorldbookManager.getOfflineWorldbooksContent();
                if (wbContent) {
                    apiMsgs.splice(1, 0, { role: 'system', content: `[World Info]\n${wbContent}` });
                }
            }
            
            // 继续生成：将最后一条AI消息改为assistant角色，让模型直接续写
            if (isContinue) {
                const lastAiMsg = apiMsgs[apiMsgs.length - 1];
                if (lastAiMsg && lastAiMsg.role === 'assistant') {
                    // 保持原内容，模型会自动续写
                    apiMsgs.push({ role: 'system', content: '[Continue directly from where you left off. Do not include thinking or reasoning. Just continue the text naturally.]' });
                }
            }
            
            // 代入角色：让AI以用户身份回复
            if (isImpersonate) {
                apiMsgs.push({ role: 'system', content: `[Write the next message as ${userName}, staying in character.]` });
            }
            
            // 开场白：让AI生成角色的第一条消息
            if (isFirstMsg) {
                apiMsgs.push({ role: 'system', content: `[Write ${charName}'s first message to start the conversation. Be creative and engaging.]` });
            }
            
            // 创建或更新AI消息
            let aiMsg;
            let originalContent = '';
            if (isContinue) {
                // 继续生成：追加到最后一条AI消息
                aiMsg = msgs[msgs.length - 1];
                originalContent = aiMsg.swipes ? aiMsg.swipes[aiMsg.swipeIndex ?? 0] : aiMsg.content;
            } else if (swipeIdx !== null) {
                aiMsg = msgs[swipeIdx];
                aiMsg.swipes.push('');
                aiMsg.swipeIndex = aiMsg.swipes.length - 1;
            } else if (isImpersonate) {
                // 代入：创建用户消息
                aiMsg = { id: 'msg_' + Date.now(), role: 'user', content: '', timestamp: new Date().toISOString() };
                State.messages[State.chatId].push(aiMsg);
            } else if (isFirstMsg) {
                // 开场白：创建角色消息
                aiMsg = { id: 'msg_' + Date.now(), role: 'char', content: '', timestamp: new Date().toISOString() };
                State.messages[State.chatId].push(aiMsg);
            } else {
                aiMsg = { id: 'msg_' + Date.now(), role: 'char', content: '', timestamp: new Date().toISOString() };
                State.messages[State.chatId].push(aiMsg);
            }
            State.streaming = aiMsg;
            State.originalContent = originalContent;
            render();
            scrollBottom();
            
            // 流式请求
            const endpoint = api.endpoint.replace(/\/$/, '') + '/v1/chat/completions';
            const requestBody = {
                model: api.selectedModel,
                messages: apiMsgs.filter(m => m.content?.trim()),
                temperature: api.temperature ?? 0.8,
                max_tokens: isContinue ? 2000 : 4000,
                stream: true
            };
            
            // 继续模式：禁用思维链
            if (isContinue) {
                requestBody.thinking = { type: 'disabled' };
            }
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(api.apiKey ? { 'Authorization': 'Bearer ' + api.apiKey } : {})
                },
                body: JSON.stringify(requestBody),
                signal: State.abortController?.signal
            });
            
            if (!res.ok) {
                let errDetail = `HTTP ${res.status}`;
                try { const ej = await res.json(); errDetail = ej?.error?.message || errDetail; } catch(e) {}
                throw new Error(errDetail);
            }
            
            // 流式状态
            let reasoningBuffer = '';
            let contentBuffer = '';
            let isInReasoning = false;
            
            const contentType = res.headers.get('content-type') || '';
            const isSSE = contentType.includes('text/event-stream');
            
            // ========== 非流式响应（API返回JSON而非SSE） ==========
            if (!isSSE) {
                let fullText = '';
                let fullReasoning = '';
                try {
                    const json = await res.json();
                    const choice = json?.choices?.[0];
                    
                    // 继续模式：忽略所有思维链
                    if (isContinue) {
                        if (choice?.message?.content) {
                            fullText = choice.message.content;
                        } else {
                            fullText = json?.choices?.[0]?.text || JSON.stringify(json);
                        }
                    } else {
                        // === 严格对齐ST的 extractReasoningFromData ===
                        
                        // 1. Ollama格式 (ST: textgen_types.OLLAMA -> data?.thinking)
                        if (json?.thinking !== undefined) {
                            fullReasoning = json.thinking || '';
                            fullText = json.response || '';
                        }
                        // 2. Gemini格式 (ST: MAKERSUITE/VERTEXAI -> responseContent.parts)
                        else if (Array.isArray(json?.responseContent?.parts)) {
                            fullReasoning = json.responseContent.parts
                                .filter(part => part.thought)
                                .map(part => part.text)
                                .join('\n\n') || '';
                            fullText = json.responseContent.parts
                                .filter(part => !part.thought && part.text)
                                .map(part => part.text)
                                .join('') || '';
                        }
                        // 3. Claude原生格式 (ST: CLAUDE -> content.find(type==='thinking'))
                        else if (Array.isArray(json?.content)) {
                            const thinkingPart = json.content.find(part => part.type === 'thinking');
                            fullReasoning = thinkingPart?.thinking || '';
                            const textParts = json.content.filter(part => part.type === 'text');
                            fullText = textParts.map(part => part.text).join('') || '';
                        }
                        // 4. OpenAI-likes choices格式
                        else if (choice?.message) {
                            const m = choice.message;
                            // DeepSeek/XAI: reasoning_content (ST: DEEPSEEK/XAI)
                            fullReasoning = m.reasoning_content || '';
                            // OpenRouter: reasoning (ST: OPENROUTER)
                            if (!fullReasoning) fullReasoning = m.reasoning || choice.reasoning || '';
                            
                            // Mistral格式: content是数组含thinking (ST: MISTRALAI)
                            if (Array.isArray(m.content)) {
                                const thinkParts = m.content.filter(x => x?.thinking);
                                if (thinkParts.length > 0) {
                                    fullReasoning = thinkParts.map(x => {
                                        if (Array.isArray(x.thinking)) {
                                            return x.thinking.map(t => t.text || '').filter(Boolean).join('\n\n');
                                        }
                                        return '';
                                    }).join('') || fullReasoning;
                                }
                                fullText = m.content.filter(x => typeof x?.text === 'string' && !x?.thinking).map(x => x.text).join('');
                            } else {
                                fullText = m.content || '';
                            }
                            
                            // 通用 fallback: reasoning_content 或 reasoning (ST: CUSTOM/AIMLAPI等)
                            if (!fullReasoning) {
                                fullReasoning = m.reasoning_content || m.reasoning || '';
                            }
                        } else {
                            fullText = json?.choices?.[0]?.text || JSON.stringify(json);
                        }
                    }
                } catch(e) {
                    try {
                        const raw = await res.text();
                        fullText = raw;
                    } catch(e2) {
                        fullText = '解析响应失败';
                    }
                }
                
                reasoningBuffer = isContinue ? '' : fullReasoning;
                contentBuffer = fullText;
                
                // 平滑打字机效果 (模拟ST的SmoothEventSourceStream)
                await smoothTypewriter(aiMsg, fullReasoning, fullText);
            }
            // ========== 真流式响应（SSE） ==========
            else {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let sseBuffer = '';
                
                // 平滑输出队列 (模拟ST的SmoothEventSourceStream)
                let smoothQueue = [];
                let smoothRunning = false;
                let lastChar = '';
                
                // 启动平滑输出消费者
                const smoothConsumer = async () => {
                    if (smoothRunning) return;
                    smoothRunning = true;
                    while (smoothQueue.length > 0) {
                        if (State.abortController?.signal?.aborted) break;
                        const item = smoothQueue.shift();
                        if (item.type === 'reasoning') {
                            reasoningBuffer += item.char;
                            isInReasoning = true;
                            // 对齐ST: 记录reasoning开始时间
                            if (!aiMsg._reasoningStartTime) {
                                aiMsg._reasoningStartTime = Date.now();
                            }
                        } else {
                            contentBuffer += item.char;
                            isInReasoning = false;
                        }
                        // 组合并更新显示
                        const display = composeContent(reasoningBuffer, contentBuffer, isInReasoning);
                        writeToMsg(aiMsg, display);
                        updateStreamingMsg(aiMsg);
                        // ST风格延迟: 基于字符类型的动态延迟
                        await sleep(getSmoothDelay(lastChar));
                        lastChar = item.char;
                    }
                    smoothRunning = false;
                };
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    sseBuffer += decoder.decode(value, { stream: true });
                    
                    // 按SSE规范用双换行分割事件 (ST: EventSourceStream)
                    const events = sseBuffer.split(/\r\n\r\n|\r\r|\n\n/);
                    sseBuffer = events.pop() || '';
                    
                    for (const eventChunk of events) {
                        if (!eventChunk.trim()) continue;
                        
                        // 解析SSE事件的data字段
                        let eventData = '';
                        const lines = eventChunk.split(/\r\n|\r|\n/);
                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                eventData += (eventData ? '\n' : '') + line.slice(5).trimStart();
                            }
                        }
                        
                        if (!eventData || eventData.trim() === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(eventData);
                            // 解析流式数据 (ST: parseStreamData + getStreamingReply)
                            const parsed = parseSSEChunk(json);
                            if (!parsed) continue;
                            
                            // 继续模式：忽略思维链
                            if (isContinue && parsed.reasoning) {
                                parsed.reasoning = '';
                            }
                            
                            // 将每个chunk拆成单字符推入平滑队列 (ST: SmoothEventSourceStream)
                            if (parsed.reasoning) {
                                for (const ch of parsed.reasoning) {
                                    smoothQueue.push({ type: 'reasoning', char: ch });
                                }
                            }
                            if (parsed.content) {
                                for (const ch of parsed.content) {
                                    smoothQueue.push({ type: 'content', char: ch });
                                }
                            }
                            
                            // 启动消费者
                            smoothConsumer();
                        } catch(e) {
                            console.log('[SSE Parse Error]', e.message);
                        }
                    }
                }
                
                // 等待平滑队列消费完毕
                while (smoothQueue.length > 0) {
                    await sleep(10);
                }
                // 等待最后一次消费者完成
                await sleep(50);
            }
            
            // 流结束后确保reasoning标签闭合
            const finalContent = composeContent(reasoningBuffer, contentBuffer, false);
            writeToMsg(aiMsg, finalContent);
            
            State.streaming = null;
            State.abortController = null;
            
            // === 对齐ST: 流结束后自动解析reasoning并分离存储 ===
            // 继续模式：跳过reasoning处理
            if (!isContinue) {
                // ST在 registerReasoningAppEvents -> MESSAGE_RECEIVED 事件中做 parseReasoningFromString
                const aiContent = aiMsg.swipes ? aiMsg.swipes[aiMsg.swipeIndex] : aiMsg.content;
                
                // 优先使用流式过程中已收集的reasoningBuffer
                let finalReasoning = reasoningBuffer;
                
                // 如果流式没有收集到reasoning，尝试从文本中解析（对齐ST的auto_parse）
                // ST: strict=true（默认），reasoning必须在字符串开头
                if (!finalReasoning && reasoningSettings.auto_parse) {
                    const parsed = parseReasoningFromString(aiContent);
                    if (parsed?.reasoning) {
                        finalReasoning = parsed.reasoning;
                        // 从消息内容中移除reasoning部分（对齐ST: message.mes = parsedReasoning.content）
                        writeToMsg(aiMsg, parsed.content);
                    } else if (parsed && parsed.content !== aiContent) {
                        // ST: 即使reasoning为空，如果content变了也要更新
                        writeToMsg(aiMsg, parsed.content);
                    }
                }
                
                // 存储reasoning到消息的extra字段（对齐ST: message.extra.reasoning）
                if (finalReasoning) {
                    if (!aiMsg.extra) aiMsg.extra = {};
                    aiMsg.extra.reasoning = finalReasoning;
                    aiMsg.extra.reasoning_type = reasoningBuffer ? 'model' : 'parsed';
                    // 对齐ST: 存储reasoning持续时间
                    if (aiMsg._reasoningStartTime) {
                        aiMsg.extra.reasoning_duration = Date.now() - aiMsg._reasoningStartTime;
                        delete aiMsg._reasoningStartTime;
                    }
                    
                    // 存储到cot变量
                    window.STPresetManager?.VariableStore?.setCOT?.(finalReasoning);
                    console.log('[COT] 已存储思考内容到cot变量');
                }

                // 对齐ST: add_to_prompts - 如果启用，将reasoning添加回消息内容供下次prompt使用
                if (reasoningSettings.add_to_prompts && finalReasoning) {
                    const prefix = reasoningSettings.prefix || '';
                    const suffix = reasoningSettings.suffix || '';
                    const separator = reasoningSettings.separator || '';
                    const aiContent = aiMsg.swipes ? aiMsg.swipes[aiMsg.swipeIndex] : aiMsg.content;
                    const formattedReasoning = `${prefix}${finalReasoning}${suffix}${separator}`;
                    // 不修改显示内容，但在extra中标记以便buildMessages时使用
                    if (!aiMsg.extra) aiMsg.extra = {};
                    aiMsg.extra.reasoning_formatted = formattedReasoning;
                }
            }
            
            save();
            render();
            
        } catch(e) {
            if (e.name !== 'AbortError') {
                console.error('[AI Error]', e);
                const errorMsg = 'AI回复失败: ' + e.message;
                showToast(errorMsg);

                // 自动重试逻辑
                if (State.retryCount < State.maxRetries && !isContinue && !isImpersonate && !isFirstMsg && swipeIdx === null) {
                    State.retryCount++;
                    showToast(`正在重试 (${State.retryCount}/${State.maxRetries})...`);

                    // 延迟后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * State.retryCount));
                    return callAI(swipeIdx, isContinue, isImpersonate, isFirstMsg);
                }
            } else {
                showToast('已停止生成');
            }
        } finally {
            if (input) { input.disabled = false; input.placeholder = ''; }
            if (sendBtn) sendBtn.disabled = false;
            if (typing) typing.classList.remove('show');
            const stopBtn = document.getElementById('st-stop-btn');
            const continueBtn = document.getElementById('st-continue-btn');
            if (stopBtn) stopBtn.style.display = 'none';
            if (continueBtn) continueBtn.style.display = 'inline-block';
            State.streaming = null;
            State.abortController = null;
            State.retryCount = 0;
            State.isContinuing = false;
            State.originalContent = '';
        }
    }
    
    // 消息操作
    function handleAction(action, id) {
        const msgs = State.messages[State.chatId];
        const idx = msgs?.findIndex(m => m.id === id);
        if (idx < 0) return;

        if (action === 'copy') {
            const msg = msgs[idx];
            const content = msg.swipes ? msg.swipes[msg.swipeIndex ?? 0] : msg.content;
            navigator.clipboard.writeText(content).then(() => showToast('已复制'));
        } else if (action === 'retry') {
            // 正在生成时禁止重试
            if (State.streaming) return;
            // AI消息：添加新swipe版本
            if (msgs[idx].role === 'char') {
                // 初始化swipes数组
                if (!msgs[idx].swipes) {
                    msgs[idx].swipes = [msgs[idx].content];
                }
                // 删除该消息之后的所有消息
                msgs.splice(idx + 1);
                // 生成新版本
                save();
                callAI(idx);
            }
        } else if (action === 'insert') {
            // 插入：在此消息前插入新消息
            if (State.streaming) return;
            insertMessage(idx);
        } else if (action === 'delete') {
            showConfirm('确定删除此消息？', () => {
                msgs.splice(idx, 1);
                save();
                render();
                showToast('已删除');
            });
        } else if (action === 'edit') {
            editMessage(msgs, idx);
        }
    }

    // 插入消息
    function insertMessage(idx) {
        const msgs = State.messages[State.chatId];
        if (!msgs) return;

        const modal = document.createElement('div');
        modal.className = 'st-modal-overlay';
        modal.innerHTML = `
            <div class="st-modal-box">
                <div class="st-modal-header">
                    <h3>插入消息</h3>
                    <button class="st-modal-close" id="st-modal-close">×</button>
                </div>
                <div class="st-modal-body">
                    <div class="st-form-group">
                        <label class="st-form-label">消息类型</label>
                        <select id="st-insert-role" class="st-form-input">
                            <option value="user">用户消息</option>
                            <option value="char">角色消息</option>
                        </select>
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-label">消息内容</label>
                        <textarea id="st-insert-content" class="st-form-input" style="min-height:120px;resize:vertical;" placeholder="输入消息内容..."></textarea>
                    </div>
                    <div class="st-confirm-actions">
                        <button class="st-btn secondary" id="st-insert-cancel">取消</button>
                        <button class="st-btn primary" id="st-insert-confirm">插入</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const roleSelect = modal.querySelector('#st-insert-role');
        const textarea = modal.querySelector('#st-insert-content');
        textarea.focus();

        // 关闭
        modal.querySelector('#st-modal-close').onclick = () => modal.remove();
        modal.querySelector('#st-insert-cancel').onclick = () => modal.remove();

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // 插入
        modal.querySelector('#st-insert-confirm').onclick = () => {
            const content = textarea.value.trim();
            if (!content) {
                showToast('请输入消息内容');
                return;
            }

            const role = roleSelect.value;
            const newMsg = {
                id: 'msg_' + Date.now(),
                role: role,
                content: content,
                timestamp: new Date().toISOString()
            };

            msgs.splice(idx, 0, newMsg);
            save();
            render();
            modal.remove();
            showToast('已插入消息');

            // 如果插入的是用户消息，自动触发AI回复
            if (role === 'user') {
                setTimeout(() => callAI(), 300);
            }
        };
    }

    // 显示确认对话框
    function showConfirm(message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.className = 'st-modal-overlay';
        overlay.innerHTML = `
            <div class="st-modal-box st-confirm-dialog">
                <div class="st-confirm-icon">⚠️</div>
                <div class="st-confirm-title">确认操作</div>
                <div class="st-confirm-message">${message}</div>
                <div class="st-confirm-actions">
                    <button class="st-btn secondary" id="st-confirm-cancel">取消</button>
                    <button class="st-btn danger" id="st-confirm-ok">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#st-confirm-cancel').onclick = () => {
            overlay.remove();
            if (onCancel) onCancel();
        };

        overlay.querySelector('#st-confirm-ok').onclick = () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (onCancel) onCancel();
            }
        };
    }

    // 显示总结对话框
    function showSummaryDialog() {
        const chat = window.AppState?.currentChat;
        if (!chat) {
            showToast('请先打开一个聊天');
            return;
        }

        const conv = window.AppState?.conversations?.find(c => c.id === chat.id);
        const msgs = State.messages[chat.id] || [];

        const modal = document.createElement('div');
        modal.className = 'st-modal-overlay';
        modal.innerHTML = `
            <div class="st-modal-box">
                <div class="st-modal-header">
                    <h3>对话总结</h3>
                    <button class="st-modal-close" id="st-modal-close">×</button>
                </div>
                <div class="st-modal-body">
                    <div class="st-summary-info">
                        <span>当前消息数: <strong>${msgs.length}</strong> 条</span>
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-label">总结间隔</label>
                        <div class="st-form-hint">每多少条消息后自动进行总结</div>
                        <input type="number" class="st-form-input" id="st-summary-interval" value="${window.AppState?.apiSettings?.summaryInterval || 50}" min="10" max="500">
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-label">保留消息数</label>
                        <div class="st-form-hint">总结后保留最新的多少条消息</div>
                        <input type="number" class="st-form-input" id="st-summary-keep" value="${window.AppState?.apiSettings?.summaryKeepLatest || 10}" min="5" max="100">
                    </div>
                    <div class="st-form-group">
                        <button class="st-btn primary" id="st-summary-generate">立即生成总结</button>
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-checkbox">
                            <input type="checkbox" id="st-summary-auto" ${window.AppState?.apiSettings?.summaryEnabled ? 'checked' : ''}>
                            <span>启用自动总结</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 关闭
        document.getElementById('st-modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // 生成总结
        document.getElementById('st-summary-generate').onclick = () => {
            modal.remove();
            generateSummary();
        };

        // 保存设置
        const saveSettings = () => {
            const interval = parseInt(document.getElementById('st-summary-interval').value) || 50;
            const keep = parseInt(document.getElementById('st-summary-keep').value) || 10;
            const auto = document.getElementById('st-summary-auto').checked;

            window.AppState.apiSettings.summaryInterval = interval;
            window.AppState.apiSettings.summaryKeepLatest = keep;
            window.AppState.apiSettings.summaryEnabled = auto;

            if (window.saveToStorage) {
                window.saveToStorage();
            }
            showToast('设置已保存');
        };

        document.getElementById('st-summary-interval').onchange = saveSettings;
        document.getElementById('st-summary-keep').onchange = saveSettings;
        document.getElementById('st-summary-auto').onchange = saveSettings;
    }

    // 生成总结
    async function generateSummary() {
        const chat = window.AppState?.currentChat;
        if (!chat) {
            showToast('请先打开一个聊天');
            return;
        }

        const msgs = State.messages[chat.id] || [];
        if (msgs.length < 3) {
            showToast('消息过少，无需总结');
            return;
        }

        // 收集线上+线下消息
        const allMessages = [];

        // 线上消息
        const online = window.AppState?.messages?.[chat.id] || [];
        online.forEach(m => {
            if (m.type === 'sent' && !m.isRetracted) {
                allMessages.push({ role: 'user', content: m.content || '' });
            } else if (m.type === 'received' && !m.isRetracted) {
                allMessages.push({ role: 'assistant', content: m.content || '' });
            }
        });

        // 线下消息
        msgs.forEach(m => {
            const content = m.swipes ? m.swipes[m.swipeIndex ?? 0] : m.content;
            allMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: content || '' });
        });

        if (allMessages.length === 0) {
            showToast('没有消息可以总结');
            return;
        }

        // 构建对话文本
        const conv = window.AppState?.conversations?.find(c => c.id === chat.id);
        const charName = conv?.name || '角色';
        const userName = conv?.userNameForChar || window.AppState?.user?.name || '用户';

        let conversationText = allMessages.map(m => {
            return m.role === 'user' ? `${userName}: ${m.content}` : `${charName}: ${m.content}`;
        }).join('\n');

        showToast('正在生成总结...');

        // 使用CharacterSettingsManager的总结功能
        if (window.CharacterSettingsManager) {
            await window.CharacterSettingsManager.summarizeConversation(chat.id, false);
            showToast('总结已生成');
        } else {
            // 使用副API
            const hasSecondaryApi = window.AppState.apiSettings.secondaryEndpoint &&
                                   window.AppState.apiSettings.secondaryApiKey &&
                                   window.AppState.apiSettings.secondarySelectedModel;

            if (!hasSecondaryApi) {
                showToast('请先配置副API设置');
                return;
            }

            // 调用副API
            const prompt = window.AppState.apiSettings.secondaryPrompts?.summarize ||
                '你是一个专业的对话总结员。请为下面的对话内容生成一份简洁准确的总结。';

            try {
                const endpoint = window.AppState.apiSettings.secondaryEndpoint.replace(/\/$/, '') + '/v1/chat/completions';
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + window.AppState.apiSettings.secondaryApiKey
                    },
                    body: JSON.stringify({
                        model: window.AppState.apiSettings.secondarySelectedModel,
                        messages: [
                            { role: 'system', content: prompt },
                            { role: 'user', content: conversationText }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                const result = window.APIUtils ? window.APIUtils.extractTextFromResponse(data) : data.choices?.[0]?.message?.content || '';

                if (result) {
                    // 保存总结到conversation
                    if (!conv.summaries) {
                        conv.summaries = [];
                    }
                    conv.summaries.push({
                        content: result,
                        isAutomatic: false,
                        timestamp: new Date().toISOString(),
                        messageCount: allMessages.length
                    });

                    if (window.saveToStorage) {
                        window.saveToStorage();
                    }
                    showToast('总结已生成');
                }
            } catch (e) {
                showToast('总结失败: ' + e.message);
            }
        }
    }

    // 编辑消息
    function editMessage(msgs, idx) {
        const el = document.querySelector(`[data-id="${msgs[idx].id}"]`);
        const contentEl = el?.querySelector('.st-message-content');
        if (!contentEl) return;

        el.classList.add('editing');
        const textarea = document.createElement('textarea');
        textarea.className = 'st-edit-textarea';
        textarea.value = msgs[idx].swipes ? msgs[idx].swipes[msgs[idx].swipeIndex ?? 0] : msgs[idx].content;

        const actions = document.createElement('div');
        actions.className = 'st-edit-actions';
        actions.innerHTML = '<button class="st-edit-btn cancel">取消</button><button class="st-edit-btn save">保存</button>';

        contentEl.after(textarea, actions);
        textarea.focus();

        actions.querySelector('.cancel').onclick = () => {
            el.classList.remove('editing');
            textarea.remove();
            actions.remove();
        };

        actions.querySelector('.save').onclick = () => {
            const v = textarea.value.trim();
            if (v) {
                if (msgs[idx].swipes) {
                    msgs[idx].swipes[msgs[idx].swipeIndex ?? 0] = v;
                } else {
                    msgs[idx].content = v;
                }
                save();
            }
            render();
        };
    }

    // 多选模式切换
    function toggleSelectMode() {
        State.isSelectMode = !State.isSelectMode;
        State.selectedMessages.clear();

        const contextBar = document.getElementById('st-context-bar');
        if (contextBar) {
            contextBar.style.display = State.isSelectMode ? 'flex' : 'none';
        }

        // 更新按钮激活状态
        const selectBtn = document.getElementById('st-select-btn');
        if (selectBtn) {
            selectBtn.classList.toggle('active', State.isSelectMode);
        }

        updateSelectCount();
        render();
        showToast(State.isSelectMode ? '进入多选模式' : '退出多选模式');
    }

    // 更新选择计数
    function updateSelectCount() {
        const countEl = document.getElementById('st-select-count');
        if (countEl) {
            countEl.textContent = State.selectedMessages.size;
        }
    }

    // 多选操作
    function handleSelectAction(action) {
        const msgs = State.messages[State.chatId];
        const selectedIds = Array.from(State.selectedMessages);

        if (action === 'copy') {
            const contents = msgs
                .filter(m => selectedIds.includes(m.id))
                .map(m => m.swipes ? m.swipes[m.swipeIndex ?? 0] : m.content);
            navigator.clipboard.writeText(contents.join('\n\n')).then(() => {
                showToast(`已复制 ${contents.length} 条消息`);
            });
        } else if (action === 'delete') {
            showConfirm(`确定删除选中的 ${selectedIds.length} 条消息？`, () => {
                State.messages[State.chatId] = msgs.filter(m => !selectedIds.includes(m.id));
                State.selectedMessages.clear();
                save();
                render();
                showToast(`已删除 ${selectedIds.length} 条消息`);
            });
        } else if (action === 'cancel') {
            toggleSelectMode();
        }
    }

    // 导出对话
    function exportChat() {
        const msgs = State.messages[State.chatId] || [];
        if (!msgs.length) {
            showToast('没有可导出的消息');
            return;
        }

        const chat = window.AppState?.currentChat;
        const charName = chat?.remark || chat?.name || '角色';
        const userName = window.AppState?.user?.name || '我';

        // 构建导出数据
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            character: charName,
            user: userName,
            messages: msgs.map(m => ({
                role: m.role,
                content: m.content,
                swipes: m.swipes,
                swipeIndex: m.swipeIndex,
                timestamp: m.timestamp
            }))
        };

        // JSON格式
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `offline_chat_${State.chatId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('已导出对话');
    }

    // 导入对话
    function importChat() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (data.messages && Array.isArray(data.messages)) {
                    // 追加导入的消息
                    const msgs = State.messages[State.chatId] || [];
                    const newMessages = data.messages.map(m => ({
                        ...m,
                        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    }));

                    State.messages[State.chatId] = [...msgs, ...newMessages];
                    save();
                    render();
                    showToast(`已导入 ${newMessages.length} 条消息`);
                } else {
                    showToast('无效的导入文件格式');
                }
            } catch (err) {
                console.error('Import error:', err);
                showToast('导入失败: ' + err.message);
            }
        };
        input.click();
    }

    // Token估算
    function estimateTokens(text) {
        if (!text) return 0;
        const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const other = text.length - cn;
        return Math.ceil(cn / 1.5 + other / 4);
    }

    // 更新Token统计
    function updateTokenStats(msgs) {
        const statsEl = document.getElementById('st-token-stats');
        if (!statsEl) return;

        let totalTokens = 0;
        msgs.forEach(m => {
            const content = m.swipes ? m.swipes[m.swipeIndex ?? 0] : m.content;
            totalTokens += estimateTokens(content);
        });

        statsEl.textContent = `${totalTokens.toLocaleString()} tokens · ${msgs.length} 条消息`;
    }
    
    // 事件绑定
    function bindEvents() {
        // 返回
        document.getElementById('st-back').onclick = close;
        document.getElementById('st-send').onclick = send;

        // 导航按钮
        document.getElementById('st-preset-btn').onclick = () => window.STPresetManager?.open();
        document.getElementById('st-clear-btn').onclick = clearChat;
        document.getElementById('st-select-btn').onclick = toggleSelectMode;
        document.getElementById('st-summary-btn').onclick = showSummaryDialog;
        document.getElementById('st-theme-btn').onclick = showThemeModal; // 主题按钮

        // 导出按钮 - 显示菜单
        document.getElementById('st-export-btn').onclick = (e) => {
            const menu = document.createElement('div');
            menu.className = 'st-context-menu';
            menu.innerHTML = `
                <div class="st-context-item" data-action="export">导出对话 (JSON)</div>
                <div class="st-context-item" data-action="import">导入对话 (JSON)</div>
            `;
            document.body.appendChild(menu);
            const rect = e.target.getBoundingClientRect();
            const menuWidth = menu.offsetWidth || 120;
            let left = rect.left;
            // 防止菜单超出屏幕右侧
            if (left + menuWidth > window.innerWidth - 10) {
                left = window.innerWidth - menuWidth - 10;
            }
            // 防止菜单超出屏幕左侧
            if (left < 10) left = 10;
            menu.style.left = left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';

            menu.onclick = (me) => {
                const action = me.target.dataset.action;
                if (action === 'export') {
                    exportChat();
                } else if (action === 'import') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (ie) => {
                        if (ie.target.files[0]) importChatFile(ie.target.files[0]);
                    };
                    input.click();
                }
                menu.remove();
            };

            setTimeout(() => {
                document.addEventListener('click', function removeMenu() {
                    menu.remove();
                    document.removeEventListener('click', removeMenu);
                });
            }, 10);
        };

        // 功能按钮
        document.getElementById('st-continue-btn').onclick = continueGen;
        document.getElementById('st-stop-btn').onclick = stopGen;
        document.getElementById('st-impersonate-btn').onclick = impersonate;
        document.getElementById('st-firstmsg-btn').onclick = generateFirstMsg;
        document.getElementById('st-retry-btn').onclick = retryLast;

        // 多选操作
        document.getElementById('st-select-copy').onclick = () => handleSelectAction('copy');
        document.getElementById('st-select-delete').onclick = () => handleSelectAction('delete');
        document.getElementById('st-select-cancel').onclick = () => handleSelectAction('cancel');

        // 输入框
        document.getElementById('st-input').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
        });

        document.getElementById('st-input').addEventListener('input', e => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });

        // 消息列表事件
        document.getElementById('st-messages').addEventListener('click', e => {
            const msgEl = e.target.closest('.st-message');

            // 多选模式 - 点击整个消息选择（SillyTavern风格：选择该消息及之后的所有消息）
            if (msgEl && State.isSelectMode) {
                const id = msgEl.dataset.id;
                const idx = parseInt(msgEl.dataset.idx);
                const msgs = State.messages[State.chatId];

                // 如果点击的是按钮，不触发选择
                if (e.target.closest('.st-action-btn') || e.target.closest('.st-swipe-btn') || e.target.closest('.st-message-actions')) {
                    return;
                }

                if (id !== undefined) {
                    e.preventDefault();

                    // 检查当前消息是否已被选中
                    const wasSelected = State.selectedMessages.has(id);

                    if (wasSelected) {
                        // 如果已选中，取消选中该消息及之后的所有消息
                        for (let i = idx; i < msgs.length; i++) {
                            const msgId = msgs[i].id;
                            State.selectedMessages.delete(msgId);
                        }
                    } else {
                        // 如果未选中，选中该消息及之后的所有消息
                        for (let i = idx; i < msgs.length; i++) {
                            const msgId = msgs[i].id;
                            State.selectedMessages.add(msgId);
                        }
                    }

                    // 更新UI
                    document.querySelectorAll('.st-message').forEach(el => {
                        const elIdx = parseInt(el.dataset.idx);
                        const elId = el.dataset.id;
                        const checkbox = el.querySelector('.st-select-checkbox');

                        // 仅更新从idx开始的消息
                        if (elIdx >= idx) {
                            if (State.selectedMessages.has(elId)) {
                                el.classList.add('selected');
                                if (checkbox) checkbox.checked = true;
                            } else {
                                el.classList.remove('selected');
                                if (checkbox) checkbox.checked = false;
                            }
                        }
                    });

                    updateSelectCount();
                }
                return;
            }

            // 点击其他消息时隐藏之前的操作按钮
            if (!State.isSelectMode && !e.target.closest('.st-action-btn')) {
                document.querySelectorAll('.st-message.long-press').forEach(el => {
                    el.classList.remove('long-press');
                });
            }

            // 多选框
            const checkbox = e.target.closest('.st-select-checkbox');
            if (checkbox && State.isSelectMode) {
                const msgEl = checkbox.closest('.st-message');
                const id = msgEl?.dataset.id;
                const idx = parseInt(msgEl?.dataset.idx);
                const msgs = State.messages[State.chatId];

                if (id !== undefined && !isNaN(idx)) {
                    const wasSelected = State.selectedMessages.has(id);

                    if (wasSelected) {
                        // 如果已选中，取消选中该消息及之后的所有消息
                        for (let i = idx; i < msgs.length; i++) {
                            const msgId = msgs[i].id;
                            State.selectedMessages.delete(msgId);
                        }
                    } else {
                        // 如果未选中，选中该消息及之后的所有消息
                        for (let i = idx; i < msgs.length; i++) {
                            const msgId = msgs[i].id;
                            State.selectedMessages.add(msgId);
                        }
                    }

                    // 更新UI
                    document.querySelectorAll('.st-message').forEach(el => {
                        const elIdx = parseInt(el.dataset.idx);
                        const elId = el.dataset.id;
                        const elCheckbox = el.querySelector('.st-select-checkbox');

                        // 仅更新从idx开始的消息
                        if (elIdx >= idx) {
                            if (State.selectedMessages.has(elId)) {
                                el.classList.add('selected');
                                if (elCheckbox) elCheckbox.checked = true;
                            } else {
                                el.classList.remove('selected');
                                if (elCheckbox) elCheckbox.checked = false;
                            }
                        }
                    });

                    updateSelectCount();
                }
                return;
            }

            // 操作按钮
            const btn = e.target.closest('.st-action-btn');
            if (btn) {
                const id = btn.closest('.st-message')?.dataset.id;
                handleAction(btn.dataset.action, id);
                return;
            }

            // swipe切换
            const swipeBtn = e.target.closest('.st-swipe-btn');
            if (swipeBtn) {
                const id = swipeBtn.closest('.st-message')?.dataset.id;
                const dir = swipeBtn.dataset.dir;
                handleSwipe(id, dir);
            }
        });

        // 长按检测
        let longPressTimer = null;
        let isLongPress = false;

        document.getElementById('st-messages').addEventListener('touchstart', e => {
            if (State.isSelectMode) return;

            const msgEl = e.target.closest('.st-message');
            if (!msgEl || e.target.closest('.st-action-btn') || e.target.closest('.st-swipe-btn') || e.target.closest('.st-message-actions')) {
                return;
            }

            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                msgEl.classList.add('long-pressing');
            }, 500);
        }, { passive: true });

        document.getElementById('st-messages').addEventListener('touchend', e => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            const msgEl = e.target.closest('.st-message');
            if (msgEl) {
                msgEl.classList.remove('long-pressing');
            }

            if (isLongPress) {
                e.preventDefault();
                // 长按显示操作按钮
                if (msgEl) {
                    msgEl.classList.add('long-press');
                }
                // 震动反馈
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
            isLongPress = false;
        });

        document.getElementById('st-messages').addEventListener('touchmove', e => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            const msgEl = document.querySelector('.st-message.long-pressing');
            if (msgEl) {
                msgEl.classList.remove('long-pressing');
            }
        }, { passive: true });
    }

    // 导入对话文件
    async function importChatFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.messages && Array.isArray(data.messages)) {
                const msgs = State.messages[State.chatId] || [];
                const newMessages = data.messages.map(m => ({
                    ...m,
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                }));

                State.messages[State.chatId] = [...msgs, ...newMessages];
                save();
                render();
                showToast(`已导入 ${newMessages.length} 条消息`);
            } else {
                showToast('无效的导入文件格式');
            }
        } catch (err) {
            console.error('Import error:', err);
            showToast('导入失败: ' + err.message);
        }
    }
    
    // 清空聊天
    function clearChat() {
        if (State.streaming) return;
        if (!State.messages[State.chatId]?.length) return;
        showConfirm('确定要清空所有聊天记录吗？此操作无法撤销。', () => {
            State.messages[State.chatId] = [];
            save();
            render();
            showToast('已清空');
        });
    }
    
    // 继续生成
    function continueGen() {
        if (State.streaming) return;
        const msgs = State.messages[State.chatId];
        if (!msgs?.length) return;
        const last = msgs[msgs.length - 1];
        if (last.role !== 'char') return;
        callAI(null, true);
    }
    
    // 停止生成
    function stopGen() {
        if (State.abortController) {
            State.abortController.abort();
            State.abortController = null;
        }
    }
    
    // 代入角色
    function impersonate() {
        if (State.streaming) return;
        callAI(null, false, true);
    }
    
    // 生成开场白
    function generateFirstMsg() {
        if (State.streaming) return;
        if (State.messages[State.chatId]?.length) {
            showToast('请先清空聊天');
            return;
        }
        callAI(null, false, false, true);
    }
    
    // swipe切换
    function handleSwipe(id, dir) {
        if (State.streaming) return;
        const msgs = State.messages[State.chatId];
        const msg = msgs?.find(m => m.id === id);
        if (!msg?.swipes?.length) return;
        
        let idx = msg.swipeIndex ?? 0;
        if (dir === 'prev') idx = Math.max(0, idx - 1);
        else idx = Math.min(msg.swipes.length - 1, idx + 1);
        
        msg.swipeIndex = idx;
        save();
        render();
    }
    
    // 工具函数
    function scrollBottom() {
        const el = document.getElementById('st-messages');
        if (el) el.scrollTop = el.scrollHeight;
    }
    
    // 提取思维链 - 严格对齐SillyTavern的处理方式
    // 支持模板: <think>, <thinking>, <reasoning>, ```thinking, 【思考】, [思考]
    // 参考: ST reasoning.js -> parseReasoningFromString, extractReasoningFromData
    //       ST sse-stream.js -> parseStreamData
    //       ST openai.js -> getStreamingReply

    // ========== SillyTavern风格流式处理工具函数 ==========
    
    // 解析SSE chunk数据 (严格对齐ST的 getStreamingReply + parseStreamData)
    // 支持: Claude, Gemini, Cohere, DeepSeek, XAI, OpenRouter, Mistral, Ollama, NovelAI/KoboldCpp, llama.cpp等
    function parseSSEChunk(json) {
        let reasoning = '';
        let content = '';
        
        // === Claude格式 (ST: getStreamingReply -> chat_completion_sources.CLAUDE) ===
        // Claude SSE: delta.text (正文) / delta.thinking (思考)
        if (json?.delta?.text !== undefined || json?.delta?.thinking !== undefined) {
            reasoning = json.delta?.thinking || '';
            content = json.delta?.text || '';
            return (reasoning || content) ? { reasoning, content } : null;
        }
        
        // === Cohere格式 (ST: getStreamingReply -> chat_completion_sources.COHERE) ===
        if (typeof json?.delta === 'object' && typeof json?.delta?.message === 'object' 
            && ['tool-plan-delta', 'content-delta'].includes(json?.type)) {
            content = json.delta?.message?.content?.text || json.delta?.message?.tool_plan || '';
            return content ? { reasoning: '', content } : null;
        }
        
        // === Gemini格式 (ST: getStreamingReply -> MAKERSUITE/VERTEXAI) ===
        // candidates[].content.parts[] 中 thought=true 的是 reasoning
        if (Array.isArray(json?.candidates)) {
            const parts = json.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part?.thought && part?.text) {
                    reasoning += part.text;
                } else if (part?.text) {
                    content += part.text;
                }
            }
            return (reasoning || content) ? { reasoning, content } : null;
        }
        
        // === NovelAI/KoboldCpp格式 (ST: parseStreamData -> json.token) ===
        if (typeof json?.token === 'string') {
            return json.token ? { reasoning: '', content: json.token } : null;
        }
        
        // === llama.cpp格式: content (非chat.completion.chunk) ===
        if (typeof json?.content === 'string' && json?.object !== 'chat.completion.chunk') {
            return json.content ? { reasoning: '', content: json.content } : null;
        }
        
        // === Ollama格式 (ST: textgen_settings -> thinking + response) ===
        if (json?.thinking !== undefined || json?.response !== undefined) {
            reasoning = json.thinking || '';
            content = json.response || '';
            return (reasoning || content) ? { reasoning, content } : null;
        }
        
        // === OpenAI-likes格式: choices[] ===
        if (Array.isArray(json?.choices) && json.choices.length > 0) {
            const choice = json.choices[0];
            
            // --- 流式delta格式 ---
            if (choice?.delta) {
                const d = choice.delta;
                
                // DeepSeek/XAI: delta.reasoning_content (ST: getStreamingReply)
                reasoning = d.reasoning_content || '';
                
                // OpenRouter: delta.reasoning (ST: getStreamingReply -> OPENROUTER)
                if (!reasoning && typeof d.reasoning === 'string') {
                    reasoning = d.reasoning;
                }
                
                // Ollama via choices: choice.thinking (ST: textgen_settings)
                if (!reasoning && typeof choice.thinking === 'string') {
                    reasoning = choice.thinking;
                }
                
                // Mistral格式 (ST: getStreamingReply -> MISTRALAI): delta.content是数组，含thinking
                if (Array.isArray(d.content)) {
                    const thinkParts = d.content.filter(x => x?.thinking);
                    const textParts = d.content.filter(x => typeof x?.text === 'string' && !x?.thinking);
                    if (thinkParts.length > 0) {
                        reasoning += thinkParts.map(x => {
                            if (Array.isArray(x.thinking)) {
                                return x.thinking.map(t => t.text || '').join('');
                            }
                            return '';
                        }).join('');
                    }
                    content = textParts.map(x => x.text).join('');
                } else {
                    content = d.content || '';
                }
                
                // Custom/通用: reasoning_content 或 reasoning (ST: CUSTOM/POLLINATIONS/AIMLAPI等)
                if (!reasoning) {
                    reasoning = d.reasoning_content || d.reasoning || '';
                }
                
                return (reasoning || content) ? { reasoning, content } : null;
            }
            
            // --- 非流式message格式 (某些API在SSE中也会发送完整message) ---
            if (choice?.message) {
                const m = choice.message;
                
                // DeepSeek: message.reasoning_content
                reasoning = m.reasoning_content || '';
                // OpenRouter: message.reasoning
                if (!reasoning) reasoning = m.reasoning || '';
                
                // Claude非流式 (ST: extractReasoningFromData -> CLAUDE)
                // content数组中 type==='thinking' 的部分
                if (!reasoning && Array.isArray(m.content)) {
                    const thinkingPart = m.content.find(x => x?.type === 'thinking');
                    if (thinkingPart?.thinking) {
                        reasoning = thinkingPart.thinking;
                    }
                }
                
                // Mistral非流式: content数组含thinking
                if (Array.isArray(m.content)) {
                    const thinkParts = m.content.filter(x => x?.thinking);
                    const textParts = m.content.filter(x => typeof x?.text === 'string' && !x?.thinking);
                    if (thinkParts.length > 0) {
                        reasoning += thinkParts.map(x => {
                            if (Array.isArray(x.thinking)) {
                                return x.thinking.map(t => t.text || '').filter(Boolean).join('\n\n');
                            }
                            return '';
                        }).join('');
                    }
                    content = textParts.map(x => x.text).join('');
                } else {
                    content = m.content || '';
                }
                return (reasoning || content) ? { reasoning, content } : null;
            }
            
            // text completion格式
            if (typeof choice?.text === 'string') {
                return choice.text ? { reasoning: '', content: choice.text } : null;
            }
        }
        
        return null;
    }
    
    // 组合reasoning和content为最终显示内容（使用当前模板的prefix/suffix）
    function composeContent(reasoning, content, isThinking) {
        const tmpl = getCurrentReasoningTemplate();
        let result = '';
        if (reasoning) {
            result = isThinking ? `${tmpl.prefix}${reasoning}` : `${tmpl.prefix}${reasoning}${tmpl.suffix}`;
        }
        result += content;
        return result;
    }
    
    // ST风格平滑延迟: 基于前一个字符类型计算延迟 (对应ST的getDelay)
    function getSmoothDelay(lastChar) {
        if (!lastChar) return 0;
        // 标点符号延迟更长，模拟自然阅读节奏
        if (/[.。!！?？]/.test(lastChar)) return 30;
        if (/[,，;；:：、]/.test(lastChar)) return 20;
        if (/[\n\r]/.test(lastChar)) return 25;
        if (/\s/.test(lastChar)) return 8;
        return 5; // 普通字符
    }
    
    // 非流式响应的平滑打字机 (模拟ST的SmoothEventSourceStream对非流式的处理)
    async function smoothTypewriter(aiMsg, reasoning, content) {
        const isAborted = () => !State.streaming || State.abortController?.signal?.aborted;
        let currentReasoning = '';
        let currentContent = '';
        let lastChar = '';
        
        // 阶段1: reasoning
        if (reasoning) {
            for (let i = 0; i < reasoning.length; i++) {
                if (isAborted()) {
                    writeToMsg(aiMsg, composeContent(reasoning, content, false));
                    updateStreamingMsg(aiMsg);
                    return;
                }
                currentReasoning += reasoning[i];
                writeToMsg(aiMsg, composeContent(currentReasoning, currentContent, true));
                updateStreamingMsg(aiMsg);
                await sleep(getSmoothDelay(lastChar));
                lastChar = reasoning[i];
            }
        }
        
        // 阶段2: content
        if (content) {
            for (let i = 0; i < content.length; i++) {
                if (isAborted()) {
                    writeToMsg(aiMsg, composeContent(reasoning, content, false));
                    updateStreamingMsg(aiMsg);
                    return;
                }
                currentContent += content[i];
                writeToMsg(aiMsg, composeContent(reasoning || currentReasoning, currentContent, false));
                updateStreamingMsg(aiMsg);
                await sleep(getSmoothDelay(lastChar));
                lastChar = content[i];
            }
        }
        
        // 确保最终完整
        writeToMsg(aiMsg, composeContent(reasoning, content, false));
        updateStreamingMsg(aiMsg);
    }
    
    function writeToMsg(aiMsg, text) {
        const finalText = State.isContinuing && State.originalContent ? State.originalContent + text : text;
        if (aiMsg.swipes) {
            aiMsg.swipes[aiMsg.swipeIndex] = finalText;
        } else {
            aiMsg.content = finalText;
        }
    }
    
    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // === ST风格: 基于模板的思维链解析 (对齐 reasoning.js -> parseReasoningFromString) ===
    // 对齐ST reasoning.js: reasoning_templates 从预设管理器加载
    // === 对齐ST: ReasoningTemplate = {name, prefix, suffix, separator} ===
    const REASONING_TEMPLATES = [
        { name: 'DeepSeek', prefix: '<think>', suffix: '</think>', separator: '' },
        { name: 'Claude', prefix: '<thinking>', suffix: '</thinking>', separator: '' },
        { name: 'Reasoning', prefix: '<reasoning>', suffix: '</reasoning>', separator: '' },
        { name: 'CodeBlock', prefix: '```thinking\n', suffix: '```', separator: '' },
        { name: 'Chinese1', prefix: '【思考】', suffix: '【/思考】', separator: '' },
        { name: 'Chinese2', prefix: '[思考]', suffix: '[/思考]', separator: '' },
        // 对齐ST: 更多模板
        { name: 'QwQ', prefix: '<think>', suffix: '</think>', separator: '' },
        { name: 'Gemini', prefix: '<thinking>', suffix: '</thinking>', separator: '' },
        { name: 'Custom', prefix: '', suffix: '', separator: '' },
    ];

    // 当前选中的reasoning模板 - 对齐ST power_user.reasoning
    // 优先从STPresetManager读取，否则使用本地默认
    const reasoningSettings = {
        get name() { return window.STPresetManager?.getReasoningSettings?.()?.name || 'DeepSeek'; },
        get prefix() { return window.STPresetManager?.getReasoningSettings?.()?.prefix || '<think>'; },
        get suffix() { return window.STPresetManager?.getReasoningSettings?.()?.suffix || '</think>'; },
        get separator() { return window.STPresetManager?.getReasoningSettings?.()?.separator || ''; },
        get auto_parse() { return window.STPresetManager?.getReasoningSettings?.()?.auto_parse !== false; },
        get add_to_prompts() { return window.STPresetManager?.getReasoningSettings?.()?.add_to_prompts || false; },
        get max_additions() { return window.STPresetManager?.getReasoningSettings?.()?.max_additions || 1; },
        get auto_expand() { return window.STPresetManager?.getReasoningSettings?.()?.auto_expand || false; },
        get show_hidden() { return window.STPresetManager?.getReasoningSettings?.()?.show_hidden || false; },
    };

    // 获取当前reasoning模板 - 对齐ST: power_user.reasoning
    function getCurrentReasoningTemplate() {
        return {
            name: reasoningSettings.name,
            prefix: reasoningSettings.prefix,
            suffix: reasoningSettings.suffix,
            separator: reasoningSettings.separator,
        };
    }

    /**
     * 对齐ST的 parseReasoningFromString (reasoning.js L1305-L1334):
     * - 默认 strict=true（reasoning必须在字符串开头）
     * - 只使用当前选中的单一模板（不遍历所有模板）
     * - didReplace时总是返回结果（即使reasoning为空）
     */
    function parseReasoningFromString(str, { strict = true } = {}, template = null) {
        if (!str) return null;
        
        template = template ?? getCurrentReasoningTemplate();
        
        // ST: Both prefix and suffix must be defined
        if (!template.prefix || !template.suffix) {
            return null;
        }
        
        try {
            const escPrefix = template.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escSuffix = template.suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(
                `${strict ? '^\\s*?' : ''}${escPrefix}(.*?)${escSuffix}`,
                's'
            );
            
            let didReplace = false;
            let reasoning = '';
            let content = String(str).replace(regex, (_match, captureGroup) => {
                didReplace = true;
                reasoning = captureGroup;
                return '';
            });
            
            // ST: didReplace时执行trimSpaces并总是返回
            if (didReplace) {
                reasoning = reasoning.trim();
                content = content.trim();
            }
            
            return { reasoning, content };
        } catch (e) {
            console.error('[Reasoning] Error parsing reasoning block', e);
            return null;
        }
    }

    /**
     * 对齐ST: extractReasoningFromData (reasoning.js L98-L144)
     * 从API响应数据中提取reasoning，支持多种API格式
     */
    function extractReasoningFromData(data) {
        if (!data) return '';
        
        // Ollama格式
        if (data.thinking !== undefined) return data.thinking || '';
        
        // Gemini格式
        if (Array.isArray(data.responseContent?.parts)) {
            return data.responseContent.parts
                .filter(part => part.thought)
                .map(part => part.text)
                .join('\n\n') || '';
        }
        
        // Claude原生格式
        if (Array.isArray(data.content)) {
            const thinkingPart = data.content.find(part => part.type === 'thinking');
            return thinkingPart?.thinking || '';
        }
        
        // OpenAI-likes choices格式
        const choice = data.choices?.[0];
        if (choice?.message) {
            const m = choice.message;
            // DeepSeek/XAI
            if (m.reasoning_content) return m.reasoning_content;
            // OpenRouter
            if (m.reasoning) return m.reasoning;
            if (choice.reasoning) return choice.reasoning;
            // Mistral
            if (Array.isArray(m.content)) {
                const thinkParts = m.content.filter(x => x?.thinking);
                if (thinkParts.length > 0) {
                    return thinkParts.map(x => {
                        if (Array.isArray(x.thinking)) {
                            return x.thinking.map(t => t.text || '').filter(Boolean).join('\n\n');
                        }
                        return '';
                    }).join('');
                }
            }
        }
        
        return '';
    }

    /**
     * 对齐ST: extractThinking 只使用当前模板解析，不遍历所有模板
     * 流式中间状态(allowOpen)时使用当前模板的prefix匹配未闭合标签
     */
    function extractThinking(text, allowOpen = false) {
        if (!text) return '';

        // 使用当前模板解析闭合的思考块
        const parsed = parseReasoningFromString(text, { strict: false });
        if (parsed?.reasoning) {
            return parsed.reasoning;
        }
        
        // 允许未闭合时（流式中间状态），匹配当前模板的未闭合标签
        if (allowOpen) {
            const tmpl = getCurrentReasoningTemplate();
            if (tmpl.prefix) {
                const escPrefix = tmpl.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const openRegex = new RegExp(`${escPrefix}([\\s\\S]*)$`, 'i');
                const match = text.match(openRegex);
                if (match?.[1]?.trim()) {
                    return match[1].trim();
                }
            }
        }

        return '';
    }
    
    /**
     * 对齐ST的 removeReasoningFromString (reasoning.js L1268-L1280):
     * 只使用当前模板移除reasoning，不遍历所有模板
     */
    function removeThinking(text) {
        if (!text) return '';
        
        const parsed = parseReasoningFromString(text, { strict: false });
        if (parsed) {
            return parsed.content;
        }
        
        // fallback: 移除当前模板的未闭合标签
        const tmpl = getCurrentReasoningTemplate();
        if (tmpl.prefix) {
            const escPrefix = tmpl.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            text = text.replace(new RegExp(`${escPrefix}[\\s\\S]*$`, 'i'), '');
        }
        return text.trim();
    }

    // 流式更新消息DOM
    function updateStreamingMsg(msg) {
        let el = document.querySelector(`[data-id="${msg.id}"] .st-message-content`);

        // 如果元素不存在，先渲染
        if (!el) {
            render();
            el = document.querySelector(`[data-id="${msg.id}"] .st-message-content`);
            if (!el) return;
        }

        // 读取当前内容（支持swipe）
        let content = msg.swipes ? (msg.swipes[msg.swipeIndex ?? 0] || '') : (msg.content || '');
        // 应用正则替换（仅AI消息）
        if (msg.role !== 'user' && content) {
            content = window.STPresetManager?.applyRegexReplacements?.(content) || content;
        }
        const thinking = extractThinking(content, true);
        if (thinking) content = removeThinking(content);

        // 更新思维链区域
        const msgEl = el.closest('.st-message');
        let toggleEl = msgEl.querySelector('.st-thinking-toggle');
        let thinkEl = msgEl.querySelector('.st-thinking-content');

        if (thinking && !toggleEl) {
            const header = msgEl.querySelector('.st-message-header');
            toggleEl = document.createElement('div');
            toggleEl.className = 'st-thinking-toggle';
            toggleEl.innerHTML = `
                <span class="st-thinking-icon"></span>
            `;

            thinkEl = document.createElement('div');
            thinkEl.className = 'st-thinking-content';

            toggleEl.onclick = function() {
                this.classList.toggle('expanded');
                thinkEl.classList.toggle('show');
            };

            header.after(toggleEl, thinkEl);
        }

        if (thinkEl) thinkEl.innerHTML = renderMarkdown(thinking) || '';
        el.innerHTML = renderMarkdown(content) + '<span class="st-cursor"></span>';

        console.log('[Stream]', { thinking: thinking?.slice(0,50), content: content?.slice(0,50) });
        scrollBottom();
    }

    function formatTime(iso) {
        const d = new Date(iso);
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 转义HTML
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // 简单的Markdown渲染 - 完整版
    function renderMarkdown(text) {
        if (!text) return '';

        // 保存代码块不被处理
        const codeBlocks = [];
        text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            codeBlocks.push({ lang, code });
            return `__CODEBLOCK_${codeBlocks.length - 1}__`;
        });

        // 保存行内代码不被处理
        const inlineCodes = [];
        text = text.replace(/`([^`]+)`/g, (match, code) => {
            inlineCodes.push(code);
            return `__INLINECODE_${inlineCodes.length - 1}__`;
        });

        // 转义HTML
        let html = text;
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // 标题 #
        html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
        html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 粗体 **text** 或 __text__
        html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        // 斜体 *text* 或 _text_
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

        // 删除线 ~~text~~
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        // 处理双引号 - 完全参考粗体的模式
        // 英文双引号 "text" - 使用与粗体相同的模式 [^分隔符]+
        html = html.replace(/"([^\"]+)"/g, '<span class="st-quote-mark">"$1"</span>');
        // 中文双引号 "text" - 使用Unicode码点确保正确匹配
        html = html.replace(/\u201c([^\u201d]+)\u201d/g, '<span class="st-quote-mark">"$1"</span>');
        
        // 水平线
        html = html.replace(/^---$/gm, '<hr>');
        html = html.replace(/^\*\*\*$/gm, '<hr>');

        // 无序列表 * item
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // 有序列表 1. item
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

        // 引用 > text
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // 链接 [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // 图片 ![alt](url)
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;">');

        // 恢复行内代码
        html = html.replace(/__INLINECODE_(\d+)__/g, (match, index) => {
            return `<code>${inlineCodes[index]}</code>`;
        });

        // 恢复代码块
        html = html.replace(/__CODEBLOCK_(\d+)__/g, (match, index) => {
            const block = codeBlocks[index];
            const lang = block.lang || '';
            return `<pre><code class="language-${lang}">${block.code}</code></pre>`;
        });

        return html;
    }
    
    // 显示Toast
    function showToast(msg) {
        if (window.showToast) {
            window.showToast(msg);
            return;
        }

        // 创建自定义Toast
        let toast = document.querySelector('.st-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'st-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = msg;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // ==================== 主题管理 ====================

    // 应用主题
    function applyTheme() {
        const page = document.getElementById('st-chat-page');
        if (!page) return;

        // 移除所有主题类
        page.classList.remove('theme-dark', 'theme-light', 'theme-girly');
        // 添加当前主题类
        page.classList.add('theme-' + State.theme);

        // 应用自定义背景图
        if (State.customBackground) {
            page.style.backgroundImage = `url(${State.customBackground})`;
            page.style.backgroundSize = 'cover';
            page.style.backgroundPosition = 'center';
            page.style.backgroundRepeat = 'no-repeat';
        } else {
            page.style.backgroundImage = '';
        }
    }

    // 设置主题
    function setTheme(themeName) {
        State.theme = themeName;
        applyTheme();
        save();
        showToast(`已切换到${getThemeDisplayName(themeName)}主题`);
    }

    // 获取主题显示名称
    function getThemeDisplayName(theme) {
        const names = {
            'dark': '夜间',
            'light': '日间',
            'girly': '少女'
        };
        return names[theme] || theme;
    }

    // 设置自定义背景图
    function setCustomBackground(imageUrl) {
        State.customBackground = imageUrl;
        applyTheme();
        save();
        showToast('背景图已更新');
    }

    // 显示主题模态框
    function showThemeModal() {
        const modal = document.createElement('div');
        modal.className = 'st-modal-overlay';
        modal.innerHTML = `
            <div class="st-modal-box">
                <div class="st-modal-header">
                    <h3>主题设置</h3>
                    <button class="st-modal-close" id="st-modal-close">×</button>
                </div>
                <div class="st-modal-body">
                    <!-- 主题选择 -->
                    <div class="st-form-group">
                        <label class="st-form-label">选择主题</label>
                        <div class="st-theme-options">
                            <div class="st-theme-option ${State.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                                <div class="st-theme-preview st-theme-dark"></div>
                                <span>夜间主题</span>
                            </div>
                            <div class="st-theme-option ${State.theme === 'light' ? 'active' : ''}" data-theme="light">
                                <div class="st-theme-preview st-theme-light"></div>
                                <span>日间主题</span>
                            </div>
                            <div class="st-theme-option ${State.theme === 'girly' ? 'active' : ''}" data-theme="girly">
                                <div class="st-theme-preview st-theme-girly"></div>
                                <span>少女主题</span>
                            </div>
                        </div>
                    </div>

                    <!-- 消息布局选择 -->
                    <div class="st-form-group">
                        <label class="st-form-label">消息布局</label>
                        <div class="st-layout-options">
                            <div class="st-layout-option ${State.messageLayout === 'default' ? 'active' : ''}" data-layout="default">
                                <div class="st-layout-preview st-layout-default"></div>
                                <span>默认布局</span>
                            </div>
                            <div class="st-layout-option ${State.messageLayout === 'centered' ? 'active' : ''}" data-layout="centered">
                                <div class="st-layout-preview st-layout-centered"></div>
                                <span>居中布局</span>
                            </div>
                        </div>
                    </div>

                    <!-- 自定义背景图 -->
                    <div class="st-form-group">
                        <label class="st-form-label">背景图片</label>
                        <input type="text" id="st-bg-input" class="st-form-input" 
                               placeholder="输入图片URL" value="${State.customBackground || ''}">
                        <div class="st-form-hint">支持本地路径或网络URL</div>
                        <div class="st-bg-actions">
                            <button class="st-btn secondary" id="st-select-bg-btn" style="margin-top: 8px;">选择本地图片</button>
                            <button class="st-btn secondary" id="st-clear-bg-btn" style="margin-top: 8px;">清除背景</button>
                        </div>
                    </div>

                    <button class="st-btn primary" id="st-theme-close-btn">完成</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 关闭按钮
        const closeModal = () => modal.remove();
        modal.querySelector('#st-modal-close').onclick = closeModal;
        modal.querySelector('#st-theme-close-btn').onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // 主题选择
        modal.querySelectorAll('.st-theme-option').forEach(option => {
            option.onclick = () => {
                const theme = option.dataset.theme;
                setTheme(theme);
                modal.querySelectorAll('.st-theme-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
            };
        });

        // 消息布局选择
        modal.querySelectorAll('.st-layout-option').forEach(option => {
            option.onclick = () => {
                const layout = option.dataset.layout;
                setMessageLayout(layout);
                modal.querySelectorAll('.st-layout-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
            };
        });

        // 背景图输入
        const bgInput = modal.querySelector('#st-bg-input');
        bgInput.onchange = () => {
            const url = bgInput.value.trim();
            if (url) {
                setCustomBackground(url);
            }
        };

        // 选择本地图片
        modal.querySelector('#st-select-bg-btn').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setCustomBackground(event.target.result);
                        bgInput.value = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };

        // 清除背景
        modal.querySelector('#st-clear-bg-btn').onclick = () => {
            State.customBackground = null;
            applyTheme();
            save();
            bgInput.value = '';
            showToast('背景图已清除');
        };
    }

    // 设置消息布局
    function setMessageLayout(layout) {
        State.messageLayout = layout;
        applyMessageLayout();
        save();
        showToast(`已切换到${layout === 'default' ? '默认' : '居中'}布局`);
    }

    // 应用消息布局
    function applyMessageLayout() {
        const page = document.getElementById('st-chat-page');
        if (!page) return;

        page.classList.remove('layout-default', 'layout-centered');
        page.classList.add('layout-' + State.messageLayout);
    }

    // 初始化
    load();
    window.OfflineChat = {
        open, close,
        // 暴露reasoning设置供外部使用
        reasoningSettings,
        REASONING_TEMPLATES,
        // 对齐ST: 选择reasoning模板并同步到STPresetManager
        setReasoningTemplate(name) {
            const tmpl = REASONING_TEMPLATES.find(t => t.name === name);
            if (tmpl) {
                // 同步到STPresetManager的reasoning设置
                window.STPresetManager?.setReasoningSettings?.({
                    name: tmpl.name,
                    prefix: tmpl.prefix,
                    suffix: tmpl.suffix,
                    separator: tmpl.separator,
                });
            }
        },
        // 对齐ST: 获取reasoning模板列表
        getReasoningTemplates() {
            return REASONING_TEMPLATES;
        },
        // 对齐ST: parseReasoningFromString
        parseReasoningFromString,
        // 对齐ST: extractReasoningFromData
        extractReasoningFromData,
        // 对齐ST: removeReasoningFromString
        removeThinking,
    };
})();
