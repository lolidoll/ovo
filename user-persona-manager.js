/**
 * 用户设定管理模块
 * 管理用户的所有人设（角色设置里的用户名称、用户人物设定）
 * 支持多个用户人设，可以设置为全局默认人设或角色绑定人设
 */

(function() {
    'use strict';

    // 用户设定管理器
    window.UserPersonaManager = {
        
        /**
         * 初始化用户设定数据结构
         */
        initUserPersonas: function() {
            if (!window.AppState) {
                console.error('AppState未定义');
                return;
            }
            
            // 初始化用户设定数组
            if (!window.AppState.userPersonas) {
                window.AppState.userPersonas = [];
            }
            
            // 初始化默认人设ID
            if (!window.AppState.defaultPersonaId) {
                window.AppState.defaultPersonaId = null;
            }
            
            // 如果没有任何人设，创建一个默认人设
            if (window.AppState.userPersonas.length === 0) {
                const defaultPersona = {
                    id: 'persona_' + Date.now(),
                    name: '默认用户',
                    userName: window.AppState.user?.name || '薯片机用户',
                    personality: '',
                    isDefault: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                window.AppState.userPersonas.push(defaultPersona);
                window.AppState.defaultPersonaId = defaultPersona.id;
            }
        },

        /**
         * 打开用户设定管理页面
         */
        openPersonaManager: function() {
            this.initUserPersonas();
            
            let page = document.getElementById('persona-manager-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'persona-manager-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }
            
            page.innerHTML = `
                <div class="sub-nav">
                    <div class="back-btn" id="persona-manager-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">用户设定管理</div>
                </div>
                
                <div class="sub-content" style="padding:16px;background:#f5f5f5;">
                    <button id="add-persona-btn" style="width:100%;padding:12px;background:#000;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>添加新人设</span>
                    </button>
                    
                    <div id="persona-list-container"></div>
                </div>
            `;
            
            page.classList.add('open');
            
            // 渲染人设列表
            this.renderPersonaList();
            
            // 绑定返回按钮事件
            document.getElementById('persona-manager-back-btn').addEventListener('click', () => {
                page.classList.remove('open');
            });
            
            // 绑定添加按钮事件
            document.getElementById('add-persona-btn').addEventListener('click', () => {
                this.openPersonaEditor();
            });
        },

        /**
         * 渲染人设列表
         */
        renderPersonaList: function() {
            const container = document.getElementById('persona-list-container');
            if (!container) return;
            
            const personas = window.AppState.userPersonas || [];
            const defaultPersonaId = window.AppState.defaultPersonaId;
            
            if (personas.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#999;font-size:14px;">暂无用户设定<br>点击上方按钮添加</div>';
                return;
            }
            
            let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
            
            personas.forEach(persona => {
                const isDefault = persona.id === defaultPersonaId;
                const boundCharacters = this.getCharactersBoundToPersona(persona.id);
                
                html += `
                    <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);position:relative;">
                        ${isDefault ? '<div style="position:absolute;top:12px;right:12px;background:#000;color:white;font-size:11px;padding:4px 10px;border-radius:12px;font-weight:500;">默认</div>' : ''}
                        
                        <div style="margin-bottom:${boundCharacters.length > 0 ? '12px' : '16px'};">
                            <div style="font-size:16px;font-weight:600;color:#000;margin-bottom:6px;padding-right:${isDefault ? '60px' : '0'};">${this.escapeHtml(persona.name)}</div>
                            <div style="font-size:13px;color:#666;margin-bottom:${persona.personality ? '8px' : '0'};">用户名: ${this.escapeHtml(persona.userName)}</div>
                            ${persona.personality ? `<div style="font-size:12px;color:#999;line-height:1.5;max-height:54px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${this.escapeHtml(persona.personality)}</div>` : ''}
                        </div>
                        
                        ${boundCharacters.length > 0 ? `
                            <div style="margin-bottom:16px;padding:10px;background:#f8f8f8;border-radius:8px;border:1px solid #f0f0f0;">
                                <div style="font-size:11px;color:#999;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">绑定角色</div>
                                <div style="font-size:13px;color:#333;line-height:1.4;">${boundCharacters.map(c => this.escapeHtml(c)).join(' · ')}</div>
                            </div>
                        ` : ''}
                        
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:8px;">
                            ${!isDefault ? `<button onclick="UserPersonaManager.setAsDefault('${persona.id}')" style="padding:8px 12px;background:#000;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">设为默认</button>` : ''}
                            <button onclick="UserPersonaManager.openPersonaEditor('${persona.id}')" style="padding:8px 12px;background:#f5f5f5;color:#333;border:1px solid #e0e0e0;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#ebebeb'" onmouseout="this.style.background='#f5f5f5'">编辑</button>
                            <button onclick="UserPersonaManager.duplicatePersona('${persona.id}')" style="padding:8px 12px;background:#f5f5f5;color:#333;border:1px solid #e0e0e0;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#ebebeb'" onmouseout="this.style.background='#f5f5f5'">复制</button>
                            ${personas.length > 1 ? `<button onclick="UserPersonaManager.deletePersona('${persona.id}')" style="padding:8px 12px;background:#fff;color:#ff4444;border:1px solid #ff4444;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;transition:all 0.2s;" onmouseover="this.style.background='#ff4444';this.style.color='white'" onmouseout="this.style.background='#fff';this.style.color='#ff4444'">删除</button>` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        },

        /**
         * 打开人设编辑器
         */
        openPersonaEditor: function(personaId = null) {
            const isEdit = !!personaId;
            const persona = isEdit ? window.AppState.userPersonas.find(p => p.id === personaId) : null;
            
            if (isEdit && !persona) {
                showToast('人设不存在');
                return;
            }
            
            let editorPage = document.getElementById('persona-editor-page');
            if (!editorPage) {
                editorPage = document.createElement('div');
                editorPage.id = 'persona-editor-page';
                editorPage.className = 'sub-page';
                document.getElementById('app-container').appendChild(editorPage);
            }
            
            editorPage.innerHTML = `
                <div class="sub-nav">
                    <div class="back-btn" id="persona-editor-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">${isEdit ? '编辑人设' : '添加新人设'}</div>
                </div>
                
                <div class="sub-content" style="padding:20px;background:#fff;">
                    <div style="margin-bottom:20px;">
                        <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;font-size:14px;">人设名称</label>
                        <input type="text" id="persona-name-input" value="${isEdit ? this.escapeHtml(persona.name) : ''}" placeholder="例如: 工作人设、日常人设" style="width:100%;padding:12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;background:#fafafa;">
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;font-size:14px;">用户名称</label>
                        <input type="text" id="persona-username-input" value="${isEdit ? this.escapeHtml(persona.userName) : ''}" placeholder="在对话中显示的用户名" style="width:100%;padding:12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;background:#fafafa;">
                    </div>
                    
                    <div style="margin-bottom:24px;">
                        <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;font-size:14px;">用户人物设定</label>
                        <textarea id="persona-personality-input" placeholder="描述用户的性格、背景、特点等..." style="width:100%;min-height:200px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;line-height:1.6;background:#fafafa;">${isEdit ? this.escapeHtml(persona.personality || '') : ''}</textarea>
                        <div style="font-size:12px;color:#999;margin-top:8px;">这将影响AI对你的理解和回应方式</div>
                    </div>
                    
                    <div style="position:fixed;bottom:0;left:0;right:0;padding:16px;background:#fff;border-top:1px solid #f0f0f0;display:flex;gap:12px;">
                        <button id="persona-editor-cancel" style="flex:1;padding:12px;background:#f5f5f5;color:#333;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">取消</button>
                        <button id="persona-editor-save" style="flex:1;padding:12px;background:#000;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">${isEdit ? '保存' : '添加'}</button>
                    </div>
                    
                    <div style="height:80px;"></div>
                </div>
            `;
            
            editorPage.classList.add('open');
            
            // 绑定返回按钮
            document.getElementById('persona-editor-back-btn').addEventListener('click', () => {
                editorPage.classList.remove('open');
            });
            
            // 绑定取消按钮
            document.getElementById('persona-editor-cancel').addEventListener('click', () => {
                editorPage.classList.remove('open');
            });
            
            // 绑定保存按钮
            document.getElementById('persona-editor-save').addEventListener('click', () => {
                this.savePersona(personaId);
            });
        },

        /**
         * 保存人设
         */
        savePersona: function(personaId = null) {
            const name = document.getElementById('persona-name-input').value.trim();
            const userName = document.getElementById('persona-username-input').value.trim();
            const personality = document.getElementById('persona-personality-input').value.trim();
            
            if (!name) {
                showToast('请输入人设名称');
                return;
            }
            
            if (!userName) {
                showToast('请输入用户名称');
                return;
            }
            
            const isEdit = !!personaId;
            
            if (isEdit) {
                // 编辑现有人设
                const persona = window.AppState.userPersonas.find(p => p.id === personaId);
                if (persona) {
                    persona.name = name;
                    persona.userName = userName;
                    persona.personality = personality;
                    persona.updatedAt = new Date().toISOString();
                }
            } else {
                // 添加新人设
                const newPersona = {
                    id: 'persona_' + Date.now(),
                    name: name,
                    userName: userName,
                    personality: personality,
                    isDefault: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                window.AppState.userPersonas.push(newPersona);
            }
            
            saveToStorage();
            const editorPage = document.getElementById('persona-editor-page');
            if (editorPage) editorPage.classList.remove('open');
            this.renderPersonaList();
            showToast(isEdit ? '人设已更新' : '人设已添加');
        },

        /**
         * 设置为默认人设
         */
        setAsDefault: function(personaId) {
            window.AppState.defaultPersonaId = personaId;
            saveToStorage();
            this.renderPersonaList();
            showToast('已设为默认人设');
        },

        /**
         * 复制人设
         */
        duplicatePersona: function(personaId) {
            const persona = window.AppState.userPersonas.find(p => p.id === personaId);
            if (!persona) {
                showToast('人设不存在');
                return;
            }
            
            const newPersona = {
                ...persona,
                id: 'persona_' + Date.now(),
                name: persona.name + ' (副本)',
                isDefault: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            window.AppState.userPersonas.push(newPersona);
            saveToStorage();
            this.renderPersonaList();
            showToast('人设已复制');
        },

        /**
         * 删除人设
         */
        deletePersona: function(personaId) {
            if (!confirm('确定要删除这个人设吗？')) return;
            
            // 不允许删除最后一个人设
            if (window.AppState.userPersonas.length <= 1) {
                showToast('至少需要保留一个人设');
                return;
            }
            
            // 如果删除的是默认人设，自动设置第一个剩余人设为默认
            if (window.AppState.defaultPersonaId === personaId) {
                const remainingPersona = window.AppState.userPersonas.find(p => p.id !== personaId);
                if (remainingPersona) {
                    window.AppState.defaultPersonaId = remainingPersona.id;
                }
            }
            
            // 解除所有角色的绑定
            window.AppState.conversations.forEach(conv => {
                if (conv.boundPersonaId === personaId) {
                    delete conv.boundPersonaId;
                }
            });
            
            // 删除人设
            window.AppState.userPersonas = window.AppState.userPersonas.filter(p => p.id !== personaId);
            
            saveToStorage();
            this.renderPersonaList();
            showToast('人设已删除');
        },

        /**
         * 获取绑定到指定人设的角色列表
         */
        getCharactersBoundToPersona: function(personaId) {
            const characters = [];
            window.AppState.conversations.forEach(conv => {
                if (conv.boundPersonaId === personaId) {
                    characters.push(conv.name || '未命名角色');
                }
            });
            return characters;
        },

        /**
         * 获取当前对话应用的人设
         */
        getPersonaForConversation: function(conversationId) {
            const conv = window.AppState.conversations.find(c => c.id === conversationId);
            if (!conv) return null;
            
            // 如果角色绑定了特定人设，使用该人设
            if (conv.boundPersonaId) {
                const boundPersona = window.AppState.userPersonas.find(p => p.id === conv.boundPersonaId);
                if (boundPersona) return boundPersona;
            }
            
            // 否则使用默认人设
            const defaultPersona = window.AppState.userPersonas.find(p => p.id === window.AppState.defaultPersonaId);
            return defaultPersona || window.AppState.userPersonas[0] || null;
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

    // 在AppState初始化时自动初始化用户设定
    if (window.AppState) {
        window.UserPersonaManager.initUserPersonas();
    }

})();