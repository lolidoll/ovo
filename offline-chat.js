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
        theme: 'girly', // 主题: dark, light, girly
        customBackground: null, // 自定义背景图
        messageLayout: 'centered', // 消息布局: default (默认), centered (居中)
        stickToBottom: true, // 是否跟随到底部（用户上滑查看历史后会关闭）
        summaryInProgress: false, // 防止线下总结重复触发
        summaryEnabled: true,
        summaryInterval: 50,
        summaryKeepLatest: 10
    };

    function getActiveChatId() {
        return State.chatId || window.AppState?.currentChat?.id || null;
    }

    function getConversationById(chatId) {
        if (!chatId) return null;
        const conversations = window.AppState?.conversations || [];
        const conv = conversations.find(c => String(c?.id) === String(chatId));
        if (conv) return conv;
        const current = window.AppState?.currentChat;
        if (current && String(current?.id) === String(chatId)) return current;
        return null;
    }

    function getUserPersonaForChat(chatId) {
        try {
            return window.UserPersonaManager?.getPersonaForConversation?.(chatId) || null;
        } catch (e) {
            return null;
        }
    }

    function resolveNamePlaceholders(text, userName, charName) {
        if (!text || typeof text !== 'string') return text || '';
        if (window.MainAPIManager?.replaceNamePlaceholders) {
            return window.MainAPIManager.replaceNamePlaceholders(text, userName, charName);
        }
        if (window.replaceNamePlaceholders) {
            return window.replaceNamePlaceholders(text, userName, charName);
        }
        return text
            .replace(/\{\{user\}\}/g, userName || '')
            .replace(/\{\{char\}\}/g, charName || '');
    }

    function getConversationContext(chatId = getActiveChatId()) {
        const conv = getConversationById(chatId);
        const persona = getUserPersonaForChat(chatId);
        const userNameForChar = persona?.userName || conv?.userNameForChar || window.AppState?.user?.name || '用户';
        const userPersonalityRaw = persona?.personality || conv?.userPersonality || window.AppState?.user?.personality || '';
        const charName = conv?.name || '角色';
        return {
            chatId,
            conv,
            persona,
            charName,
            charRemark: conv?.remark || charName,
            charDescription: conv?.description || '',
            charNickname: (conv?.charNickname || '').trim(),
            userNameForChar,
            userPersonality: resolveNamePlaceholders(userPersonalityRaw, userNameForChar, charName),
            userNicknameForChar: (conv?.userNicknameForChar || window.AppState?.user?.nickname || '').trim(),
        };
    }

    function getActiveChat() {
        const chatId = getActiveChatId();
        return getConversationById(chatId);
    }
    
    // 加载/保存数据
    function load() {
        try {
            const d = localStorage.getItem('stOfflineData');
            if (d) {
                const data = JSON.parse(d);
                State.messages = data.messages || {};
                State.theme = data.theme || 'girly';
                State.customBackground = data.customBackground || null;
                State.messageLayout = data.messageLayout || 'centered';
                State.summaryEnabled = data.summaryEnabled !== undefined ? !!data.summaryEnabled : State.summaryEnabled;
                State.summaryInterval = Number.isFinite(data.summaryInterval) ? data.summaryInterval : State.summaryInterval;
                State.summaryKeepLatest = Number.isFinite(data.summaryKeepLatest) ? data.summaryKeepLatest : State.summaryKeepLatest;
            }
        } catch(e) {}
    }
    
    function save() {
        try {
            localStorage.setItem('stOfflineData', JSON.stringify({
                messages: State.messages,
                theme: State.theme,
                customBackground: State.customBackground,
                messageLayout: State.messageLayout,
                summaryEnabled: State.summaryEnabled,
                summaryInterval: State.summaryInterval,
                summaryKeepLatest: State.summaryKeepLatest
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
        updateNav(getConversationContext(State.chatId));
        applyTheme(); // 应用主题
        applyMessageLayout(); // 应用消息布局
        render();
        
        document.getElementById('st-chat-page').classList.add('show');
        State.isOpen = true;
        State.stickToBottom = true;
        scrollBottom(true);
    }
    
    function close() {
        document.getElementById('st-chat-page')?.classList.remove('show');
        save();
        State.isOpen = false;
        State.isSelectMode = false;
        State.selectedMessages.clear();
        State.stickToBottom = true;
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
            </div>
            <div class="st-input-area">
                <div class="st-input-actions">
                    <button class="st-input-action-btn" id="st-retry-btn" title="重试最后一条">重试</button>
                    <button class="st-input-action-btn" id="st-scroll-top-btn" title="回到顶部">回顶</button>
                    <button class="st-input-action-btn" id="st-scroll-bottom-btn" title="回到最新楼层顶部">回底</button>
                    <button class="st-input-action-btn" id="st-jump-floor-btn" title="回到任意楼层">回到任意楼层</button>
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
    
    function updateNav(context) {
        const conv = context?.conv || context;
        const avatar = document.getElementById('st-nav-avatar');
        const name = document.getElementById('st-nav-name');
        if (avatar) avatar.innerHTML = conv?.avatar ? `<img src="${conv.avatar}">` : '';
        if (name) name.textContent = context?.charRemark || conv?.remark || conv?.name || '线下聊天';
    }
    
    // 渲染消息
    function render() {
        const container = document.getElementById('st-messages');
        if (!container || !State.chatId) return;

        const msgs = State.messages[State.chatId] || [];
        const context = getConversationContext(State.chatId);
        if (!context?.conv) return;
        const charAvatar = context.conv?.avatar || '';
        const userAvatar = context.conv?.userAvatar || window.AppState?.user?.avatar || '';
        const charName = context.charRemark || context.charName || '角色';
        const userName = context.userNameForChar || window.AppState?.user?.name || '我';
        const isCentered = State.messageLayout === 'centered';

        // 更新token统计
        updateTokenStats(msgs);

        // 空消息时不显示初始提示文案
        if (!msgs.length) {
            container.innerHTML = '';
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

            // 线下模块默认折叠思维链，不自动展开
            const reasoningDuration = m.extra?.reasoning_duration;
            const durationText = reasoningDuration 
                ? `${(reasoningDuration / 1000).toFixed(1)}s` 
                : '';
            const autoExpanded = '';
            const autoShow = '';

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
        State.stickToBottom = true;
        scrollBottom(true);
        
        setTimeout(() => callAI(), 300);
    }

    function getOfflineMessageContent(msg) {
        if (!msg) return '';
        if (msg.swipes && msg.swipes.length) {
            const idx = msg.swipeIndex ?? 0;
            return msg.swipes[idx] || msg.content || '';
        }
        return msg.content || '';
    }

    function buildOfflineConversationText(msgs, conv) {
        const context = getConversationContext(conv?.id || State.chatId);
        const charName = context?.charName || conv?.name || '角色';
        const userName = context?.userNameForChar || window.AppState?.user?.name || '用户';
        return (msgs || []).map(m => {
            const content = getOfflineMessageContent(m);
            if (!content) return '';
            return m.role === 'user' ? `${userName}: ${content}` : `${charName}: ${content}`;
        }).filter(Boolean).join('\n');
    }

    function buildMemoryShardsPrompt(conv) {
        if (!conv?.summaries || conv.summaries.length === 0) return '';
        const summariesContent = conv.summaries.map((s, idx) => {
            const type = s.isAutomatic ? '自动总结' : '手动总结';
            const time = s.timestamp ? new Date(s.timestamp).toLocaleString('zh-CN') : '未知时间';
            const count = s.messageCount || '?';
            return `【${type} #${idx + 1}】(${time}, 基于${count}条消息)\n${s.content}`;
        }).join('\n\n');
        return `【对话历史总结】\n以下是之前对话的总结，帮助你了解上下文背景：\n\n${summariesContent}`;
    }

    function insertMemoryShardsPrompt(apiMsgs, conv) {
        const memoryPrompt = buildMemoryShardsPrompt(conv);
        if (!memoryPrompt) return;
        const insertIndex = apiMsgs.findIndex(m => m.role === 'system');
        const targetIndex = insertIndex >= 0 ? insertIndex + 1 : 0;
        apiMsgs.splice(targetIndex, 0, { role: 'system', content: memoryPrompt });
    }

    function buildCharacterContextPrompt(context) {
        if (!context?.conv) return '';
        const lines = [];
        if (context.charName) lines.push(`角色名称：${context.charName}`);
        if (context.charDescription) {
            const desc = resolveNamePlaceholders(context.charDescription, context.userNameForChar, context.charName);
            if (desc.trim()) lines.push(`角色设定：${desc}`);
        }
        if (context.userNameForChar) lines.push(`用户名称：${context.userNameForChar}`);
        if (context.userPersonality) lines.push(`用户设定：${context.userPersonality}`);
        if (!lines.length) return '';
        return `【角色与用户设定】\n${lines.join('\n')}`;
    }

    function insertCharacterContextPrompt(apiMsgs, context) {
        const prompt = buildCharacterContextPrompt(context);
        if (!prompt) return;
        const insertIndex = apiMsgs.findIndex(m => m.role === 'system');
        const targetIndex = insertIndex >= 0 ? insertIndex + 1 : 0;
        apiMsgs.splice(targetIndex, 0, { role: 'system', content: prompt });
    }

    function markOfflineMessagesSummarized(msgs) {
        const keepLatest = Number.isFinite(State.summaryKeepLatest) ? State.summaryKeepLatest : 10;
        if (!Array.isArray(msgs) || keepLatest <= 0 || msgs.length <= keepLatest) return 0;
        const oldMessages = msgs.slice(0, msgs.length - keepLatest);
        let marked = 0;
        oldMessages.forEach(m => {
            if (!m.isSummarized) {
                m.isSummarized = true;
                marked += 1;
            }
        });
        return marked;
    }

    function checkAndAutoSummarizeOffline() {
        if (State.summaryInProgress) return;
        if (!State.summaryEnabled) return;
        const msgs = State.messages[State.chatId] || [];
        if (!msgs.length) return;
        const summaryInterval = Number.isFinite(State.summaryInterval) ? State.summaryInterval : 50;
        const unsummarizedCount = msgs.filter(m => !m.isSummarized).length;
        if (unsummarizedCount >= summaryInterval) {
            setTimeout(() => generateSummary(true), 300);
        }
    }
    
    // 调用AI
    async function callAI(swipeIdx = null) {
        const input = document.getElementById('st-input');
        const sendBtn = document.getElementById('st-send');
        const typing = document.getElementById('st-typing');
        const stopBtn = document.getElementById('st-stop-btn');
        
        if (input) { input.disabled = true; input.placeholder = ''; }
        if (sendBtn) sendBtn.disabled = true;
        if (typing) typing.classList.add('show');
        if (stopBtn) stopBtn.style.display = 'inline-block';
        
        State.abortController = new AbortController();
        
        try {
            const api = window.AppState?.apiSettings;
            if (!api?.endpoint || !api?.selectedModel) throw new Error('请先配置API');
            
            const context = getConversationContext(State.chatId);
            const conv = context?.conv;
            if (!conv) throw new Error('请先打开一个聊天');
            const charName = context.charName || 'Assistant';
            const userName = context.userNameForChar || 'User';
            
            const summaryEnabled = !!State.summaryEnabled;
            const summaryKeepLatest = State.summaryKeepLatest;
            const summaryRetentionEnabled = summaryEnabled
                || (Number.isFinite(summaryKeepLatest) && summaryKeepLatest > 0);

            // 收集聊天历史
            const chatHistory = [];
            
            // 线上消息历史
            const convId = conv.id ?? State.chatId;
            const online = window.AppState?.messages?.[convId] || [];
            online.slice(-50).forEach(m => {
                if (m.type === 'sent') chatHistory.push({ role: 'user', content: m.content || '' });
                else if (m.type === 'received') chatHistory.push({ role: 'assistant', content: m.content || '' });
            });
            
            // 线下消息（swipe模式时不包含当前AI消息）
            const msgs = State.messages[State.chatId] || [];
            const limit = swipeIdx !== null ? swipeIdx : msgs.length;
            msgs.slice(0, limit).forEach(m => {
                if (summaryRetentionEnabled && m.isSummarized) return;
                const c = getOfflineMessageContent(m);
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

            // 添加记忆区总结内容（角色隔离）
            insertMemoryShardsPrompt(apiMsgs, conv);

            // 添加角色与人设信息（确保读取当前角色设置）
            insertCharacterContextPrompt(apiMsgs, context);
            
            // 添加线下世界书内容
            if (window.WorldbookManager?.getOfflineWorldbooksContent) {
                const wbContent = window.WorldbookManager.getOfflineWorldbooksContent();
                if (wbContent) {
                    apiMsgs.splice(1, 0, { role: 'system', content: `[World Info]\n${wbContent}` });
                }
            }
            
            // 添加线下时间感知
            if (window.AppState?.apiSettings?.offlineTimeAware) {
                const now = new Date();
                const timeStr = `Current date and time: ${now.toLocaleString()}`;
                apiMsgs.push({ role: 'system', content: timeStr });
            }
            
            // 创建或更新AI消息
            let aiMsg;
            if (swipeIdx !== null) {
                aiMsg = msgs[swipeIdx];
                aiMsg.swipes.push('');
                aiMsg.swipeIndex = aiMsg.swipes.length - 1;
            } else {
                aiMsg = { id: 'msg_' + Date.now(), role: 'char', content: '', timestamp: new Date().toISOString() };
                State.messages[State.chatId].push(aiMsg);
            }
            State.streaming = aiMsg;
            render();
            scrollBottom();
            
            // 请求（规范化endpoint，确保包含/v1）
            const normalized = api.endpoint.replace(/\/$/, '');
            const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            const endpoint = baseEndpoint + '/chat/completions';
            const requestBody = {
                model: api.selectedModel,
                messages: apiMsgs.filter(m => m.content?.trim()),
                temperature: api.temperature ?? 0.8,
                max_tokens: 4000
            };
            
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
            
            let reasoningBuffer = '';
            let contentBuffer = '';
            let fullText = '';
            let fullReasoning = '';
            try {
                const json = await res.json();
                const choice = json?.choices?.[0];
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
            } catch(e) {
                try {
                    const raw = await res.text();
                    fullText = raw;
                } catch(e2) {
                    fullText = '解析响应失败';
                }
            }

            reasoningBuffer = fullReasoning;
            contentBuffer = fullText;

            const finalContent = composeContent(reasoningBuffer, contentBuffer, false);
            writeToMsg(aiMsg, finalContent);
            
            State.streaming = null;
            State.abortController = null;
            
            // === 对齐ST: 流结束后自动解析reasoning并分离存储 ===
            // ST在 registerReasoningAppEvents -> MESSAGE_RECEIVED 事件中做 parseReasoningFromString
            const aiContent = aiMsg.swipes ? aiMsg.swipes[aiMsg.swipeIndex] : aiMsg.content;
            
            // 优先使用本次响应已收集的reasoningBuffer
            let finalReasoning = reasoningBuffer;
            
            // 如果响应没有收集到reasoning，尝试从文本中解析（对齐ST的auto_parse）
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
                const formattedReasoning = `${prefix}${finalReasoning}${suffix}${separator}`;
                // 不修改显示内容，但在extra中标记以便buildMessages时使用
                if (!aiMsg.extra) aiMsg.extra = {};
                aiMsg.extra.reasoning_formatted = formattedReasoning;
            }
            
            save();
            render();
            scrollBottom();
            checkAndAutoSummarizeOffline();
            
        } catch(e) {
            if (e.name !== 'AbortError') {
                console.error('[AI Error]', e);
                const errorMsg = 'AI回复失败: ' + e.message;
                showToast(errorMsg);

                // 自动重试逻辑
                if (State.retryCount < State.maxRetries && swipeIdx === null) {
                    State.retryCount++;
                    showToast(`正在重试 (${State.retryCount}/${State.maxRetries})...`);

                    // 延迟后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * State.retryCount));
                    return callAI(swipeIdx);
                }
            } else {
                showToast('已停止生成');
            }
        } finally {
            if (input) { input.disabled = false; input.placeholder = ''; }
            if (sendBtn) sendBtn.disabled = false;
            if (typing) typing.classList.remove('show');
            const stopBtn = document.getElementById('st-stop-btn');
            if (stopBtn) stopBtn.style.display = 'none';
            State.streaming = null;
            State.abortController = null;
            State.retryCount = 0;
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
                renderWithScrollPreserved(render);
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

    // 浅粉白确认弹窗
    function showPinkConfirm(message, onConfirm, onCancel, title = '确认操作') {
        const overlay = document.createElement('div');
        overlay.className = 'st-modal-overlay st-pink-white-modal';
        overlay.innerHTML = `
            <div class="st-modal-box st-pink-white-modal st-confirm-dialog">
                <div class="st-modal-header">
                    <h3>${title}</h3>
                    <button class="st-modal-close" id="st-confirm-close">×</button>
                </div>
                <div class="st-modal-body">
                    <div class="st-confirm-message">${message}</div>
                    <div class="st-confirm-actions">
                        <button class="st-btn secondary" id="st-confirm-cancel">取消</button>
                        <button class="st-btn primary" id="st-confirm-ok">确认</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeModal = (triggerCancel = true) => {
            overlay.remove();
            if (triggerCancel && onCancel) onCancel();
        };

        overlay.querySelector('#st-confirm-close').onclick = () => closeModal(true);
        overlay.querySelector('#st-confirm-cancel').onclick = () => closeModal(true);
        overlay.querySelector('#st-confirm-ok').onclick = () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                closeModal(true);
            }
        };
    }

    // 显示总结对话框
    function showSummaryDialog() {
        const chat = getActiveChat();
        if (!chat) {
            showToast('请先打开一个聊天');
            return;
        }

        const conv = window.AppState?.conversations?.find(c => c.id === chat.id) || chat;
        const msgs = State.messages[State.chatId] || [];

        const modal = document.createElement('div');
        modal.className = 'st-modal-overlay st-pink-white-modal';
        modal.innerHTML = `
            <div class="st-modal-box st-pink-white-modal">
                <div class="st-modal-header">
                    <h3>对话总结</h3>
                    <button class="st-modal-close" id="st-modal-close">×</button>
                </div>
                <div class="st-modal-body">
                    <div class="st-summary-info">
                        <span>当前消息数: <strong id="st-summary-message-total">${msgs.length}</strong> 条</span>
                    </div>
                    <div class="token-stats-container st-summary-token-stats">
                        <div class="token-stat-item">
                            <div class="token-stat-label">当前对话Token数</div>
                            <div class="token-stat-value" id="st-summary-token-count">计算中...</div>
                            <div class="form-hint">基于线下消息内容估算</div>
                        </div>
                        <div class="token-stat-item">
                            <div class="token-stat-label">消息数量</div>
                            <div class="token-stat-value" id="st-summary-message-count">-</div>
                        </div>
                        <button class="st-btn secondary" id="st-summary-refresh-tokens">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                            <span>刷新统计</span>
                        </button>
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-label">总结间隔</label>
                        <div class="st-form-hint">每多少条消息后自动进行总结</div>
                        <input type="number" class="st-form-input" id="st-summary-interval" value="${Number.isFinite(State.summaryInterval) ? State.summaryInterval : 50}" min="10" max="500">
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-label">保留消息数</label>
                        <div class="st-form-hint">总结后保留最新的多少条消息</div>
                        <input type="number" class="st-form-input" id="st-summary-keep" value="${Number.isFinite(State.summaryKeepLatest) ? State.summaryKeepLatest : 10}" min="5" max="100">
                    </div>
                    <div class="st-form-group">
                        <button class="st-btn primary" id="st-summary-generate">立即生成总结</button>
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-checkbox">
                            <input type="checkbox" id="st-summary-auto" ${State.summaryEnabled ? 'checked' : ''}>
                            <span>启用自动总结</span>
                        </label>
                    </div>
                    <div class="memory-shards-callout st-summary-memory-callout">
                        <div class="memory-shards-callout-title">记忆区</div>
                        <div class="memory-shards-callout-desc">总结内容已集中收纳，支持统一编辑与删除</div>
                        <button class="st-btn secondary" id="st-summary-open-memory">查看记忆区</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const updateSummaryTokenStats = () => {
            const latestMsgs = State.messages[State.chatId] || [];
            const tokenMessages = latestMsgs.map(m => ({ content: getOfflineMessageContent(m) }));
            const totalTokens = calculateMessagesTokenCount(tokenMessages);
            const tokenCountEl = document.getElementById('st-summary-token-count');
            const messageCountEl = document.getElementById('st-summary-message-count');
            const messageTotalEl = document.getElementById('st-summary-message-total');

            if (tokenCountEl) tokenCountEl.textContent = `${totalTokens.toLocaleString()} tokens`;
            if (messageCountEl) messageCountEl.textContent = latestMsgs.length.toLocaleString();
            if (messageTotalEl) messageTotalEl.textContent = latestMsgs.length.toLocaleString();
        };

        updateSummaryTokenStats();

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

        // 刷新Token统计
        document.getElementById('st-summary-refresh-tokens').onclick = updateSummaryTokenStats;

        // 打开记忆区
        document.getElementById('st-summary-open-memory').onclick = () => {
            modal.remove();
            if (typeof window.openMemoryShardsPage === 'function') {
                window.openMemoryShardsPage(chat.id);
            } else {
                showToast('记忆区页面加载中');
            }
        };

        // 保存设置
        const saveSettings = () => {
            const interval = parseInt(document.getElementById('st-summary-interval').value) || 50;
            const keep = parseInt(document.getElementById('st-summary-keep').value) || 10;
            const auto = document.getElementById('st-summary-auto').checked;

            State.summaryInterval = interval;
            State.summaryKeepLatest = keep;
            State.summaryEnabled = auto;

            save();
            showToast('设置已保存');
        };

        document.getElementById('st-summary-interval').onchange = saveSettings;
        document.getElementById('st-summary-keep').onchange = saveSettings;
        document.getElementById('st-summary-auto').onchange = saveSettings;
    }

    // 生成总结
    async function generateSummary(isAutomatic = false) {
        if (State.summaryInProgress) {
            showToast('总结生成中，请稍候');
            return;
        }
        const chat = getActiveChat();
        if (!chat) {
            showToast('请先打开一个聊天');
            return;
        }

        const conv = window.AppState?.conversations?.find(c => c.id === chat.id) || chat;
        const msgs = State.messages[State.chatId] || [];
        if (msgs.length < 3) {
            showToast('消息过少，无需总结');
            return;
        }

        const context = getConversationContext(conv?.id || State.chatId);
        const conversationText = buildOfflineConversationText(msgs, conv);
        if (!conversationText) {
            showToast('没有消息可以总结');
            return;
        }

        const hasSecondaryApi = window.AppState.apiSettings.secondaryEndpoint &&
                               window.AppState.apiSettings.secondaryApiKey &&
                               window.AppState.apiSettings.secondarySelectedModel;
        const hasMainApi = window.AppState.apiSettings.endpoint && window.AppState.apiSettings.selectedModel;

        if (!hasSecondaryApi && !hasMainApi) {
            showToast('请先配置主API或副API设置');
            return;
        }

        const summaryInput = typeof window.buildSummaryInput === 'function'
            ? window.buildSummaryInput(conversationText, {
                conv: conv,
                modeLabel: '线下功能',
                partnerName: context?.userNameForChar
            })
            : conversationText;

        const summarizeFn = (!hasSecondaryApi && hasMainApi && window.summarizeTextViaMainAPI)
            ? window.summarizeTextViaMainAPI
            : window.summarizeTextViaSecondaryAPI;

        if (!summarizeFn) {
            showToast('总结功能未加载');
            return;
        }

        State.summaryInProgress = true;
        showToast(isAutomatic ? '正在自动总结...' : '正在生成总结...');

        summarizeFn(
            summaryInput,
            (result) => {
                const normalizedSummary = typeof window.normalizeSummaryContent === 'function'
                    ? window.normalizeSummaryContent(result)
                    : result;

                if (!conv.summaries) {
                    conv.summaries = [];
                }
                conv.summaries.push({
                    content: normalizedSummary,
                    isAutomatic: isAutomatic,
                    isOffline: true,
                    timestamp: new Date().toISOString(),
                    messageCount: msgs.length
                });

                const marked = markOfflineMessagesSummarized(msgs);
                if (marked > 0) {
                    save();
                }

                if (window.saveToStorage) {
                    window.saveToStorage();
                }

                State.summaryInProgress = false;
                showToast(isAutomatic ? '自动总结已生成' : '总结已生成');

                if (typeof window.renderMemoryShardsPage === 'function') {
                    window.renderMemoryShardsPage(chat.id);
                }
            },
            (error) => {
                State.summaryInProgress = false;
                showToast('总结失败: ' + error);
            }
        );
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
                renderWithScrollPreserved(render);
                showToast(`已删除 ${selectedIds.length} 条消息`);
            });
        } else if (action === 'cancel') {
            toggleSelectMode();
        }
    }

    // Token估算
    function estimateTokens(text) {
        if (!text) return 0;
        if (window.MainAPIManager?.estimateTokenCount) {
            return window.MainAPIManager.estimateTokenCount(text);
        }
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
        return Math.ceil(chineseChars * 1.5 + englishWords * 1.3);
    }

    function calculateMessagesTokenCount(messages) {
        if (!Array.isArray(messages) || messages.length === 0) return 0;
        if (window.MainAPIManager?.calculateMessagesTokenCount) {
            return window.MainAPIManager.calculateMessagesTokenCount(messages);
        }

        let totalTokens = 3;
        messages.forEach(msg => {
            totalTokens += 4;
            if (typeof msg.content === 'string') {
                totalTokens += estimateTokens(msg.content);
            } else if (Array.isArray(msg.content)) {
                msg.content.forEach(item => {
                    if (item?.type === 'text') {
                        totalTokens += estimateTokens(item.text || '');
                    } else if (item?.type === 'image_url') {
                        totalTokens += 128;
                    }
                });
            } else {
                totalTokens += 20;
            }
        });
        return totalTokens;
    }

    // 更新Token统计
    function updateTokenStats(msgs) {
        const statsEl = document.getElementById('st-token-stats');
        if (!statsEl) return;

        const tokenMessages = msgs.map(m => ({ content: getOfflineMessageContent(m) }));
        const totalTokens = calculateMessagesTokenCount(tokenMessages);

        statsEl.textContent = ` ${msgs.length} 条消息`;
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

        // 功能按钮
        document.getElementById('st-stop-btn').onclick = stopGen;
        document.getElementById('st-retry-btn').onclick = retryLast;
        document.getElementById('st-scroll-top-btn').onclick = confirmScrollToTop;
        document.getElementById('st-scroll-bottom-btn').onclick = confirmScrollToLatest;
        document.getElementById('st-jump-floor-btn').onclick = showJumpToFloorDialog;

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

        const messagesEl = document.getElementById('st-messages');
        messagesEl.addEventListener('scroll', () => {
            State.stickToBottom = isNearBottom(messagesEl);
        }, { passive: true });

        // 消息列表事件
        messagesEl.addEventListener('click', e => {
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

        messagesEl.addEventListener('touchstart', e => {
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

        messagesEl.addEventListener('touchend', e => {
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

        messagesEl.addEventListener('touchmove', e => {
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

    // 回到顶部
    function confirmScrollToTop() {
        const container = document.getElementById('st-messages');
        if (!container) return;
        showPinkConfirm('确认回到页面顶部？', () => {
            container.scrollTop = 0;
            State.stickToBottom = false;
            showToast('已回到顶部');
        }, null, '回到顶部');
    }

    // 回到最新楼层顶部
    function confirmScrollToLatest() {
        const msgs = State.messages[State.chatId] || [];
        if (!msgs.length) {
            showToast('暂无消息');
            return;
        }
        showPinkConfirm('确认回到最新楼层顶部？', () => {
            scrollToMessageTopByIndex(msgs.length - 1);
            showToast('已回到最新楼层');
        }, null, '回到底部');
    }

    // 回到任意楼层
    function showJumpToFloorDialog() {
        const msgs = State.messages[State.chatId] || [];
        if (!msgs.length) {
            showToast('暂无消息');
            return;
        }

        const maxFloor = msgs.length;
        const modal = document.createElement('div');
        modal.className = 'st-modal-overlay st-pink-white-modal';
        modal.innerHTML = `
            <div class="st-modal-box st-pink-white-modal">
                <div class="st-modal-header">
                    <h3>回到任意楼层</h3>
                    <button class="st-modal-close" id="st-jump-floor-close">×</button>
                </div>
                <div class="st-modal-body">
                    <div class="st-summary-info">
                        <span>当前共有 <strong>${maxFloor}</strong> 楼</span>
                    </div>
                    <div class="st-form-group">
                        <label class="st-form-label">楼层号</label>
                        <div class="st-form-hint">范围 1 - ${maxFloor}</div>
                        <input type="number" id="st-jump-floor-input" class="st-form-input" min="1" max="${maxFloor}" value="${maxFloor}">
                    </div>
                    <div class="st-confirm-actions">
                        <button class="st-btn secondary" id="st-jump-floor-cancel">取消</button>
                        <button class="st-btn primary" id="st-jump-floor-confirm">确认</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        const input = modal.querySelector('#st-jump-floor-input');

        modal.querySelector('#st-jump-floor-close').onclick = closeModal;
        modal.querySelector('#st-jump-floor-cancel').onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        const confirmJump = () => {
            const value = parseInt(input.value, 10);
            if (!value || value < 1 || value > maxFloor) {
                showToast(`请输入 1 - ${maxFloor} 的楼层号`);
                input.focus();
                return;
            }
            closeModal();
            scrollToMessageTopByIndex(value - 1);
            showToast(`已跳转到第 ${value} 楼`);
        };

        modal.querySelector('#st-jump-floor-confirm').onclick = confirmJump;
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmJump();
            }
        });

        input.focus();
        input.select();
    }
    
    // 停止生成
    function stopGen() {
        if (State.abortController) {
            State.abortController.abort();
            State.abortController = null;
        }
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
    function isNearBottom(el, threshold = 120) {
        if (!el) return true;
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        return distanceToBottom <= threshold;
    }

    function scrollBottom(force = false) {
        const el = document.getElementById('st-messages');
        if (!el) return;
        if (!force && !State.stickToBottom && !isNearBottom(el)) return;
        el.scrollTop = el.scrollHeight;
        State.stickToBottom = true;
    }

    function scrollToMessageTopByIndex(idx) {
        const container = document.getElementById('st-messages');
        if (!container) return;
        const msgEl = container.querySelector(`.st-message[data-idx="${idx}"]`);
        if (!msgEl) return;
        container.scrollTop = msgEl.offsetTop;
        const total = State.messages[State.chatId]?.length || 0;
        State.stickToBottom = idx >= total - 1;
    }

    function renderWithScrollPreserved(renderFn) {
        const container = document.getElementById('st-messages');
        if (!container) {
            renderFn();
            return;
        }

        const wasNearBottom = isNearBottom(container);
        const prevScrollTop = container.scrollTop;
        let anchorId = null;
        let anchorOffset = 0;

        if (!wasNearBottom) {
            const items = Array.from(container.querySelectorAll('.st-message'));
            const anchor = items.find(el => (el.offsetTop + el.offsetHeight) >= prevScrollTop);
            if (anchor?.dataset?.id) {
                anchorId = anchor.dataset.id;
                anchorOffset = prevScrollTop - anchor.offsetTop;
            }
        }

        renderFn();

        const nextContainer = document.getElementById('st-messages');
        if (!nextContainer) return;

        if (wasNearBottom) {
            scrollBottom(true);
            return;
        }

        if (anchorId) {
            const newAnchor = nextContainer.querySelector(`.st-message[data-id="${anchorId}"]`);
            if (newAnchor) {
                nextContainer.scrollTop = Math.max(0, newAnchor.offsetTop + anchorOffset);
                return;
            }
        }

        nextContainer.scrollTop = Math.max(0, prevScrollTop);
    }
    
    // 提取思维链 - 严格对齐SillyTavern的处理方式
    // 支持模板: <think>, <thinking>, <reasoning>, ```thinking, 【思考】, [思考]
    // 参考: ST reasoning.js -> parseReasoningFromString, extractReasoningFromData

    // ========== SillyTavern风格工具函数 ==========
    
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
    
    function writeToMsg(aiMsg, text) {
        if (aiMsg.swipes) {
            aiMsg.swipes[aiMsg.swipeIndex] = text;
        } else {
            aiMsg.content = text;
        }
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
     * 中间状态(allowOpen)时使用当前模板的prefix匹配未闭合标签
     */
    function extractThinking(text, allowOpen = false) {
        if (!text) return '';

        // 使用当前模板解析闭合的思考块
        const parsed = parseReasoningFromString(text, { strict: false });
        if (parsed?.reasoning) {
            return parsed.reasoning;
        }
        
        // 允许未闭合时（中间状态），匹配当前模板的未闭合标签
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
        modal.className = 'st-modal-overlay st-pink-white-modal';
        modal.innerHTML = `
            <div class="st-modal-box st-pink-white-modal">
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
