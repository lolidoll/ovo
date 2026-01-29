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
            if (!chat) {
                showToast('未找到角色信息');
                return;
            }

            let page = document.getElementById('character-settings-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'character-settings-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
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
                <div class="sub-nav">
                    <div class="back-btn" id="char-settings-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">角色设置</div>
                </div>
                
                <div class="sub-content" style="padding:16px;background:#f5f5f5;">
                    <!-- 头像区域 -->
                    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;">
                        <div style="text-align:center;">
                            <div style="display:flex;justify-content:center;align-items:flex-end;gap:16px;margin-bottom:12px;">
                                <!-- 角色头像 -->
                                <div>
                                    <div id="settings-char-avatar-display" style="width:70px;height:70px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;margin-bottom:8px;border:2px solid #000;overflow:hidden;">
                                        ${chat.avatar ? `<img src="${chat.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:28px;">' + chat.name.charAt(0) + '</span>'}
                                    </div>
                                    <button id="char-avatar-btn" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;width:100%;">修改</button>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">角色头像</div>
                                </div>
                                
                                <!-- 用户头像 -->
                                <div>
                                    <div id="settings-user-avatar-display" style="width:70px;height:70px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;margin-bottom:8px;border:2px solid #ddd;overflow:hidden;">
                                        ${chat.userAvatar ? `<img src="${chat.userAvatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:28px;">' + window.AppState.user.name.charAt(0) + '</span>'}
                                    </div>
                                    <button id="user-avatar-btn" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;width:100%;">修改</button>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">你的头像</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 基本信息 -->
                    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;">
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">角色名称</label>
                            <input type="text" id="char-name-input" value="${this.escapeHtml(chat.name || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">备注</label>
                            <input type="text" id="char-remark-input" value="${this.escapeHtml(chat.remark || '')}" placeholder="设置备注后将优先显示备注" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
                            <div style="font-size:11px;color:#999;margin-top:4px;">设置备注后，好友列表和聊天页面会优先显示备注而非角色名称</div>
                        </div>
                        
                        <div>
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">角色人物设定</label>
                            <textarea id="char-desc-input" style="width:100%;min-height:100px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical;">${this.escapeHtml(chat.description || '')}</textarea>
                        </div>
                    </div>

                    <!-- 用户人设 -->
                    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;">
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">用户名称</label>
                            <input type="text" id="user-name-for-char" value="${this.escapeHtml(userNameForChar)}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
                            <div style="font-size:11px;color:#999;margin-top:4px;">在与该角色对话时，AI会读取此名称（不影响个人资料昵称）</div>
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">选择用户人设</label>
                            <select id="user-persona-select" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;margin-bottom:8px;">
                                <option value="">使用默认人设</option>
                                ${window.AppState.userPersonas && window.AppState.userPersonas.map(p => `
                                    <option value="${p.id}" ${chat.boundPersonaId === p.id ? 'selected' : ''}>
                                        ${this.escapeHtml(p.name)}${p.id === window.AppState.defaultPersonaId ? ' (默认)' : ''}
                                    </option>
                                `).join('')}
                            </select>
                            <div style="display:flex;gap:8px;margin-bottom:8px;">
                                <button id="manage-personas-btn" style="flex:1;padding:6px 12px;border:1px solid #4CAF50;border-radius:4px;background:#fff;color:#4CAF50;cursor:pointer;font-size:12px;">管理人设</button>
                                <button id="apply-persona-btn" style="flex:1;padding:6px 12px;border:none;border-radius:4px;background:#4CAF50;color:#fff;cursor:pointer;font-size:12px;">应用人设</button>
                            </div>
                        </div>
                        
                        <div>
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">用户人物设定</label>
                            <textarea id="user-desc-input" style="width:100%;min-height:80px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical;">${this.escapeHtml(userPersonality)}</textarea>
                            <div style="font-size:11px;color:#999;margin-top:4px;">当前显示的是实际使用的人设内容</div>
                        </div>
                    </div>

                    <!-- 绑定设置 -->
                    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;">
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">绑定表情包分组</label>
                            <div id="char-emoji-groups-list" style="background:#f9f9f9;border-radius:8px;overflow-x:auto;overflow-y:hidden;display:flex;flex-wrap:nowrap;gap:8px;padding:8px;border:1px solid #ddd;scroll-behavior:smooth;">
                                ${window.AppState.emojiGroups.map(g => `
                                    <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:13px;user-select:none;flex-shrink:0;white-space:nowrap;transition:all 0.2s;">
                                        <input type="checkbox" class="eg-checkbox" value="${g.id}" style="cursor:pointer;width:16px;height:16px;flex-shrink:0;margin:0;">
                                        <span>${this.escapeHtml(g.name)}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <div style="font-size:11px;color:#999;margin-top:4px;">支持多选，向右滑动查看更多</div>
                        </div>
                        
                        <div>
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">绑定局部世界书</label>
                            <div id="char-worldbooks-list" style="background:#f9f9f9;border-radius:8px;overflow-x:auto;overflow-y:hidden;display:flex;flex-wrap:nowrap;gap:8px;padding:8px;border:1px solid #ddd;scroll-behavior:smooth;">
                                ${localWbs.map(w => `
                                    <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:13px;user-select:none;flex-shrink:0;white-space:nowrap;transition:all 0.2s;">
                                        <input type="checkbox" class="wb-checkbox" value="${w.id}" style="cursor:pointer;width:16px;height:16px;flex-shrink:0;margin:0;">
                                        <span>${this.escapeHtml(w.name)}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <div style="font-size:11px;color:#999;margin-top:4px;">支持多选，向右滑动查看更多</div>
                        </div>
                    </div>

                    <!-- 对话总结功能 -->
                    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;">
                        <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:16px;">对话总结</div>
                        
                        <!-- 自动总结设置 -->
                        <div style="margin-bottom:16px;padding:12px;background:#f9f9f9;border-radius:8px;">
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px;">
                                <input type="checkbox" id="auto-summary-enabled" ${window.AppState.apiSettings.summaryEnabled ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                                <span style="font-size:14px;color:#333;font-weight:500;">启用自动总结</span>
                            </label>
                            <div style="font-size:11px;color:#999;margin-bottom:12px;">当消息达到设定数量后自动进行总结</div>
                            
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;">每多少条消息后自动总结</label>
                                <input type="number" id="summary-interval" value="${window.AppState.apiSettings.summaryInterval}" min="5" max="200" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                            </div>
                            
                            <div>
                                <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;">总结后保留最新消息数</label>
                                <input type="number" id="summary-keep-latest" value="${window.AppState.apiSettings.summaryKeepLatest}" min="5" max="50" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                            </div>
                        </div>

                        <!-- 手动总结按钮 -->
                        <button id="manual-summary-btn" style="width:100%;padding:10px;background:#000;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-bottom:16px;">
                            立即生成总结
                        </button>

                        <!-- 总结历史列表 -->
                        <div id="summaries-container">
                            ${hasSummaries ? this.renderSummariesList(conv.summaries, chat.id) : '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无总结记录</div>'}
                        </div>
                    </div>

                    <!-- 聊天背景图片 -->
                    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">聊天背景图片</label>
                        <div style="width:100%;height:80px;border:1px solid #ddd;border-radius:4px;background-size:cover;background-position:center;background-image:${chat.chatBgImage ? `url('${chat.chatBgImage}')` : 'none'};display:flex;align-items:center;justify-content:center;margin-bottom:8px;background-color:#f5f5f5;">
                            ${!chat.chatBgImage ? '<span style="color:#999;font-size:12px;">无背景图</span>' : ''}
                        </div>
                        <button id="chat-bg-upload-btn" style="padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;width:100%;margin-bottom:6px;">选择背景图</button>
                        ${chat.chatBgImage ? `<button id="chat-bg-clear-btn" style="padding:8px 12px;border:1px solid #f44;border-radius:4px;background:#fff;color:#f44;cursor:pointer;font-size:12px;width:100%;">清除背景</button>` : ''}
                    </div>

                    <!-- 操作按钮 -->
                    <div style="display:flex;gap:8px;margin-bottom:100px;">
                        <button id="save-char-settings-btn" style="flex:1;padding:12px;border:none;border-radius:8px;background:#000;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">保存设置</button>
                        <button id="delete-char-btn" style="flex:1;padding:12px;border:1px solid #f44;border-radius:8px;background:#fff;color:#f44;cursor:pointer;font-size:14px;font-weight:500;">删除角色</button>
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
            // 返回按钮
            document.getElementById('char-settings-back-btn').addEventListener('click', () => {
                document.getElementById('character-settings-page').classList.remove('open');
            });

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
                
                renderChatMessages(charId);
                const displayName = conv.remark || conv.name;
                document.getElementById('chat-title').textContent = displayName;
            }

            document.getElementById('character-settings-page').classList.remove('open');
            showToast('设置已保存');
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
         * HTML转义
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

})();