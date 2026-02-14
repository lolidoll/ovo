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
            try {
                if (!chat) {
                    showToast('未找到角色信息');
                    return;
                }

                // 数据安全检查和初始化
                if (!window.AppState) {
                    showToast('系统未初始化');
                    return;
                }
                
                // 确保所有必要的数组都存在
                if (!window.AppState.conversations || !Array.isArray(window.AppState.conversations)) {
                    window.AppState.conversations = [];
                }
                if (!window.AppState.worldbooks || !Array.isArray(window.AppState.worldbooks)) {
                    window.AppState.worldbooks = [];
                }
                if (!window.AppState.friends || !Array.isArray(window.AppState.friends)) {
                    window.AppState.friends = [];
                }
                if (!window.AppState.emojiGroups || !Array.isArray(window.AppState.emojiGroups)) {
                    window.AppState.emojiGroups = [];
                }
                if (!window.AppState.userPersonas || !Array.isArray(window.AppState.userPersonas)) {
                    window.AppState.userPersonas = [];
                }
                if (!window.AppState.user) {
                    window.AppState.user = { name: '用户', personality: '' };
                }

                // 使用全屏子页面方案
                let page = document.getElementById('character-settings-page');
                if (!page) {
                    page = document.createElement('div');
                    page.id = 'character-settings-page';
                    page.className = 'sub-page';
                    const appContainer = document.getElementById('app-container');
                    if (!appContainer) {
                        showToast('页面容器未找到');
                        return;
                    }
                    appContainer.appendChild(page);
                }

                // 获取局部世界书列表
                const localWbs = window.AppState.worldbooks.filter(w => !w.isGlobal);
                
                // 获取角色应该使用的用户人设
                let currentPersona = null;
                let userNameForChar = chat.userNameForChar || window.AppState.user.name;
                let userPersonality = window.AppState.user.personality || '';
                
                if (window.UserPersonaManager) {
                    try {
                        currentPersona = window.UserPersonaManager.getPersonaForConversation(chat.id);
                        if (currentPersona) {
                            userNameForChar = currentPersona.userName;
                            userPersonality = currentPersona.personality || '';
                        }
                    } catch (e) {
                        console.error('Error getting persona:', e);
                    }
                }

                // 获取总结列表 - 重新从conversations中查找以确保获取最新数据
                const conv = window.AppState.conversations.find(c => c.id === chat.id);
                const hasSummaries = conv && conv.summaries && conv.summaries.length > 0;
                
                // 使用最新的conv数据替换chat，确保所有数据都是最新的
                if (conv) {
                    chat = conv;
                }
            
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
                                <div id="settings-char-avatar-display" class="avatar-display clickable-avatar" data-type="char">
                                    ${chat.avatar ? `<img src="${chat.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span class="avatar-initial">' + chat.name.charAt(0) + '</span>'}
                                </div>
                                <div class="avatar-label">${this.escapeHtml(chat.remark || chat.name)}</div>
                            </div>
                            
                            <div class="avatar-heart">
                                <svg viewBox="0 0 24 24" style="width:32px;height:32px;fill:#ffc0d4;">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </div>
                            
                            <div class="avatar-wrapper user-avatar-wrapper">
                                <div class="avatar-glow"></div>
                                <div id="settings-user-avatar-display" class="avatar-display clickable-avatar" data-type="user">
                                    ${chat.userAvatar ? `<img src="${chat.userAvatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span class="avatar-initial">' + window.AppState.user.name.charAt(0) + '</span>'}
                                </div>
                                <div class="avatar-label">${this.escapeHtml(userNameForChar)}</div>
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

                    <!-- Token统计 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M9 11l3 3L22 4"></path>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                            <span>Token统计</span>
                        </div>
                        <div class="card-body">
                            <div class="token-stats-container">
                                <div class="token-stat-item">
                                    <div class="token-stat-label">当前对话Token数</div>
                                    <div class="token-stat-value" id="current-token-count">计算中...</div>
                                    <div class="form-hint">包含系统提示词、角色设定、对话历史等所有内容</div>
                                </div>
                                <div class="token-stat-item">
                                    <div class="token-stat-label">消息数量</div>
                                    <div class="token-stat-value" id="message-count">-</div>
                                </div>
                                <button id="refresh-token-count-btn" class="btn-secondary btn-full" style="margin-top: 12px;">
                                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <span>刷新统计</span>
                                </button>
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

                    <!-- 主动发消息设置 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            <span>主动发消息设置</span>
                        </div>
                        <div class="card-body">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-message-enabled" ${(chat.autoMessageEnabled ?? false) ? 'checked' : ''} class="custom-checkbox">
                                <span>启用AI主动发消息</span>
                            </label>
                            <div class="form-hint">开启后，AI会在设定的时间间隔内随机选择一个时间点主动给你发消息</div>
                            
                            <div class="form-group" style="margin-top:16px;">
                                <label class="form-label">发消息间隔（分钟）</label>
                                <input type="number" id="auto-message-interval" value="${chat.autoMessageInterval ?? 3}" min="1" max="1440" class="form-input" placeholder="3">
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
                            <button id="bubble-color-lock-btn" class="bubble-lock-btn locked" title="锁定防止误触" style="background: #fff3cd; border-color: #ffc107; color: #ff6b00;">
                                <svg id="bubble-lock-icon" viewBox="0 0 24 24" class="lock-icon">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 6v6m0 0l-3-3m3 3l3-3"></path>
                                </svg>
                                <span id="bubble-lock-text">已锁定</span>
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

                    <!-- 消息显示设置 - 公主风格卡片 -->
                    <div class="settings-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            <span>消息显示设置</span>
                        </div>
                        <div class="card-body">
                            <label class="checkbox-label">
                                <input type="checkbox" id="show-message-timestamp" ${(chat.showMessageTimestamp ?? false) ? 'checked' : ''} class="custom-checkbox">
                                <span>显示消息时间戳</span>
                            </label>
                            <div class="form-hint">开启后，每条消息都会显示发送时间</div>
                            
                            <label class="checkbox-label" style="margin-top: 12px;">
                                <input type="checkbox" id="show-message-read-status" ${(chat.showMessageReadStatus ?? false) ? 'checked' : ''} class="custom-checkbox">
                                <span>显示已读/未读状态</span>
                            </label>
                            <div class="form-hint">开启后，每条消息会显示对方是否已读</div>
                        </div>
                    </div>

                    <!-- 消息字体颜色设置 - 公主风格卡片 -->
                    <div class="settings-card text-color-card">
                        <div class="card-header">
                            <svg viewBox="0 0 24 24" class="card-icon">
                                <path d="M4 7V4h16v3"></path>
                                <path d="M9 20h6"></path>
                                <path d="M12 4v16"></path>
                            </svg>
                            <span>消息字体颜色</span>
                        </div>
                        <div class="card-body">
                            <!-- 角色消息字体颜色 -->
                            <div class="bubble-section">
                                <label class="bubble-label">角色消息字体（左侧）</label>
                                
                                <div class="color-controls">
                                    <div class="rgb-grid">
                                        <div class="color-control">
                                            <label class="color-label">红 (R)</label>
                                            <input type="range" id="char-text-r" min="0" max="255" value="${chat.textColor?.char?.r ?? 51}" class="bubble-slider">
                                            <input type="number" id="char-text-r-input" min="0" max="255" value="${chat.textColor?.char?.r ?? 51}" class="bubble-input">
                                        </div>
                                        <div class="color-control">
                                            <label class="color-label">绿 (G)</label>
                                            <input type="range" id="char-text-g" min="0" max="255" value="${chat.textColor?.char?.g ?? 51}" class="bubble-slider">
                                            <input type="number" id="char-text-g-input" min="0" max="255" value="${chat.textColor?.char?.g ?? 51}" class="bubble-input">
                                        </div>
                                        <div class="color-control">
                                            <label class="color-label">蓝 (B)</label>
                                            <input type="range" id="char-text-b" min="0" max="255" value="${chat.textColor?.char?.b ?? 51}" class="bubble-slider">
                                            <input type="number" id="char-text-b-input" min="0" max="255" value="${chat.textColor?.char?.b ?? 51}" class="bubble-input">
                                        </div>
                                    </div>
                                    
                                    <div class="text-preview" style="color:rgb(${chat.textColor?.char?.r ?? 51}, ${chat.textColor?.char?.g ?? 51}, ${chat.textColor?.char?.b ?? 51}); background-color:rgba(${chat.bubbleColor?.char?.r ?? 240}, ${chat.bubbleColor?.char?.g ?? 240}, ${chat.bubbleColor?.char?.b ?? 240}, ${chat.bubbleColor?.char?.alpha ?? 0.85});" id="char-text-preview">
                                        这是角色消息文字预览
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 用户消息字体颜色 -->
                            <div class="bubble-section">
                                <label class="bubble-label">用户消息字体（右侧）</label>
                                
                                <div class="color-controls">
                                    <div class="rgb-grid">
                                        <div class="color-control">
                                            <label class="color-label">红 (R)</label>
                                            <input type="range" id="user-text-r" min="0" max="255" value="${chat.textColor?.user?.r ?? 51}" class="bubble-slider">
                                            <input type="number" id="user-text-r-input" min="0" max="255" value="${chat.textColor?.user?.r ?? 51}" class="bubble-input">
                                        </div>
                                        <div class="color-control">
                                            <label class="color-label">绿 (G)</label>
                                            <input type="range" id="user-text-g" min="0" max="255" value="${chat.textColor?.user?.g ?? 51}" class="bubble-slider">
                                            <input type="number" id="user-text-g-input" min="0" max="255" value="${chat.textColor?.user?.g ?? 51}" class="bubble-input">
                                        </div>
                                        <div class="color-control">
                                            <label class="color-label">蓝 (B)</label>
                                            <input type="range" id="user-text-b" min="0" max="255" value="${chat.textColor?.user?.b ?? 51}" class="bubble-slider">
                                            <input type="number" id="user-text-b-input" min="0" max="255" value="${chat.textColor?.user?.b ?? 51}" class="bubble-input">
                                        </div>
                                    </div>
                                    
                                    <div class="text-preview" style="color:rgb(${chat.textColor?.user?.r ?? 51}, ${chat.textColor?.user?.g ?? 51}, ${chat.textColor?.user?.b ?? 51}); background-color:rgba(${chat.bubbleColor?.user?.r ?? 255}, ${chat.bubbleColor?.user?.g ?? 200}, ${chat.bubbleColor?.user?.b ?? 230}, ${chat.bubbleColor?.user?.alpha ?? 0.85});" id="user-text-preview">
                                        这是用户消息文字预览
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
            
            // 显示页面 - 强制设置样式确保手机端正常显示
            console.log('Opening character settings page...');
            console.log('Page element:', page);
            console.log('Page classList:', page.classList);
            
            // 确保页面在DOM中
            if (!document.getElementById('character-settings-page')) {
                console.error('Character settings page not in DOM');
                showToast('页面元素未找到');
                return;
            }
            
            // 先移除open类（如果存在）
            page.classList.remove('open');
            
            // 重置所有样式
            page.style.cssText = '';
            
            // 强制重排
            void page.offsetHeight;
            
            // 立即设置display，然后添加open类触发动画
            page.style.display = 'flex';
            page.style.visibility = 'visible';
            
            console.log('Display set to flex, adding open class...');
            
            // 使用setTimeout确保display生效后再添加open类
            setTimeout(() => {
                page.classList.add('open');
                console.log('Open class added');
                console.log('Final computed style:', window.getComputedStyle(page).transform);
                console.log('Final computed display:', window.getComputedStyle(page).display);
                console.log('Final computed visibility:', window.getComputedStyle(page).visibility);
            }, 10);
            
                this.bindCharacterSettingsEvents(chat);
                console.log('Character settings page opened successfully');
                
            } catch (error) {
                console.error('Error in openCharacterSettings:', error);
                console.error('Error stack:', error.stack);
                showToast('打开角色设置失败：' + error.message);
                alert('详细错误：' + error.message + '\n\n' + error.stack);
            }
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
                    
                    // 关闭前，如果当前正在聊天，刷新聊天页面的背景图
                    console.log('🔙 返回按钮被点击，准备刷新背景');
                    if (window.AppState.currentChat && window.AppState.currentChat.id === chat.id) {
                        console.log('ℹ️ 当前正在该聊天中，开始刷新');
                        // 从conversations重新获取最新数据
                        const conv = window.AppState.conversations.find(c => c.id === chat.id);
                        if (conv) {
                            console.log('✅ 找到conv对象:', {
                                convId: conv.id,
                                hasBgImage: !!conv.chatBgImage,
                                bgImagePreview: conv.chatBgImage ? conv.chatBgImage.substring(0, 100) : 'none'
                            });
                            
                            // 更新currentChat引用
                            window.AppState.currentChat = conv;
                            console.log('✅ currentChat引用已更新');
                            
                            // 更新聊天页面背景
                            const chatPage = document.getElementById('chat-page');
                            if (chatPage) {
                                if (conv.chatBgImage) {
                                    chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                                    chatPage.style.backgroundSize = 'cover';
                                    chatPage.style.backgroundPosition = 'center';
                                    chatPage.style.backgroundAttachment = 'fixed';
                                    console.log('✅ 背景图已应用到聊天页面');
                                    
                                    // 将chat-messages容器背景设为透明，以显示背景图
                                    const chatMessages = document.getElementById('chat-messages');
                                    if (chatMessages) {
                                        chatMessages.style.backgroundColor = 'transparent';
                                        console.log('✅ 返回按钮 - chat-messages背景已设为透明');
                                    }
                                } else {
                                    chatPage.style.backgroundImage = 'none';
                                    // 恢复chat-messages的默认背景色
                                    const chatMessages = document.getElementById('chat-messages');
                                    if (chatMessages) {
                                        chatMessages.style.backgroundColor = '';
                                    }
                                    console.log('ℹ️ 清除了背景图（conv中没有chatBgImage）');
                                }
                            } else {
                                console.warn('⚠️ 未找到chat-page元素');
                            }
                            
                            // 应用消息气泡颜色
                            if (window.CharacterSettingsManager) {
                                window.CharacterSettingsManager.applyBubbleColors(conv);
                            }
                        } else {
                            console.warn('⚠️ 在conversations中未找到对话');
                        }
                    } else {
                        console.log('ℹ️ 当前未在该聊天中或currentChat为空');
                    }
                    
                    const page = document.getElementById('character-settings-page');
                    if (page) {
                        console.log('Closing character-settings-page');
                        page.classList.remove('open');
                        // 等待动画完成后隐藏
                        setTimeout(() => {
                            page.style.display = 'none';
                            page.style.visibility = 'hidden';
                            console.log('Page hidden');
                        }, 300);
                    }
                });
            } else {
                console.warn('char-settings-back-btn not found');
            }

            // 角色头像点击修改
            const charAvatarDisplay = document.getElementById('settings-char-avatar-display');
            if (charAvatarDisplay) {
                charAvatarDisplay.addEventListener('click', () => {
                    window.openImagePickerForCharacter('avatar', chat.id);
                });
            }

            // 用户头像点击修改
            const userAvatarDisplay = document.getElementById('settings-user-avatar-display');
            if (userAvatarDisplay) {
                userAvatarDisplay.addEventListener('click', () => {
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
                    const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === chat.id);
                    if (conv) {
                        conv.chatBgImage = null;
                        
                        // 如果当前正在聊天，同步更新 currentChat 引用和聊天页面背景
                        if (window.AppState.currentChat && window.AppState.currentChat.id === chat.id) {
                            window.AppState.currentChat = conv;
                            
                            const chatPage = document.getElementById('chat-page');
                            if (chatPage) {
                                chatPage.style.backgroundImage = 'none';
                            }
                        }
                        
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

            // Token统计刷新按钮
            const refreshTokenBtn = document.getElementById('refresh-token-count-btn');
            if (refreshTokenBtn) {
                refreshTokenBtn.addEventListener('click', () => {
                    this.updateTokenCount(chat.id);
                });
            }

            // 手动总结按钮
            const manualSummaryBtn = document.getElementById('manual-summary-btn');
            if (manualSummaryBtn) {
                manualSummaryBtn.addEventListener('click', () => {
                    this.manualSummarize(chat.id);
                });
            }
            
            // 初始加载token统计
            this.updateTokenCount(chat.id);

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
            // 锁定状态管理 - 默认为锁定状态
            let isLocked = true;
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
                
                // 同步更新字体颜色预览的背景
                if (charTextPreview) {
                    charTextPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                }
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
                
                // 同步更新字体颜色预览的背景
                if (userTextPreview) {
                    userTextPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                }
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
                
                // 同步更新字体颜色预览的背景
                if (charTextPreview) {
                    charTextPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
                }
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
                
                // 同步更新字体颜色预览的背景
                if (userTextPreview) {
                    userTextPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
                }
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
            
            // 字体颜色控制
            const charTextR = document.getElementById('char-text-r');
            const charTextG = document.getElementById('char-text-g');
            const charTextB = document.getElementById('char-text-b');
            const charTextRInput = document.getElementById('char-text-r-input');
            const charTextGInput = document.getElementById('char-text-g-input');
            const charTextBInput = document.getElementById('char-text-b-input');
            const charTextPreview = document.getElementById('char-text-preview');
            
            const userTextR = document.getElementById('user-text-r');
            const userTextG = document.getElementById('user-text-g');
            const userTextB = document.getElementById('user-text-b');
            const userTextRInput = document.getElementById('user-text-r-input');
            const userTextGInput = document.getElementById('user-text-g-input');
            const userTextBInput = document.getElementById('user-text-b-input');
            const userTextPreview = document.getElementById('user-text-preview');
            
            // 更新角色字体颜色预览
            const updateCharTextPreview = () => {
                if (isLocked) return;
                const r = charTextR.value;
                const g = charTextG.value;
                const b = charTextB.value;
                
                charTextRInput.value = r;
                charTextGInput.value = g;
                charTextBInput.value = b;
                
                charTextPreview.style.color = `rgb(${r}, ${g}, ${b})`;
                
                // 同步更新背景色为当前气泡颜色
                if (charR && charG && charB && charAlpha) {
                    const bgR = charR.value;
                    const bgG = charG.value;
                    const bgB = charB.value;
                    const bgAlpha = charAlpha.value / 100;
                    charTextPreview.style.backgroundColor = `rgba(${bgR}, ${bgG}, ${bgB}, ${bgAlpha})`;
                }
            };
            
            // 更新用户字体颜色预览
            const updateUserTextPreview = () => {
                if (isLocked) return;
                const r = userTextR.value;
                const g = userTextG.value;
                const b = userTextB.value;
                
                userTextRInput.value = r;
                userTextGInput.value = g;
                userTextBInput.value = b;
                
                userTextPreview.style.color = `rgb(${r}, ${g}, ${b})`;
                
                // 同步更新背景色为当前气泡颜色
                if (userR && userG && userB && userAlpha) {
                    const bgR = userR.value;
                    const bgG = userG.value;
                    const bgB = userB.value;
                    const bgAlpha = userAlpha.value / 100;
                    userTextPreview.style.backgroundColor = `rgba(${bgR}, ${bgG}, ${bgB}, ${bgAlpha})`;
                }
            };
            
            // 从输入框更新滑块（角色字体）
            const updateCharTextFromInput = () => {
                if (isLocked) return;
                const r = Math.max(0, Math.min(255, parseInt(charTextRInput.value) || 0));
                const g = Math.max(0, Math.min(255, parseInt(charTextGInput.value) || 0));
                const b = Math.max(0, Math.min(255, parseInt(charTextBInput.value) || 0));
                
                charTextR.value = r;
                charTextG.value = g;
                charTextB.value = b;
                
                charTextRInput.value = r;
                charTextGInput.value = g;
                charTextBInput.value = b;
                
                charTextPreview.style.color = `rgb(${r}, ${g}, ${b})`;
                
                // 同步更新背景色为当前气泡颜色
                if (charR && charG && charB && charAlpha) {
                    const bgR = charR.value;
                    const bgG = charG.value;
                    const bgB = charB.value;
                    const bgAlpha = charAlpha.value / 100;
                    charTextPreview.style.backgroundColor = `rgba(${bgR}, ${bgG}, ${bgB}, ${bgAlpha})`;
                }
            };
            
            // 从输入框更新滑块（用户字体）
            const updateUserTextFromInput = () => {
                if (isLocked) return;
                const r = Math.max(0, Math.min(255, parseInt(userTextRInput.value) || 0));
                const g = Math.max(0, Math.min(255, parseInt(userTextGInput.value) || 0));
                const b = Math.max(0, Math.min(255, parseInt(userTextBInput.value) || 0));
                
                userTextR.value = r;
                userTextG.value = g;
                userTextB.value = b;
                
                userTextRInput.value = r;
                userTextGInput.value = g;
                userTextBInput.value = b;
                
                userTextPreview.style.color = `rgb(${r}, ${g}, ${b})`;
                
                // 同步更新背景色为当前气泡颜色
                if (userR && userG && userB && userAlpha) {
                    const bgR = userR.value;
                    const bgG = userG.value;
                    const bgB = userB.value;
                    const bgAlpha = userAlpha.value / 100;
                    userTextPreview.style.backgroundColor = `rgba(${bgR}, ${bgG}, ${bgB}, ${bgAlpha})`;
                }
            };
            
            // 绑定字体颜色滑块事件监听器
            if (charTextR) charTextR.addEventListener('input', updateCharTextPreview);
            if (charTextG) charTextG.addEventListener('input', updateCharTextPreview);
            if (charTextB) charTextB.addEventListener('input', updateCharTextPreview);
            
            if (userTextR) userTextR.addEventListener('input', updateUserTextPreview);
            if (userTextG) userTextG.addEventListener('input', updateUserTextPreview);
            if (userTextB) userTextB.addEventListener('input', updateUserTextPreview);
            
            // 绑定字体颜色输入框事件监听器
            if (charTextRInput) charTextRInput.addEventListener('change', updateCharTextFromInput);
            if (charTextGInput) charTextGInput.addEventListener('change', updateCharTextFromInput);
            if (charTextBInput) charTextBInput.addEventListener('change', updateCharTextFromInput);
            
            if (userTextRInput) userTextRInput.addEventListener('change', updateUserTextFromInput);
            if (userTextGInput) userTextGInput.addEventListener('change', updateUserTextFromInput);
            if (userTextBInput) userTextBInput.addEventListener('change', updateUserTextFromInput);
            
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
            
            [charR, charG, charB, charAlpha, userR, userG, userB, userAlpha,
             charTextR, charTextG, charTextB, userTextR, userTextG, userTextB].forEach(el => {
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
            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === chatId);
            
            if (!conv) return;
            
            if (selectedPersonaId) {
                const persona = window.AppState.userPersonas && window.AppState.userPersonas.find(p => p.id === selectedPersonaId);
                if (persona) {
                    document.getElementById('user-name-for-char').value = persona.userName;
                    document.getElementById('user-desc-input').value = persona.personality || '';
                    conv.boundPersonaId = selectedPersonaId;
                    showToast('已应用人设: ' + persona.name);
                }
            } else {
                const defaultPersona = window.AppState.userPersonas && window.AppState.userPersonas.find(p => p.id === window.AppState.defaultPersonaId);
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
         * 打开聊天背景图片选择器（iOS兼容，支持图片压缩）
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
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // 验证文件类型
                if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
                    showToast('请选择图片文件');
                    return;
                }
                
                // 验证文件大小（限制3MB，移动端更严格）
                if (file.size > 3 * 1024 * 1024) {
                    showToast('图片大小不能超过3MB');
                    return;
                }
                
                try {
                    // 显示加载提示
                    showToast('正在处理图片...');
                    
                    // 使用Canvas压缩图片
                    const compressedDataUrl = await this.compressImage(file, 1920, 1080, 0.85);
                    
                    const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === charId);
                    if (conv) {
                        conv.chatBgImage = compressedDataUrl;
                        console.log('✅ 背景图已设置到conv对象:', {
                            convId: conv.id,
                            convName: conv.name,
                            bgImageLength: compressedDataUrl.length,
                            bgImagePreview: compressedDataUrl.substring(0, 100)
                        });
                        
                        // 如果当前正在聊天，同步更新 currentChat 引用和聊天页面背景
                        if (window.AppState.currentChat && window.AppState.currentChat.id === charId) {
                            window.AppState.currentChat = conv;
                            console.log('✅ currentChat引用已更新');
                            
                            const chatPage = document.getElementById('chat-page');
                            if (chatPage) {
                                chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                                chatPage.style.backgroundSize = 'cover';
                                chatPage.style.backgroundPosition = 'center';
                                chatPage.style.backgroundAttachment = 'fixed';
                                console.log('✅ 聊天页面背景已应用');
                            } else {
                                console.warn('⚠️ 未找到chat-page元素');
                            }
                        } else {
                            console.log('ℹ️ 当前未在该聊天中，跳过实时更新');
                        }
                        
                        saveToStorage();
                        console.log('✅ 数据已保存到localStorage');
                        
                        // 关闭设置页面并重新打开以刷新界面
                        const settingsPage = document.getElementById('character-settings-page');
                        if (settingsPage) {
                            settingsPage.classList.remove('open');
                            setTimeout(() => {
                                this.openCharacterSettings(conv);
                                showToast('背景图片已更新');
                                
                                // 检测并修复荣耀/Edge移动版渲染问题
                                this.detectAndFixBackgroundIssues();
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('图片处理失败:', error);
                    showToast('图片处理失败，请重试');
                }
            }, { once: true });
            
            // 触发文件选择（iOS需要在用户交互中直接调用）
            input.click();
        },

        /**
         * 压缩图片以优化移动端性能
         */
        compressImage: function(file, maxWidth, maxHeight, quality) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            // 计算缩放比例
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width = Math.round(width * ratio);
                                height = Math.round(height * ratio);
                            }
                            
                            // 创建Canvas并绘制
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            
                            // 设置平滑缩放
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // 导出为JPEG（WebP在某些浏览器可能不支持）
                            const dataUrl = canvas.toDataURL('image/jpeg', quality);
                            console.log('图片压缩完成:', {
                                原始尺寸: `${img.width}x${img.height}`,
                                压缩后尺寸: `${width}x${height}`,
                                原始大小: `${(file.size / 1024).toFixed(2)}KB`,
                                压缩后大小: `${(dataUrl.length * 0.75 / 1024).toFixed(2)}KB`
                            });
                            resolve(dataUrl);
                        } catch (error) {
                            console.error('Canvas处理失败:', error);
                            reject(error);
                        }
                    };
                    img.onerror = (error) => {
                        console.error('图片加载失败:', error);
                        reject(new Error('图片加载失败'));
                    };
                    img.src = e.target.result;
                };
                reader.onerror = (error) => {
                    console.error('文件读取失败:', error);
                    reject(new Error('文件读取失败'));
                };
                reader.readAsDataURL(file);
            });
        },

        /**
         * 检测并修复荣耀/Edge移动版背景图渲染问题
         */
        detectAndFixBackgroundIssues: function() {
            const bgPreview = document.querySelector('.bg-preview');
            if (!bgPreview) return;
            
            const computedStyle = window.getComputedStyle(bgPreview);
            const backgroundImage = computedStyle.backgroundImage;
            
            console.log('背景图诊断:', {
                backgroundImage: backgroundImage.substring(0, 100) + '...',
                hasInlineStyle: bgPreview.hasAttribute('style'),
                backgroundColor: computedStyle.backgroundColor
            });
            
            // 检测Edge移动版或荣耀设备
            const isEdgeMobile = /Edge/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
            const isHonor = /Honor|HONOR|harmonyos/i.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            
            if (isEdgeMobile || isHonor || isAndroid) {
                console.log('检测到移动设备，应用兼容性修复');
                
                // 强制重绘 - 解决某些浏览器的渲染缓存问题
                bgPreview.style.display = 'none';
                void bgPreview.offsetHeight; // 触发重排
                bgPreview.style.display = 'flex';
                
                // 确保背景图样式正确应用
                setTimeout(() => {
                    const style = bgPreview.getAttribute('style');
                    if (style && style.includes('background-image')) {
                        console.log('背景图样式已正确应用');
                    }
                }, 50);
            }
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
            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === convId);
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
                    
                    // 如果是自动总结，清理旧消息，只保留最新的N条
                    if (isAutomatic) {
                        const keepLatest = window.AppState.apiSettings.summaryKeepLatest || 10;
                        const allMessages = window.AppState.messages[convId] || [];
                        
                        if (allMessages.length > keepLatest) {
                            // 标记旧消息为已总结
                            const oldMessages = allMessages.slice(0, allMessages.length - keepLatest);
                            oldMessages.forEach(m => {
                                m.isSummarized = true;
                            });
                            
                            saveToStorage();
                            console.log(`✅ 自动总结完成，标记了 ${oldMessages.length} 条旧消息为已总结`);
                            showToast(`已标记 ${oldMessages.length} 条旧消息，保留最新 ${keepLatest} 条`);
                        }
                    }
                    
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
            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === convId);
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

            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === convId);
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
            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === charId);
            if (!conv) return;

            // 保存基本信息
            conv.name = document.getElementById('char-name-input').value || conv.name;
            conv.remark = document.getElementById('char-remark-input').value.trim();
            conv.description = document.getElementById('char-desc-input').value;
            conv.userNameForChar = document.getElementById('user-name-for-char').value || window.AppState.user.name;

            // 同步更新好友列表中的备注
            const friend = window.AppState.friends && window.AppState.friends.find(f => f.id === charId);
            if (friend) {
                friend.remark = conv.remark;
            }

            // 保存绑定的表情包分组
            const egCheckboxes = document.querySelectorAll('.eg-checkbox:checked');
            conv.boundEmojiGroups = Array.from(egCheckboxes).map(cb => cb.value);
            
            // 如果没有绑定任何表情包分组且表情包分组存在，自动绑定默认分组
            if (conv.boundEmojiGroups.length === 0 && window.AppState.emojiGroups && window.AppState.emojiGroups.length > 0) {
                conv.boundEmojiGroups = [window.AppState.emojiGroups[0].id];
                console.log('ℹ️ 自动绑定了默认表情包分组:', window.AppState.emojiGroups[0].name);
            }

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

            // 保存消息字体颜色设置
            const charTextR = document.getElementById('char-text-r');
            const charTextG = document.getElementById('char-text-g');
            const charTextB = document.getElementById('char-text-b');
            
            const userTextR = document.getElementById('user-text-r');
            const userTextG = document.getElementById('user-text-g');
            const userTextB = document.getElementById('user-text-b');
            
            if (charTextR && charTextG && charTextB) {
                conv.textColor = conv.textColor || {};
                conv.textColor.char = {
                    r: parseInt(charTextR.value),
                    g: parseInt(charTextG.value),
                    b: parseInt(charTextB.value)
                };
            }
            
            if (userTextR && userTextG && userTextB) {
                conv.textColor = conv.textColor || {};
                conv.textColor.user = {
                    r: parseInt(userTextR.value),
                    g: parseInt(userTextG.value),
                    b: parseInt(userTextB.value)
                };
            }

            // 保存消息显示设置
            const showTimestampCheckbox = document.getElementById('show-message-timestamp');
            const showReadStatusCheckbox = document.getElementById('show-message-read-status');
            
            if (showTimestampCheckbox) {
                conv.showMessageTimestamp = showTimestampCheckbox.checked;
            }
            if (showReadStatusCheckbox) {
                conv.showMessageReadStatus = showReadStatusCheckbox.checked;
            }

            // 保存主动发消息设置
            const autoMessageEnabledCheckbox = document.getElementById('auto-message-enabled');
            if (autoMessageEnabledCheckbox) {
                conv.autoMessageEnabled = autoMessageEnabledCheckbox.checked;
            }
            
            // 保存主动发消息间隔时间
            const autoMessageIntervalInput = document.getElementById('auto-message-interval');
            if (autoMessageIntervalInput) {
                let interval = parseInt(autoMessageIntervalInput.value) || 3;
                // 限制范围：1-1440分钟（1分钟到24小时）
                interval = Math.max(1, Math.min(1440, interval));
                conv.autoMessageInterval = interval;
            }

            // 如果当前正在聊天，必须先更新 currentChat 引用，确保数据同步
            if (window.AppState.currentChat && window.AppState.currentChat.id === charId) {
                window.AppState.currentChat = conv;
            }
            
            saveToStorage();
            renderConversations();

            // 如果当前正在聊天，更新聊天页面的显示
            console.log('💾 saveCharacterSettings - 检查是否需要更新聊天页面:', {
                hasCurrentChat: !!window.AppState.currentChat,
                currentChatId: window.AppState.currentChat?.id,
                charId: charId,
                match: window.AppState.currentChat?.id === charId
            });
            
            if (window.AppState.currentChat && window.AppState.currentChat.id === charId) {
                console.log('✅ saveCharacterSettings - 开始更新聊天页面');
                const chatPage = document.getElementById('chat-page');
                console.log('📄 chatPage元素:', chatPage ? '找到' : '未找到');
                
                if (chatPage) {
                    console.log('🖼️ conv.chatBgImage:', {
                        exists: !!conv.chatBgImage,
                        preview: conv.chatBgImage ? conv.chatBgImage.substring(0, 100) : 'none'
                    });
                    
                    if (conv.chatBgImage) {
                        chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                        chatPage.style.backgroundSize = 'cover';
                        chatPage.style.backgroundPosition = 'center';
                        chatPage.style.backgroundAttachment = 'fixed';
                        console.log('✅ saveCharacterSettings - 背景图已应用');
                        
                        // 将chat-messages容器背景设为透明，以显示背景图
                        const chatMessages = window.opener ? window.opener.document.getElementById('chat-messages') : document.getElementById('chat-messages');
                        if (chatMessages) {
                            chatMessages.style.backgroundColor = 'transparent';
                            console.log('✅ saveCharacterSettings - chat-messages背景已设为透明');
                        }
                        
                        // 验证是否真的应用了
                        setTimeout(() => {
                            const appliedBg = chatPage.style.backgroundImage;
                            console.log('🔍 saveCharacterSettings - 验证背景图:', appliedBg ? appliedBg.substring(0, 100) : 'none');
                        }, 100);
                    } else {
                        chatPage.style.backgroundImage = 'none';
                        // 恢复chat-messages的默认背景色
                        const chatMessages = window.opener ? window.opener.document.getElementById('chat-messages') : document.getElementById('chat-messages');
                        if (chatMessages) {
                            chatMessages.style.backgroundColor = '';
                        }
                        console.log('ℹ️ saveCharacterSettings - 清除背景图');
                    }
                } else {
                    console.warn('⚠️ saveCharacterSettings - 未找到chat-page元素');
                }
                
                // 应用消息气泡颜色
                this.applyBubbleColors(conv);
                
                renderChatMessages(charId);
                const displayName = conv.remark || conv.name;
                document.getElementById('chat-title').textContent = displayName;
            } else {
                console.log('ℹ️ saveCharacterSettings - 当前未在该聊天中，跳过UI更新');
            }

            document.getElementById('character-settings-page').classList.remove('open');
            showToast('设置已保存');
        },

        /**
         * 应用消息气泡颜色和字体颜色到聊天页面
         */
        applyBubbleColors: function(conv) {
            if (!conv) return;
            
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
            if (conv.bubbleColor && conv.bubbleColor.char) {
                const { r, g, b, alpha } = conv.bubbleColor.char;
                css += `
                    .chat-bubble.received .chat-text {
                        background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
                    }
                `;
            }
            
            // 用户消息气泡（右侧/发送）
            if (conv.bubbleColor && conv.bubbleColor.user) {
                const { r, g, b, alpha } = conv.bubbleColor.user;
                css += `
                    .chat-bubble.sent .chat-text {
                        background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
                    }
                `;
            }
            
            // 角色消息字体颜色（左侧/接收）
            if (conv.textColor && conv.textColor.char) {
                const { r, g, b } = conv.textColor.char;
                css += `
                    .chat-bubble.received .chat-text {
                        color: rgb(${r}, ${g}, ${b}) !important;
                    }
                `;
            }
            
            // 用户消息字体颜色（右侧/发送）
            if (conv.textColor && conv.textColor.user) {
                const { r, g, b } = conv.textColor.user;
                css += `
                    .chat-bubble.sent .chat-text {
                        color: rgb(${r}, ${g}, ${b}) !important;
                    }
                `;
            }
            
            style.textContent = css;
            document.head.appendChild(style);
        },

        /**
         * 显示自定义确认弹窗（公主风格）
         */
        showPrincessConfirm: function(message, onConfirm, isDanger = false) {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'princess-confirm-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999999;
                animation: fadeIn 0.2s ease;
            `;
            
            // 创建弹窗
            const dialog = document.createElement('div');
            dialog.className = 'princess-confirm-dialog';
            dialog.style.cssText = `
                background: #ffffff;
                border-radius: 24px;
                padding: 0;
                max-width: 90%;
                width: 340px;
                box-shadow: 0 12px 40px rgba(255, 182, 193, 0.3);
                animation: slideUp 0.3s ease;
                overflow: hidden;
                border: 2px solid ${isDanger ? '#ffe4e4' : '#ffe9f3'};
            `;
            
            // 弹窗头部
            const header = document.createElement('div');
            header.style.cssText = `
                background: linear-gradient(135deg, ${isDanger ? '#ffe4e4 0%, #ffd4d4 100%' : '#fff5f9 0%, #ffeff5 100%'});
                padding: 20px;
                text-align: center;
                border-bottom: 2px solid ${isDanger ? '#ffcccc' : '#ffe4ed'};
            `;
            
            const icon = document.createElement('div');
            icon.innerHTML = isDanger
                ? `<svg viewBox="0 0 24 24" style="width:48px;height:48px;stroke:#ff6b6b;stroke-width:2;fill:none;margin:0 auto;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                   </svg>`
                : `<svg viewBox="0 0 24 24" style="width:48px;height:48px;stroke:#ffb6c8;stroke-width:2;fill:none;margin:0 auto;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                   </svg>`;
            header.appendChild(icon);
            
            // 弹窗内容
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 24px;
                text-align: center;
                color: #333;
                font-size: 15px;
                line-height: 1.6;
                white-space: pre-line;
            `;
            content.textContent = message;
            
            // 按钮容器
            const buttons = document.createElement('div');
            buttons.style.cssText = `
                display: flex;
                gap: 12px;
                padding: 0 24px 24px;
            `;
            
            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 12px 24px;
                border: 2px solid #e0e0e0;
                background: #fff;
                color: #666;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            cancelBtn.onmouseover = () => {
                cancelBtn.style.background = '#f5f5f5';
                cancelBtn.style.borderColor = '#d0d0d0';
            };
            cancelBtn.onmouseout = () => {
                cancelBtn.style.background = '#fff';
                cancelBtn.style.borderColor = '#e0e0e0';
            };
            cancelBtn.onclick = () => {
                overlay.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => overlay.remove(), 200);
            };
            
            // 确认按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 12px 24px;
                border: none;
                background: linear-gradient(135deg, ${isDanger ? '#ff6b6b 0%, #ff5252 100%' : '#ffb6c8 0%, #ff9db8 100%'});
                color: #fff;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px ${isDanger ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 182, 193, 0.3)'};
            `;
            confirmBtn.onmouseover = () => {
                confirmBtn.style.transform = 'translateY(-2px)';
                confirmBtn.style.boxShadow = `0 6px 16px ${isDanger ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 182, 193, 0.4)'}`;
            };
            confirmBtn.onmouseout = () => {
                confirmBtn.style.transform = 'translateY(0)';
                confirmBtn.style.boxShadow = `0 4px 12px ${isDanger ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 182, 193, 0.3)'}`;
            };
            confirmBtn.onclick = () => {
                overlay.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => {
                    overlay.remove();
                    if (onConfirm) onConfirm();
                }, 200);
            };
            
            // 组装弹窗
            buttons.appendChild(cancelBtn);
            buttons.appendChild(confirmBtn);
            dialog.appendChild(header);
            dialog.appendChild(content);
            dialog.appendChild(buttons);
            overlay.appendChild(dialog);
            
            // 添加动画样式
            if (!document.getElementById('princess-confirm-animations')) {
                const style = document.createElement('style');
                style.id = 'princess-confirm-animations';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 添加到页面
            document.body.appendChild(overlay);
            
            // 点击遮罩层关闭
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cancelBtn.click();
                }
            };
        },

        /**
         * 删除角色
         */
        deleteCharacter: function(charId) {
            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === charId);
            if (!conv) return;

            this.showPrincessConfirm(
                `确定要删除 ${conv.name} 及其所有聊天记录吗？`,
                () => {
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
                true
            );
        },

        /**
         * 删除所有聊天记录
         */
        deleteAllMessages: function(chatId) {
            this.showPrincessConfirm(
                '确定要删除该角色的所有聊天记录吗？\n\n此操作将清空所有对话消息、心声记录和心理状态，无法恢复！',
                () => {
                    // 二次确认
                    this.showPrincessConfirm(
                        '这是最后的确认！\n\n删除后将回到初始状态，所有聊天记录和心理状态记录将永久消失，确定继续吗？',
                        () => {
                            this.performDeleteAllMessages(chatId);
                        },
                        true
                    );
                },
                true
            );
        },

        /**
         * 执行删除所有聊天记录
         */
        performDeleteAllMessages: function(chatId) {
            
            const conv = window.AppState.conversations && window.AppState.conversations.find(c => c.id === chatId);
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
            
            // 清空该角色的心声数据
            if (typeof momentsManager !== 'undefined' && momentsManager) {
                try {
                    // 获取角色名称（优先使用备注名）
                    const charName = conv.remark || conv.name;
                    
                    // 删除该角色发布的所有心声
                    if (momentsManager.moments && Array.isArray(momentsManager.moments)) {
                        momentsManager.moments = momentsManager.moments.filter(moment => {
                            return moment.author !== charName;
                        });
                    }
                    
                    // 删除该角色的所有评论和回复
                    if (momentsManager.comments && typeof momentsManager.comments === 'object') {
                        Object.keys(momentsManager.comments).forEach(momentId => {
                            if (Array.isArray(momentsManager.comments[momentId])) {
                                // 过滤掉该角色的评论
                                momentsManager.comments[momentId] = momentsManager.comments[momentId].filter(comment => {
                                    // 删除该角色的评论
                                    if (comment.author === charName) {
                                        return false;
                                    }
                                    // 删除该角色的回复
                                    if (comment.replies && Array.isArray(comment.replies)) {
                                        comment.replies = comment.replies.filter(reply => reply.author !== charName);
                                    }
                                    return true;
                                });
                            }
                        });
                    }
                    
                    // 删除该角色相关的通知
                    if (momentsManager.notifications && Array.isArray(momentsManager.notifications)) {
                        momentsManager.notifications = momentsManager.notifications.filter(notif => {
                            return notif.from !== charName;
                        });
                    }
                    
                    // 保存心声数据
                    momentsManager.saveToStorage();
                    
                    console.log(`已清除角色 ${charName} 的所有心声数据`);
                } catch (e) {
                    console.error('清除心声数据时出错:', e);
                }
            }

            // 清空角色的心理状态记录(mindStates)
            if (conv.mindStates && Array.isArray(conv.mindStates)) {
                const mindStatesCount = conv.mindStates.length;
                conv.mindStates = [];
                console.log(`已清除角色的 ${mindStatesCount} 条心理状态记录`);
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
            
            showToast('所有聊天记录和心声已删除');
        },

        /**
         * 更新Token统计显示
         */
        updateTokenCount: function(chatId) {
            const tokenCountEl = document.getElementById('current-token-count');
            const messageCountEl = document.getElementById('message-count');
            
            if (!tokenCountEl || !messageCountEl) return;
            
            try {
                // 检查MainAPIManager是否可用
                if (window.MainAPIManager && typeof window.MainAPIManager.getConversationTokenStats === 'function') {
                    const stats = window.MainAPIManager.getConversationTokenStats(chatId);
                    tokenCountEl.textContent = stats.formattedTokens + ' tokens';
                    // 使用粉色公主风格主题颜色
                    tokenCountEl.style.color = '#ff9db8';
                    tokenCountEl.style.fontWeight = 'bold';
                    tokenCountEl.style.fontSize = '24px';
                    tokenCountEl.style.textShadow = '0 1px 2px rgba(255, 157, 184, 0.1)';
                    
                    messageCountEl.textContent = stats.messageCount + ' 条';
                    // 使用粉色公主风格主题颜色
                    messageCountEl.style.color = '#ff9db8';
                    messageCountEl.style.fontWeight = 'bold';
                    messageCountEl.style.fontSize = '20px';
                } else {
                    tokenCountEl.textContent = '功能不可用';
                    tokenCountEl.style.color = '#ffb6c8';
                    tokenCountEl.style.opacity = '0.6';
                    messageCountEl.textContent = '-';
                    messageCountEl.style.color = '#ffb6c8';
                    messageCountEl.style.opacity = '0.6';
                }
            } catch (error) {
                console.error('Token统计计算失败:', error);
                tokenCountEl.textContent = '计算失败';
                tokenCountEl.style.color = '#ff6b9d';
                messageCountEl.textContent = '-';
                messageCountEl.style.color = '#ffb6c8';
                messageCountEl.style.opacity = '0.6';
            }
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