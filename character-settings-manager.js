/**
 * 角色设置管理模块
 * 负责角色设置页面的显示、编辑以及对话总结功能
 */

(function() {
    'use strict';

    window.CharacterSettingsManager = {
        
        /**
         * 打开角色设置页面（全屏子页面）
         */
        openCharacterSettings: function(chat) {
            console.log('openCharacterSettings called with chat:', chat);
            if (!chat) {
                console.error('No chat provided to openCharacterSettings');
                showToast('未找到角色信息');
                return;
            }

            let page = document.getElementById('character-settings-page');
            if (!page) {
                console.log('Creating new character-settings-page');
                page = document.createElement('div');
                page.id = 'character-settings-page';
                page.className = 'sub-page';
                const appContainer = document.getElementById('app-container');
                if (!appContainer) {
                    console.error('app-container not found');
                    showToast('应用容器未找到');
                    return;
                }
                appContainer.appendChild(page);
            } else {
                console.log('Reusing existing character-settings-page');
            }

            // 获取局部世界书列表
            const localWbs = window.AppState.worldbooks.filter(w => !w.isGlobal);
            
            // 获取角色应该使用的用户人设
            let currentPersona = null;
            let userNameForChar = chat.userNameForChar || window.AppState.user.name;
            let userPersonality = window.AppState.user && window.AppState.user.personality ? window.AppState.user.personality : '';
            
            if (window.UserPersonaManager) {
                currentPersona = window.UserPersonaManager.getPersonaForConversation(chat.id);
                if (currentPersona) {
                    userNameForChar = currentPersona.userName;
                    userPersonality = currentPersona.personality || '';
                }
            }

            // 获取总结列表
            const conv = window.AppState.conversations.find(c => c.id === chat.id);
            const hasSummaries = conv && conv.summaries && conv.summaries.length > 0;
            
            page.innerHTML = `
                <div class="sub-nav char-settings-nav">
                    <div class="back-btn" id="char-settings-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">角色设置</div>
                </div>
                
                <div class="sub-content char-settings-content">
                    <!-- 头像区域 - 公主风格 -->
                    <div class="char-avatar-section">
                        <div class="avatar-container">
                            <div class="avatar-wrapper char-avatar-wrapper">
                                <div class="avatar-glow"></div>
                                <div id="settings-char-avatar-display" class="avatar-display">
                                    ${chat.avatar ? `<img src="${chat.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span class="avatar-initial">' + chat.name.charAt(0) + '</span>'}
                                </div>
                                <button id="char-avatar-btn" class="avatar-edit-btn">
                                    <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <div class="avatar-label">角色</div>
                            </div>
                            
                            <div class="avatar-heart">
                                <svg viewBox="0 0 24 24" style="width:32px;height:32px;fill:#ff69b4;">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </div>
                            
                            <div class="avatar-wrapper user-avatar-wrapper">
                                <div class="avatar-glow"></div>
                                <div id="settings-user-avatar-display" class="avatar-display">
                                    ${chat.userAvatar ? `<img src="${chat.userAvatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span class="avatar-initial">' + window.AppState.user.name.charAt(0) + '</span>'}
                                </div>
                                <button id="user-avatar-btn" class="avatar-edit-btn">
                                    <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <div class="avatar-label">你</div>
                            </div>
                        </div>
                    </div>

                    <!-- 基本信息 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>基本信息</span>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">角色名称</label>
                                <input type="text" id="char-name-input" value="${this.escapeHtml(chat.name || '')}" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">备注名称</label>
                                <input type="text" id="char-remark-input" value="${this.escapeHtml(chat.remark || '')}" placeholder="设置专属备注" class="form-input">
                                <div class="form-hint">设置后将优先显示备注而非角色名称</div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">角色设定</label>
                                <textarea id="char-desc-input" class="form-textarea">${this.escapeHtml(chat.description || '')}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- 用户人设 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>用户人设</span>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">用户名称</label>
                                <input type="text" id="user-name-for-char" value="${this.escapeHtml(userNameForChar)}" class="form-input">
                                <div class="form-hint">在与该角色对话时使用此名称</div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">选择人设</label>
                                <select id="user-persona-select" class="form-select">
                                    <option value="">使用默认人设</option>
                                    ${window.AppState.userPersonas && window.AppState.userPersonas.map(p => `
                                        <option value="${p.id}" ${chat.boundPersonaId === p.id ? 'selected' : ''}>
                                            ${this.escapeHtml(p.name)}${p.id === window.AppState.defaultPersonaId ? ' (默认)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                                <div class="button-group">
                                    <button id="manage-personas-btn" class="btn-secondary">管理人设</button>
                                    <button id="apply-persona-btn" class="btn-primary">应用人设</button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">人设内容</label>
                                <textarea id="user-desc-input" class="form-textarea" style="min-height:80px;">${this.escapeHtml(userPersonality)}</textarea>
                                <div class="form-hint">当前显示的是实际使用的人设内容</div>
                            </div>
                        </div>
                    </div>

                    <!-- 绑定设置 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                            <span>绑定设置</span>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">表情包分组</label>
                                <div id="char-emoji-groups-list" class="tag-list">
                                    ${window.AppState.emojiGroups.map(g => `
                                        <label class="tag-item">
                                            <input type="checkbox" class="eg-checkbox" value="${g.id}">
                                            <span class="tag-text">${this.escapeHtml(g.name)}</span>
                                        </label>
                                    `).join('')}
                                </div>
                                <div class="form-hint">支持多选，向右滑动查看更多</div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">局部世界书</label>
                                <div id="char-worldbooks-list" class="tag-list">
                                    ${localWbs.map(w => `
                                        <label class="tag-item">
                                            <input type="checkbox" class="wb-checkbox" value="${w.id}">
                                            <span class="tag-text">${this.escapeHtml(w.name)}</span>
                                        </label>
                                    `).join('')}
                                </div>
                                <div class="form-hint">支持多选，向右滑动查看更多</div>
                            </div>
                        </div>
                    </div>

                    <!-- 对话总结功能 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <span>对话总结</span>
                        </div>
                        <div class="card-body">
                            <div class="summary-settings">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="auto-summary-enabled" ${window.AppState.apiSettings.summaryEnabled ? 'checked' : ''} class="custom-checkbox">
                                    <span>启用自动总结</span>
                                </label>
                                <div class="form-hint">当消息达到设定数量后自动进行总结</div>
                                
                                <div class="form-group">
                                    <label class="form-label">自动总结间隔</label>
                                    <input type="number" id="summary-interval" value="${window.AppState.apiSettings.summaryInterval}" min="5" max="200" class="form-input">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">保留最新消息数</label>
                                    <input type="number" id="summary-keep-latest" value="${window.AppState.apiSettings.summaryKeepLatest}" min="5" max="50" class="form-input">
                                </div>
                            </div>

                            <button id="manual-summary-btn" class="btn-primary btn-full">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>立即生成总结</span>
                            </button>

                            <div id="summaries-container" class="summaries-list">
                                ${hasSummaries ? this.renderSummariesList(conv.summaries, chat.id) : '<div class="empty-state">暂无总结记录</div>'}
                            </div>
                        </div>
                    </div>

                    <!-- 聊天背景图片 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>聊天背景</span>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <div class="bg-preview" style="background-image:${chat.chatBgImage ? `url('${chat.chatBgImage}')` : 'none'};">
                                    ${!chat.chatBgImage ? '<span class="bg-placeholder">暂无背景图</span>' : ''}
                                </div>
                                <div class="button-group">
                                    <button id="chat-bg-upload-btn" class="btn-primary">选择背景图</button>
                                    ${chat.chatBgImage ? `<button id="chat-bg-clear-btn" class="btn-danger">清除背景</button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 消息气泡颜色设置 - 公主风格卡片 -->
                    <div class="settings-card bubble-color-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                <line x1="15" y1="9" x2="15.01" y2="9"></line>
                            </svg>
                            <span>消息气泡颜色</span>
                            <button id="bubble-color-lock-btn" class="bubble-lock-btn" title="锁定防止误触">
                                <svg id="bubble-lock-icon" viewBox="0 0 24 24" class="lock-icon">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <span id="bubble-lock-text">解锁</span>
                            </button>
                        </div>
                        <div class="card-body">
                        <!-- 角色消息气泡（左侧） -->
                        <div class="bubble-section">
                            <label class="bubble-label">角色消息气泡（左侧）</label>
                            
                            <div class="color-controls">
                                <div class="rgb-grid">
                                    <div class="color-control">
                                        <label class="color-label">红 (R)</label>
                                        <input type="range" id="char-bubble-r" min="0" max="255" value="${chat.bubbleColor?.char?.r ?? 240}" class="bubble-slider">
                                        <input type="number" id="char-bubble-r-input" min="0" max="255" value="${chat.bubbleColor?.char?.r ?? 240}" class="bubble-input">
                                    </div>
                                    <div class="color-control">
                                        <label class="color-label">绿 (G)</label>
                                        <input type="range" id="char-bubble-g" min="0" max="255" value="${chat.bubbleColor?.char?.g ?? 240}" class="bubble-slider">
                                        <input type="number" id="char-bubble-g-input" min="0" max="255" value="${chat.bubbleColor?.char?.g ?? 240}" class="bubble-input">
                                    </div>
                                    <div class="color-control">
                                        <label class="color-label">蓝 (B)</label>
                                        <input type="range" id="char-bubble-b" min="0" max="255" value="${chat.bubbleColor?.char?.b ?? 240}" class="bubble-slider">
                                        <input type="number" id="char-bubble-b-input" min="0" max="255" value="${chat.bubbleColor?.char?.b ?? 240}" class="bubble-input">
                                    </div>
                                </div>
                                
                                <div class="alpha-control">
                                    <label class="color-label">透明度</label>
                                    <div class="alpha-input-group">
                                        <input type="range" id="char-bubble-alpha" min="0" max="100" value="${(chat.bubbleColor?.char?.alpha ?? 0.85) * 100}" class="bubble-slider">
                                        <input type="number" id="char-bubble-alpha-input" min="0" max="100" value="${Math.round((chat.bubbleColor?.char?.alpha ?? 0.85) * 100)}" class="bubble-input alpha-number">
                                        <span class="percent-sign">%</span>
                                    </div>
                                </div>
                                
                                <div class="bubble-preview" style="background-color:rgba(${chat.bubbleColor?.char?.r ?? 240}, ${chat.bubbleColor?.char?.g ?? 240}, ${chat.bubbleColor?.char?.b ?? 240}, ${chat.bubbleColor?.char?.alpha ?? 0.85});" id="char-bubble-preview">
                                    预览效果
                                </div>
                            </div>
                        </div>
                        
                        <!-- 用户消息气泡（右侧） -->
                        <div class="bubble-section">
                            <label class="bubble-label">用户消息气泡（右侧）</label>
                            
                            <div class="color-controls">
                                <div class="rgb-grid">
                                    <div class="color-control">
                                        <label class="color-label">红 (R)</label>
                                        <input type="range" id="user-bubble-r" min="0" max="255" value="${chat.bubbleColor?.user?.r ?? 255}" class="bubble-slider">
                                        <input type="number" id="user-bubble-r-input" min="0" max="255" value="${chat.bubbleColor?.user?.r ?? 255}" class="bubble-input">
                                    </div>
                                    <div class="color-control">
                                        <label class="color-label">绿 (G)</label>
                                        <input type="range" id="user-bubble-g" min="0" max="255" value="${chat.bubbleColor?.user?.g ?? 255}" class="bubble-slider">
                                        <input type="number" id="user-bubble-g-input" min="0" max="255" value="${chat.bubbleColor?.user?.g ?? 255}" class="bubble-input">
                                    </div>
                                    <div class="color-control">
                                        <label class="color-label">蓝 (B)</label>
                                        <input type="range" id="user-bubble-b" min="0" max="255" value="${chat.bubbleColor?.user?.b ?? 255}" class="bubble-slider">
                                        <input type="number" id="user-bubble-b-input" min="0" max="255" value="${chat.bubbleColor?.user?.b ?? 255}" class="bubble-input">
                                    </div>
                                </div>
                                
                                <div class="alpha-control">
                                    <label class="color-label">透明度</label>
                                    <div class="alpha-input-group">
                                        <input type="range" id="user-bubble-alpha" min="0" max="100" value="${(chat.bubbleColor?.user?.alpha ?? 0.85) * 100}" class="bubble-slider">
                                        <input type="number" id="user-bubble-alpha-input" min="0" max="100" value="${Math.round((chat.bubbleColor?.user?.alpha ?? 0.85) * 100)}" class="bubble-input alpha-number">
                                        <span class="percent-sign">%</span>
                                    </div>
                                </div>
                                
                                <div class="bubble-preview" style="background-color:rgba(${chat.bubbleColor?.user?.r ?? 255}, ${chat.bubbleColor?.user?.g ?? 200}, ${chat.bubbleColor?.user?.b ?? 230}, ${chat.bubbleColor?.user?.alpha ?? 0.85});" id="user-bubble-preview">
                                    预览效果
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- 操作按钮 - 公主风格 -->
                    <div class="action-buttons">
                        <button id="save-char-settings-btn" class="btn-save">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            <span>保存设置</span>
                        </button>
                        <button id="delete-char-btn" class="btn-delete">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>删除角色</span>
                        </button>
                    </div>
                    
                    <!-- 删除所有聊天记录按钮 -->
                    <div class="danger-zone">
                        <button id="delete-all-messages-btn" class="btn-danger-full">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>删除所有聊天记录</span>
                        </button>
                        <div class="danger-hint">此操作将清空该角色的所有对话记录和心声，无法恢复</div>
                    </div>
                </div>
            `;

            page.classList.add('open');

            // 设置当前绑定的分组
            if (chat.boundEmojiGroups && Array.isArray(chat.boundEmojiGroups)) {
                chat.boundEmojiGroups.forEach(egId => {
                    const checkbox = document.querySelector(`.eg-checkbox[value="${egId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            if (chat.boundWorldbooks && Array.isArray(chat.boundWorldbooks)) {
                chat.boundWorldbooks.forEach(wbId => {
                    const checkbox = document.querySelector(`.wb-checkbox[value="${wbId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            this.bindCharacterSettingsEvents(chat);
            console.log('Character settings page opened successfully');
        },

        /**
         * 渲染总结历史列表
         */
        renderSummariesList: function(summaries, chatId) {
            if (!summaries || summaries.length === 0) {
                return '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无总结记录</div>';
            }

            let html = '<div style="font-size:13px;color:#666;margin-bottom:12px;">所有总结记录</div>';
            html += '<div style="max-height:300px;overflow-y:auto;">';
            
            summaries.forEach((summary, index) => {
                html += `
                    <div style="padding:12px;background:#f9f9f9;border-radius:8px;margin-bottom:8px;border-left:3px solid #0066cc;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                            <div style="font-size:12px;color:#666;flex:1;">
                                <strong>${summary.isAutomatic ? '自动' : '手动'}总结</strong> • 
                                基于 <strong>${summary.messageCount || '?'}</strong> 条消息 • 
                                ${new Date(summary.timestamp).toLocaleString('zh-CN')}
                            </div>
                            <div style="display:flex;gap:4px;white-space:nowrap;margin-left:8px;">
                                <button onclick="CharacterSettingsManager.editSummary('${chatId}', ${index})" style="padding:4px 8px;font-size:11px;border:1px solid #0066cc;background:#fff;color:#0066cc;border-radius:4px;cursor:pointer;">编辑</button>
                                <button onclick="CharacterSettingsManager.deleteSummary('${chatId}', ${index})" style="padding:4px 8px;font-size:11px;border:1px solid #f44;background:#fff;color:#f44;border-radius:4px;cursor:pointer;">删除</button>
                            </div>
                        </div>
                        <div style="padding:8px;background:#fff;border-radius:4px;font-size:12px;color:#333;max-height:100px;overflow-y:auto;line-height:1.5;white-space:pre-wrap;word-break:break-all;">
                            ${this.escapeHtml(summary.content)}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            return html;
        },

        /**
         * 绑定角色设置页面事件
         */
        bindCharacterSettingsEvents: function(chat) {
            console.log('bindCharacterSettingsEvents called');
            // 返回按钮
            const backBtn = document.getElementById('char-settings-back-btn');
            if (backBtn) {
                console.log('Found char-settings-back-btn, binding click event');
                // 移除旧的事件监听器，防止重复绑定
                const newBackBtn = backBtn.cloneNode(true);
                backBtn.parentNode.replaceChild(newBackBtn, backBtn);
                
                newBackBtn.addEventListener('click', (e) => {
                    console.log('char-settings-back-btn clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    const page = document.getElementById('character-settings-page');
                    if (page) {
                        console.log('Removing open class from character-settings-page');
                        page.classList.remove('open');
                    }
                });
            } else {
                console.warn('char-settings-back-btn not found');
            }

            // 角色头像修改
            const charAvatarBtn = document.getElementById('char-avatar-btn');
            if (charAvatarBtn) {
                charAvatarBtn.addEventListener('click', () => {
                    window.openImagePickerForCharacter('avatar', chat.id);
                });
            }

            // 用户头像修改
            const userAvatarBtn = document.getElementById('user-avatar-btn');
            if (userAvatarBtn) {
                userAvatarBtn.addEventListener('click', () => {
                    window.openImagePicker('user-avatar', true);
                });
            }

            // 聊天背景图片
            const chatBgUploadBtn = document.getElementById('chat-bg-upload-btn');
            if (chatBgUploadBtn) {
                chatBgUploadBtn.addEventListener('click', () => {
                    this.openChatBgImagePicker(chat.id);
                });
            }

            const chatBgClearBtn = document.getElementById('chat-bg-clear-btn');
            if (chatBgClearBtn) {
                chatBgClearBtn.addEventListener('click', () => {
                    const conv = window.AppState.conversations.find(c => c.id === chat.id);
                    if (conv) {
                        conv.chatBgImage = null;
                        saveToStorage();
                        document.getElementById('character-settings-page').classList.remove('open');
                        setTimeout(() => this.openCharacterSettings(conv), 100);
                    }
                });
            }

            // 管理人设按钮
            const managePersonasBtn = document.getElementById('manage-personas-btn');
            if (managePersonasBtn) {
                managePersonasBtn.addEventListener('click', () => {
                    if (window.UserPersonaManager) {
                        window.UserPersonaManager.openPersonaManager();
                    }
                });
            }

            // 应用人设按钮
            const applyPersonaBtn = document.getElementById('apply-persona-btn');
            if (applyPersonaBtn) {
                applyPersonaBtn.addEventListener('click', () => {
                    this.applyPersona(chat.id);
                });
            }

            // 手动总结按钮
            const manualSummaryBtn = document.getElementById('manual-summary-btn');
            if (manualSummaryBtn) {
                manualSummaryBtn.addEventListener('click', () => {
                    this.manualSummarize(chat.id);
                });
            }

            // 保存按钮
            const saveBtn = document.getElementById('save-char-settings-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveCharacterSettings(chat.id);
                });
            }

            // 删除按钮
            const deleteBtn = document.getElementById('delete-char-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteCharacter(chat.id);
                });
            }

            // 删除所有聊天记录按钮
            const deleteAllMessagesBtn = document.getElementById('delete-all-messages-btn');
            if (deleteAllMessagesBtn) {
                deleteAllMessagesBtn.addEventListener('click', () => {
                    this.deleteAllMessages(chat.id);
                });
            }

            // 绑定消息气泡颜色控制事件
            this.bindBubbleColorEvents(chat.id);
        },

        /**
         * 绑定消息气泡颜色控制事件
         */
        bindBubbleColorEvents: function(chatId) {
            // 锁定状态管理
            let isLocked = false;
            const lockBtn = document.getElementById('bubble-color-lock-btn');
            const lockIcon = document.getElementById('bubble-lock-icon');
            const lockText = document.getElementById('bubble-lock-text');
            
            // 锁定按钮事件
            if (lockBtn) {
                lockBtn.addEventListener('click', () => {
                    isLocked = !isLocked;
                    if (isLocked) {
                        lockBtn.style.background = '#fff3cd';
                        lockBtn.style.borderColor = '#ffc107';
                        lockBtn.style.color = '#ff6b00';
                        lockText.textContent = '已锁定';
                        lockIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6m0 0l-3-3m3 3l3-3"></path>';
                    } else {
                        lockBtn.style.background = '#fff';
                        lockBtn.style.borderColor = '#ddd';
                        lockBtn.style.color = '#666';
                        lockText.textContent = '解锁';
                        lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
                    }
                });
            }
            
            // 角色气泡颜色控制
            const charR = document.getElementById('char-bubble-r');
            const charG = document.getElementById('char-bubble-g');
            const charB = document.getElementById('char-bubble-b');
            const charAlpha = document.getElementById('char-bubble-alpha');
            const charRInput = document.getElementById('char-bubble-r-input');
            const charGInput = document.getElementById('char-bubble-g-input');
            const charBInput = document.getElementById('char-bubble-b-input');
            const charAlphaInput = document.getElementById('char-bubble-alpha-input');
            const charPreview = document.getElementById('char-bubble-preview');
            
            // 用户气泡颜色控制
            const userR = document.getElementById('user-bubble-r');
            const userG = document.getElementById('user-bubble-g');
            const userB = document.getElementById('user-bubble-b');
            const userAlpha = document.getElementById('user-bubble-alpha');
            const userRInput = document.getElementById('user-bubble-r-input');
            const userGInput = document.getElementById('user-bubble-g-input');
            const userBInput = document.getElementById('user-bubble-b-input');
            const userAlphaInput = document.getElementById('user-bubble-alpha-input');
            const userPreview = document.getElementById('user-bubble-preview');
            
            // 更新角色气泡预览
            const updateCharPreview = () => {
                if (isLocked) return;
                const r = charR.value;
                const g = charG.value;
                const b = charB.value;
                const alpha = charAlpha.value / 100;
                
                charRInput.value = r;
                charGInput.value = g;
                charBInput.value = b;
                charAlphaInput.value = Math.round(alpha * 100);
                
                charPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            
            // 更新用户气泡预览
            const updateUserPreview = () => {
                if (isLocked) return;
                const r = userR.value;
                const g = userG.value;
                const b = userB.value;
                const alpha = userAlpha.value / 100;
                
                userRInput.value = r;
                userGInput.value = g;
                userBInput.value = b;
                userAlphaInput.value = Math.round(alpha * 100);
                
                userPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            
            // 从输入框更新滑块（角色）
            const updateCharFromInput = () => {
                if (isLocked) return;
                const r = Math.max(0, Math.min(255, parseInt(charRInput.value) || 0));
                const g = Math.max(0, Math.min(255, parseInt(charGInput.value) || 0));
                const b = Math.max(0, Math.min(255, parseInt(charBInput.value) || 0));
                const alpha = Math.max(0, Math.min(100, parseInt(charAlphaInput.value) || 0));
                
                charR.value = r;
                charG.value = g;
                charB.value = b;
                charAlpha.value = alpha;
                
                charRInput.value = r;
                charGInput.value = g;
                charBInput.value = b;
                charAlphaInput.value = alpha;
                
                charPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
            };
            
            // 从输入框更新滑块（用户）
            const updateUserFromInput = () => {
                if (isLocked) return;
                const r = Math.max(0, Math.min(255, parseInt(userRInput.value) || 0));
                const g = Math.max(0, Math.min(255, parseInt(userGInput.value) || 0));
                const b = Math.max(0, Math.min(255, parseInt(userBInput.value) || 0));
                const alpha = Math.max(0, Math.min(100, parseInt(userAlphaInput.value) || 0));
                
                userR.value = r;
                userG.value = g;
                userB.value = b;
                userAlpha.value = alpha;
                
                userRInput.value = r;
                userGInput.value = g;
                userBInput.value = b;
                userAlphaInput.value = alpha;
                
                userPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
            };
            
            // 绑定滑块事件监听器
            if (charR) charR.addEventListener('input', updateCharPreview);
            if (charG) charG.addEventListener('input', updateCharPreview);
            if (charB) charB.addEventListener('input', updateCharPreview);
            if (charAlpha) charAlpha.addEventListener('input', updateCharPreview);
            
            if (userR) userR.addEventListener('input', updateUserPreview);
            if (userG) userG.addEventListener('input', updateUserPreview);
            if (userB) userB.addEventListener('input', updateUserPreview);
            if (userAlpha) userAlpha.addEventListener('input', updateUserPreview);
            
            // 绑定输入框事件监听器
            if (charRInput) charRInput.addEventListener('change', updateCharFromInput);
            if (charGInput) charGInput.addEventListener('change', updateCharFromInput);
            if (charBInput) charBInput.addEventListener('change', updateCharFromInput);
            if (charAlphaInput) charAlphaInput.addEventListener('change', updateCharFromInput);
            
            if (userRInput) userRInput.addEventListener('change', updateUserFromInput);
            if (userGInput) userGInput.addEventListener('change', updateUserFromInput);
            if (userBInput) userBInput.addEventListener('change', updateUserFromInput);
            if (userAlphaInput) userAlphaInput.addEventListener('change', updateUserFromInput);
            
            // 防止在锁定状态下通过滑块修改
            const preventLockedChange = (e) => {
                if (isLocked) {
                    e.preventDefault();
                    e.target.style.opacity = '0.5';
                    setTimeout(() => {
                        e.target.style.opacity = '1';
                    }, 200);
                }
            };
            
            [charR, charG, charB, charAlpha, userR, userG, userB, userAlpha].forEach(el => {
                if (el) {
                    el.addEventListener('mousedown', preventLockedChange);
                    el.addEventListener('touchstart', preventLockedChange);
                }
            });
        },

        /**
         * 应用人设
         */
        applyPersona: function(chatId) {
            const selectedPersonaId = document.getElementById('user-persona-select').value;
            const conv = window.AppState.conversations.find(c => c.id === chatId);
            
            if (!conv) return;
            
            if (selectedPersonaId) {
                const persona = window.AppState.userPersonas.find(p => p.id === selectedPersonaId);
                if (persona) {
                    document.getElementById('user-name-for-char').value = persona.userName;
                    document.getElementById('user-desc-input').value = persona.personality || '';
                    conv.boundPersonaId = selectedPersonaId;
                    showToast('已应用人设: ' + persona.name);
                }
            } else {
                const defaultPersona = window.AppState.userPersonas.find(p => p.id === window.AppState.defaultPersonaId);
                if (defaultPersona) {
                    document.getElementById('user-name-for-char').value = defaultPersona.userName;
                    document.getElementById('user-desc-input').value = defaultPersona.personality || '';
                }
                delete conv.boundPersonaId;
                showToast('已应用默认人设');
            }
            
            saveToStorage();
        },

        /**
         * 打开聊天背景图片选择器（iOS兼容）
         */
        openChatBgImagePicker: function(charId) {
            // 创建隐藏的文件输入元素
            let input = document.getElementById('chat-bg-file-input');
            if (!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.id = 'chat-bg-file-input';
                input.accept = 'image/jpeg,image/png,image/webp,image/gif';
                input.style.cssText = 'position:fixed;left:-9999px;opacity:0;pointer-events:none;';
                document.body.appendChild(input);
            }
            
            // 移除旧的事件监听器
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            input = newInput;
            
            // 添加change事件
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // 验证文件类型
                if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
                    showToast('请选择图片文件');
                    return;
                }
                
                // 验证文件大小（限制5MB）
                if (file.size > 5 * 1024 * 1024) {
                    showToast('图片大小不能超过5MB');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (readEvent) => {
                    const conv = window.AppState.conversations.find(c => c.id === charId);
                    if (conv) {
                        conv.chatBgImage = readEvent.target.result;
                        saveToStorage();
                        
                        // 关闭设置页面并重新打开以刷新界面
                        const settingsPage = document.getElementById('character-settings-page');
                        if (settingsPage) {
                            settingsPage.classList.remove('open');
                            setTimeout(() => {
                                this.openCharacterSettings(conv);
                                showToast('背景图片已更新');
                            }, 100);
                        }
                    }
                };
                reader.onerror = () => {
                    showToast('图片读取失败，请重试');
                };
                reader.readAsDataURL(file);
            }, { once: true });
            
            // 触发文件选择（iOS需要在用户交互中直接调用）
            input.click();
        },

        /**
         * 手动总结对话
         */
        manualSummarize: function(chatId) {
            const messages = window.AppState.messages[chatId] || [];
            if (messages.length < 3) {
                showToast('消息过少，无需总结');
                return;
            }

            showToast('正在生成总结...');
            this.summarizeConversation(chatId, false);
        },

        /**
         * 总结对话（使用副API）
         */
        summarizeConversation: function(convId, isAutomatic = false) {
            const conv = window.AppState.conversations.find(c => c.id === convId);
            if (!conv) {
                showToast('对话未找到');
                return;
            }

            const hasSecondaryApi = window.AppState.apiSettings.secondaryEndpoint && 
                                   window.AppState.apiSettings.secondaryApiKey && 
                                   window.AppState.apiSettings.secondarySelectedModel;
            
            if (!hasSecondaryApi) {
                showToast('请先配置副API设置');
                return;
            }

            const messages = window.AppState.messages[convId] || [];
            if (messages.length === 0) {
                showToast('没有消息可以总结');
                return;
            }

            let conversationText = '';
            messages.forEach(m => {
                if (m.type === 'sent' && !m.isRetracted) {
                    conversationText += `用户: ${m.content}\n`;
                } else if (m.type === 'received' && !m.isRetracted) {
                    conversationText += `${conv.name}: ${m.content}\n`;
                }
            });

            window.summarizeTextViaSecondaryAPI(
                conversationText,
                (result) => {
                    if (!conv.summaries) {
                        conv.summaries = [];
                    }
                    
                    conv.summaries.push({
                        content: result,
                        isAutomatic: isAutomatic,
                        timestamp: new Date().toISOString(),
                        messageCount: messages.length
                    });
                    
                    saveToStorage();
                    showToast('总结已生成');
                    
                    // 刷新总结列表
                    const summariesContainer = document.getElementById('summaries-container');
                    if (summariesContainer) {
                        summariesContainer.innerHTML = this.renderSummariesList(conv.summaries, convId);
                    }
                },
                (error) => {
                    console.error('总结生成出错:', error);
                    showToast('总结生成失败: ' + error);
                }
            );
        },

        /**
         * 编辑总结
         */
        editSummary: function(convId, summaryIndex) {
            const conv = window.AppState.conversations.find(c => c.id === convId);
            if (!conv || !conv.summaries || !conv.summaries[summaryIndex]) return;

            const summary = conv.summaries[summaryIndex];
            const newContent = prompt('编辑总结内容：', summary.content);
            
            if (newContent && newContent.trim()) {
                summary.content = newContent.trim();
                saveToStorage();
                
                const summariesContainer = document.getElementById('summaries-container');
                if (summariesContainer) {
                    summariesContainer.innerHTML = this.renderSummariesList(conv.summaries, convId);
                }
                
                showToast('总结已更新');
            }
        },

        /**
         * 删除总结
         */
        deleteSummary: function(convId, summaryIndex) {
            if (!confirm('确定要删除这条总结吗？')) return;

            const conv = window.AppState.conversations.find(c => c.id === convId);
            if (!conv || !conv.summaries) return;

            conv.summaries.splice(summaryIndex, 1);
            saveToStorage();
            
            const summariesContainer = document.getElementById('summaries-container');
            if (summariesContainer) {
                summariesContainer.innerHTML = this.renderSummariesList(conv.summaries, convId);
            }
            
            showToast('总结已删除');
        },

        /**
         * 保存角色设置
         */
        saveCharacterSettings: function(charId) {
            const conv = window.AppState.conversations.find(c => c.id === charId);
            if (!conv) return;

            // 保存基本信息
            conv.name = document.getElementById('char-name-input').value || conv.name;
            conv.remark = document.getElementById('char-remark-input').value.trim();
            conv.description = document.getElementById('char-desc-input').value;
            conv.userNameForChar = document.getElementById('user-name-for-char').value || window.AppState.user.name;

            // 同步更新好友列表中的备注
            const friend = window.AppState.friends.find(f => f.id === charId);
            if (friend) {
                friend.remark = conv.remark;
            }

            // 保存绑定的表情包分组
            const egCheckboxes = document.querySelectorAll('.eg-checkbox:checked');
            conv.boundEmojiGroups = Array.from(egCheckboxes).map(cb => cb.value);

            // 保存绑定的世界书
            const wbCheckboxes = document.querySelectorAll('.wb-checkbox:checked');
            conv.boundWorldbooks = Array.from(wbCheckboxes).map(cb => cb.value);

            // 保存绑定的用户人设
            const selectedPersonaId = document.getElementById('user-persona-select').value;
            if (selectedPersonaId) {
                conv.boundPersonaId = selectedPersonaId;
            } else {
                delete conv.boundPersonaId;
            }

            if (window.AppState.user) {
                window.AppState.user.personality = document.getElementById('user-desc-input').value;
            }

            // 保存总结设置
            window.AppState.apiSettings.summaryEnabled = document.getElementById('auto-summary-enabled').checked;
            window.AppState.apiSettings.summaryInterval = parseInt(document.getElementById('summary-interval').value) || 50;
            window.AppState.apiSettings.summaryKeepLatest = parseInt(document.getElementById('summary-keep-latest').value) || 10;

            // 保存消息气泡颜色设置
            const charR = document.getElementById('char-bubble-r');
            const charG = document.getElementById('char-bubble-g');
            const charB = document.getElementById('char-bubble-b');
            const charAlpha = document.getElementById('char-bubble-alpha');
            
            const userR = document.getElementById('user-bubble-r');
            const userG = document.getElementById('user-bubble-g');
            const userB = document.getElementById('user-bubble-b');
            const userAlpha = document.getElementById('user-bubble-alpha');
            
            if (charR && charG && charB && charAlpha) {
                conv.bubbleColor = conv.bubbleColor || {};
                conv.bubbleColor.char = {
                    r: parseInt(charR.value),
                    g: parseInt(charG.value),
                    b: parseInt(charB.value),
                    alpha: parseFloat(charAlpha.value) / 100
                };
            }
            
            if (userR && userG && userB && userAlpha) {
                conv.bubbleColor = conv.bubbleColor || {};
                conv.bubbleColor.user = {
                    r: parseInt(userR.value),
                    g: parseInt(userG.value),
                    b: parseInt(userB.value),
                    alpha: parseFloat(userAlpha.value) / 100
                };
            }

            saveToStorage();
            renderConversations();

            // 如果当前正在聊天，更新聊天页面的显示
            if (window.AppState.currentChat && window.AppState.currentChat.id === charId) {
                window.AppState.currentChat = conv;
                
                const chatPage = document.getElementById('chat-page');
                if (chatPage) {
                    if (conv.chatBgImage) {
                        chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                        chatPage.style.backgroundSize = 'cover';
                        chatPage.style.backgroundPosition = 'center';
                        chatPage.style.backgroundAttachment = 'fixed';
                    } else {
                        chatPage.style.backgroundImage = 'none';
                    }
                }
                
                // 应用消息气泡颜色
                this.applyBubbleColors(conv);
                
                renderChatMessages(charId);
                const displayName = conv.remark || conv.name;
                document.getElementById('chat-title').textContent = displayName;
            }

            document.getElementById('character-settings-page').classList.remove('open');
            showToast('设置已保存');
        },

        /**
         * 应用消息气泡颜色到聊天页面
         */
        applyBubbleColors: function(conv) {
            if (!conv || !conv.bubbleColor) return;
            
            // 移除旧的样式标签（如果存在）
            const oldStyle = document.getElementById('bubble-color-style');
            if (oldStyle) {
                oldStyle.remove();
            }
            
            // 创建新的样式标签
            const style = document.createElement('style');
            style.id = 'bubble-color-style';
            
            let css = '';
            
            // 角色消息气泡（左侧/接收）
            if (conv.bubbleColor.char) {
                const { r, g, b, alpha } = conv.bubbleColor.char;
                css += `
                    .chat-bubble.received .chat-text {
                        background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
                    }
                `;
            }
            
            // 用户消息气泡（右侧/发送）
            if (conv.bubbleColor.user) {
                const { r, g, b, alpha } = conv.bubbleColor.user;
                css += `
                    .chat-bubble.sent .chat-text {
                        background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
                    }
                `;
            }
            
            style.textContent = css;
            document.head.appendChild(style);
        },

        /**
         * 删除角色
         */
        deleteCharacter: function(charId) {
            const conv = window.AppState.conversations.find(c => c.id === charId);
            if (!conv) return;

            if (!confirm(`确定要删除 ${conv.name} 及其所有聊天记录吗？`)) return;

            window.AppState.conversations = window.AppState.conversations.filter(c => c.id !== charId);
            window.AppState.friends = window.AppState.friends.filter(f => f.id !== charId);
            delete window.AppState.messages[charId];

            if (window.AppState.currentChat && window.AppState.currentChat.id === charId) {
                window.AppState.currentChat = null;
                document.getElementById('chat-page').classList.remove('open');
            }

            saveToStorage();
            renderConversations();
            renderFriends();

            document.getElementById('character-settings-page').classList.remove('open');
            showToast('角色已删除');
        },

        /**
         * 删除所有聊天记录
         */
        deleteAllMessages: function(chatId) {
            if (!confirm('确定要删除该角色的所有聊天记录吗？\n\n此操作将清空所有对话消息和心声，无法恢复！')) {
                return;
            }
            
            // 二次确认
            if (!confirm('这是最后的确认！\n\n删除后将回到初始状态，所有聊天记录将永久消失，确定继续吗？')) {
                return;
            }
            
            const conv = window.AppState.conversations.find(c => c.id === chatId);
            if (!conv) {
                showToast('未找到该对话');
                return;
            }
            
            // 清空消息记录
            window.AppState.messages[chatId] = [];
            
            // 清空总结记录
            if (conv.summaries) {
                conv.summaries = [];
            }
            
            // 保存到存储
            saveToStorage();
            
            // 关闭设置页面
            const settingsPage = document.getElementById('character-settings-page');
            if (settingsPage) {
                settingsPage.classList.remove('open');
            }
            
            // 如果当前正在查看这个对话，刷新聊天页面
            if (window.AppState.currentChat && window.AppState.currentChat.id === chatId) {
                if (typeof window.openChat === 'function') {
                    window.openChat(conv);
                }
            }
            
            showToast('所有聊天记录已删除');
        },

        /**
         * HTML转义
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

})();