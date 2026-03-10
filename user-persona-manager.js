/**
 * 用户人设管理模块
 * 管理用户的所有人设（角色设置里的用户名称、用户人物设定）
 * 支持多个用户人设，可以设置为全局默认人设或角色绑定人设
 */

(function() {
    'use strict';

    // 用户人设管理器
    window.UserPersonaManager = {

        /**
         * 初始化用户人设数据结构
         */
        initUserPersonas: function() {
            if (!window.AppState) {
                console.error('AppState未定义');
                return;
            }

            if (!Array.isArray(window.AppState.userPersonas)) {
                window.AppState.userPersonas = [];
            }

            if (!window.AppState.defaultPersonaId) {
                window.AppState.defaultPersonaId = null;
            }

            if (window.AppState.userPersonas.length === 0) {
                const defaultPersona = {
                    id: 'persona_' + Date.now(),
                    name: '默认',
                    userName: window.AppState.user?.name || '小喵1号',
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
         * 打开我的人设页面
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
                <div class="sub-nav friend-nav settings-config-nav">
                    <div class="back-btn" id="persona-manager-back-btn" aria-label="返回"></div>
                    <div class="sub-title">我的人设</div>
                </div>

                <div class="sub-content persona-main-content">
                    <div class="persona-hero-card">
                        <div class="persona-hero-title">我的人设管理</div>
                        <div class="persona-hero-desc">可为自己在不同场景创建不同身份，并设置默认人设</div>
                    </div>

                    <button id="add-persona-btn" class="persona-btn persona-btn-primary persona-add-btn" type="button">添加新人设</button>

                    <div id="persona-list-container" class="persona-list-container"></div>
                </div>

                <div class="persona-modal-mask hidden" id="persona-modal-mask">
                    <div class="persona-modal-card" role="dialog" aria-modal="true" aria-labelledby="persona-modal-title">
                        <div class="persona-modal-title" id="persona-modal-title">提示</div>
                        <div class="persona-modal-text" id="persona-modal-text"></div>
                        <div class="persona-modal-actions">
                            <button class="persona-btn" id="persona-modal-cancel" type="button">取消</button>
                            <button class="persona-btn persona-btn-primary" id="persona-modal-confirm" type="button">确定</button>
                        </div>
                    </div>
                </div>
            `;

            page.classList.add('open');
            this.renderPersonaList();
            this.bindManagerEvents(page);
        },

        /**
         * 绑定我的人设页面事件
         */
        bindManagerEvents: function(page) {
            const backBtn = page.querySelector('#persona-manager-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.hideConfirmModal();
                    page.classList.remove('open');
                });
            }

            const addBtn = page.querySelector('#add-persona-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    this.openPersonaEditor();
                });
            }

            const listContainer = page.querySelector('#persona-list-container');
            if (listContainer) {
                listContainer.addEventListener('click', (event) => {
                    const actionBtn = event.target.closest('[data-persona-action]');
                    if (!actionBtn) return;

                    const action = actionBtn.dataset.personaAction;
                    const personaId = actionBtn.dataset.personaId;
                    if (!action || !personaId) return;

                    switch (action) {
                        case 'default':
                            this.setAsDefault(personaId);
                            break;
                        case 'edit':
                            this.openPersonaEditor(personaId);
                            break;
                        case 'duplicate':
                            this.duplicatePersona(personaId);
                            break;
                        case 'delete':
                            this.deletePersona(personaId);
                            break;
                        default:
                            break;
                    }
                });
            }

            const mask = page.querySelector('#persona-modal-mask');
            const cancelBtn = page.querySelector('#persona-modal-cancel');
            if (mask) {
                mask.addEventListener('click', (event) => {
                    if (event.target === mask) {
                        this.hideConfirmModal();
                    }
                });
            }
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.hideConfirmModal();
                });
            }
        },

        /**
         * 渲染人设列表
         */
        renderPersonaList: function() {
            const container = document.getElementById('persona-list-container');
            if (!container) return;

            const personas = Array.isArray(window.AppState.userPersonas) ? window.AppState.userPersonas : [];
            const defaultPersonaId = window.AppState.defaultPersonaId;

            if (personas.length === 0) {
                container.innerHTML = '<div class="persona-empty">暂无人设，点击上方按钮添加</div>';
                return;
            }

            const cardsHtml = personas.map((persona) => {
                const isDefault = persona.id === defaultPersonaId;
                const boundCharacters = this.getCharactersBoundToPersona(persona.id);
                const safeName = this.escapeHtml(persona.name);
                const safeUserName = this.escapeHtml(persona.userName || '');
                const safePersonality = this.escapeHtml(persona.personality || '');
                const boundNames = boundCharacters.map((name) => this.escapeHtml(name)).join(' · ');

                return `
                    <article class="persona-card" data-persona-id="${persona.id}">
                        <div class="persona-card-head">
                            <div>
                                <h3 class="persona-card-title" title="${safeName}">${safeName}</h3>
                                <div class="persona-card-user">我的名字：${safeUserName || '未设置'}</div>
                            </div>
                            ${isDefault ? '<span class="persona-inline-badge">默认</span>' : ''}
                        </div>

                        <div class="persona-card-desc">
                            ${safePersonality || '未填写你的人物设定'}
                        </div>

                        ${boundCharacters.length > 0 ? `
                            <div class="persona-bind-card">
                                <div class="persona-bind-title">绑定角色</div>
                                <div class="persona-bind-list">${boundNames}</div>
                            </div>
                        ` : ''}

                        <div class="persona-action-row">
                            ${isDefault ? '' : `<button class="persona-btn persona-btn-primary" data-persona-action="default" data-persona-id="${persona.id}" type="button">设为默认</button>`}
                            <button class="persona-btn" data-persona-action="edit" data-persona-id="${persona.id}" type="button">编辑</button>
                            <button class="persona-btn" data-persona-action="duplicate" data-persona-id="${persona.id}" type="button">复制</button>
                            ${personas.length > 1 ? `<button class="persona-btn persona-btn-danger" data-persona-action="delete" data-persona-id="${persona.id}" type="button">删除</button>` : ''}
                        </div>
                    </article>
                `;
            }).join('');

            container.innerHTML = cardsHtml;
        },

        /**
         * 打开人设编辑页
         */
        openPersonaEditor: function(personaId = null) {
            const isEdit = !!personaId;
            const persona = isEdit ? (window.AppState.userPersonas || []).find((item) => item.id === personaId) : null;

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
                <div class="sub-nav friend-nav settings-config-nav">
                    <div class="back-btn" id="persona-editor-back-btn" aria-label="返回"></div>
                    <div class="sub-title">${isEdit ? '编辑人设' : '添加人设'}</div>
                </div>

                <div class="sub-content persona-editor-content">
                    <div class="persona-editor-card">
                        <div class="persona-field">
                            <label class="persona-field-label" for="persona-name-input">人设风格</label>
                            <input
                                type="text"
                                id="persona-name-input"
                                value="${isEdit ? this.escapeHtml(persona.name) : ''}"
                                placeholder="例如：工作、日常、现代、可爱"
                                maxlength="32"
                            >
                        </div>

                        <div class="persona-field">
                            <label class="persona-field-label" for="persona-username-input">我的名字</label>
                            <input
                                type="text"
                                id="persona-username-input"
                                value="${isEdit ? this.escapeHtml(persona.userName) : ''}"
                                placeholder="在对话中使用你的名字"
                                maxlength="32"
                            >
                        </div>

                        <div class="persona-field">
                            <label class="persona-field-label" for="persona-personality-input">我的设定</label>
                            <textarea
                                id="persona-personality-input"
                                placeholder="描述你的性格、背景、偏好和表达风格"
                            >${isEdit ? this.escapeHtml(persona.personality || '') : ''}</textarea>
                            <div class="persona-field-hint">这会影响角色对你的理解和回应方式</div>
                        </div>
                    </div>

                    <div class="persona-editor-footer">
                        <button id="persona-editor-cancel" class="persona-btn" type="button">取消</button>
                        <button id="persona-editor-save" class="persona-btn persona-btn-primary" type="button">${isEdit ? '保存' : '添加'}</button>
                    </div>
                </div>
            `;

            editorPage.classList.add('open');

            const closeEditor = () => {
                editorPage.classList.remove('open');
            };

            const backBtn = editorPage.querySelector('#persona-editor-back-btn');
            const cancelBtn = editorPage.querySelector('#persona-editor-cancel');
            const saveBtn = editorPage.querySelector('#persona-editor-save');

            if (backBtn) backBtn.addEventListener('click', closeEditor);
            if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.savePersona(personaId);
                });
            }
        },

        /**
         * 保存人设
         */
        savePersona: function(personaId = null) {
            const nameInput = document.getElementById('persona-name-input');
            const userNameInput = document.getElementById('persona-username-input');
            const personalityInput = document.getElementById('persona-personality-input');
            if (!nameInput || !userNameInput || !personalityInput) return;

            const name = nameInput.value.trim();
            const userName = userNameInput.value.trim();
            const personality = personalityInput.value.trim();

            if (!name) {
                showToast('请输入人设名称');
                return;
            }

            if (!userName) {
                showToast('请输入用户名称');
                return;
            }

            const personas = window.AppState.userPersonas || [];
            const isEdit = !!personaId;

            if (isEdit) {
                const persona = personas.find((item) => item.id === personaId);
                if (persona) {
                    persona.name = name;
                    persona.userName = userName;
                    persona.personality = personality;
                    persona.updatedAt = new Date().toISOString();
                }
            } else {
                personas.push({
                    id: 'persona_' + Date.now(),
                    name: name,
                    userName: userName,
                    personality: personality,
                    isDefault: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
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
            if (window.AppState.defaultPersonaId === personaId) {
                showToast('该人设已是默认');
                return;
            }

            window.AppState.defaultPersonaId = personaId;
            saveToStorage();
            this.renderPersonaList();
            showToast('已设为默认人设');
        },

        /**
         * 复制人设
         */
        duplicatePersona: function(personaId) {
            const personas = window.AppState.userPersonas || [];
            const persona = personas.find((item) => item.id === personaId);
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

            personas.push(newPersona);
            saveToStorage();
            this.renderPersonaList();
            showToast('人设已复制');
        },

        /**
         * 删除人设（主题弹窗确认）
         */
        deletePersona: function(personaId) {
            const personas = window.AppState.userPersonas || [];
            const persona = personas.find((item) => item.id === personaId);
            if (!persona) {
                showToast('人设不存在');
                return;
            }

            if (personas.length <= 1) {
                showToast('至少需要保留一个人设');
                return;
            }

            const boundCount = this.getCharactersBoundToPersona(personaId).length;
            const message = boundCount > 0
                ? `确定删除“${persona.name}”？删除后会解除 ${boundCount} 个角色绑定，且不可恢复。`
                : `确定删除“${persona.name}”？删除后不可恢复。`;

            this.showConfirmModal({
                title: '删除人设',
                message: message,
                confirmText: '删除',
                danger: true,
                onConfirm: () => {
                    this.performDeletePersona(personaId);
                }
            });
        },

        /**
         * 执行删除人设
         */
        performDeletePersona: function(personaId) {
            const personas = window.AppState.userPersonas || [];
            const conversations = Array.isArray(window.AppState.conversations) ? window.AppState.conversations : [];

            if (window.AppState.defaultPersonaId === personaId) {
                const remainingPersona = personas.find((item) => item.id !== personaId);
                if (remainingPersona) {
                    window.AppState.defaultPersonaId = remainingPersona.id;
                }
            }

            conversations.forEach((conversation) => {
                if (conversation.boundPersonaId === personaId) {
                    delete conversation.boundPersonaId;
                }
            });

            window.AppState.userPersonas = personas.filter((item) => item.id !== personaId);

            saveToStorage();
            this.renderPersonaList();
            showToast('人设已删除');
        },

        /**
         * 主题弹窗（替代系统confirm）
         */
        showConfirmModal: function(options) {
            const page = document.getElementById('persona-manager-page');
            if (!page) return;

            const mask = page.querySelector('#persona-modal-mask');
            const titleEl = page.querySelector('#persona-modal-title');
            const textEl = page.querySelector('#persona-modal-text');
            const confirmBtn = page.querySelector('#persona-modal-confirm');
            const cancelBtn = page.querySelector('#persona-modal-cancel');
            if (!mask || !titleEl || !textEl || !confirmBtn || !cancelBtn) return;

            titleEl.textContent = options.title || '提示';
            textEl.textContent = options.message || '';
            cancelBtn.textContent = options.cancelText || '取消';
            confirmBtn.textContent = options.confirmText || '确定';

            confirmBtn.classList.toggle('persona-btn-primary', !options.danger);
            confirmBtn.classList.toggle('persona-btn-danger', !!options.danger);

            confirmBtn.onclick = () => {
                this.hideConfirmModal();
                if (typeof options.onConfirm === 'function') {
                    options.onConfirm();
                }
            };

            mask.classList.remove('hidden');
        },

        /**
         * 关闭主题弹窗
         */
        hideConfirmModal: function() {
            const page = document.getElementById('persona-manager-page');
            if (!page) return;

            const mask = page.querySelector('#persona-modal-mask');
            const confirmBtn = page.querySelector('#persona-modal-confirm');
            if (mask) {
                mask.classList.add('hidden');
            }
            if (confirmBtn) {
                confirmBtn.onclick = null;
            }
        },

        /**
         * 获取绑定到指定人设的角色列表
         */
        getCharactersBoundToPersona: function(personaId) {
            const characters = [];
            const conversations = Array.isArray(window.AppState.conversations) ? window.AppState.conversations : [];
            conversations.forEach((conversation) => {
                if (conversation.boundPersonaId === personaId) {
                    characters.push(conversation.name || '未命名角色');
                }
            });
            return characters;
        },

        /**
         * 获取当前对话应用的人设
         */
        getPersonaForConversation: function(conversationId) {
            const conversations = Array.isArray(window.AppState.conversations) ? window.AppState.conversations : [];
            const personas = Array.isArray(window.AppState.userPersonas) ? window.AppState.userPersonas : [];
            const conversation = conversations.find((item) => item.id === conversationId);
            if (!conversation) return null;

            if (conversation.boundPersonaId) {
                const boundPersona = personas.find((item) => item.id === conversation.boundPersonaId);
                if (boundPersona) return boundPersona;
            }

            const defaultPersona = personas.find((item) => item.id === window.AppState.defaultPersonaId);
            return defaultPersona || personas[0] || null;
        },

        /**
         * HTML转义
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : String(text);
            return div.innerHTML;
        }
    };

    // 在AppState初始化后自动初始化用户人设
    if (window.AppState) {
        window.UserPersonaManager.initUserPersonas();
    }

})();
