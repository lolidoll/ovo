// CSS主题管理器
const ThemeManager = {
    themes: [], // 主题库 [{ id, name, type, css, createdAt, isActive }]
    currentThemeId: null,
    db: null,
    
    // 主题类型定义
    themeTypes: {
        topBar: { id: 'topBar', name: '顶部栏', selector: '.chat-nav', description: '聊天页面顶部导航栏样式' },
        bottomBar: { id: 'bottomBar', name: '底部栏', selector: '.chat-input-area, .chat-toolbar', description: '聊天页面底部输入区和工具栏样式' },
        messageBubble: { id: 'messageBubble', name: '消息气泡', selector: '.chat-bubble', description: '聊天消息气泡样式' },
        voiceBar: { id: 'voiceBar', name: '语音条', selector: '.voice-bubble', description: '语音消息样式' },
        locationCard: { id: 'locationCard', name: '位置卡片', selector: '.location-bubble', description: '地理位置消息样式' },
        photoDescCard: { id: 'photoDescCard', name: '图片描述卡片', selector: '.photo-description-card', description: '图片描述消息样式' },
        momentCard: { id: 'momentCard', name: '朋友圈卡片', selector: '.forward-moment-card', description: '朋友圈转发消息样式' }
    },
    
    // 初始化
    async init() {
        console.log('CSS主题管理器初始化...');
        await this.initIndexedDB();
        await this.loadThemes();
        this.applyStoredThemes();
    },
    
    // 初始化IndexedDB
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ThemeManagerDB', 1);
            
            request.onerror = () => {
                console.error('IndexedDB打开失败');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB打开成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('themes')) {
                    const objectStore = db.createObjectStore('themes', { keyPath: 'id' });
                    objectStore.createIndex('type', 'type', { unique: false });
                    objectStore.createIndex('name', 'name', { unique: false });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('创建themes对象存储');
                }
            };
        });
    },
    
    // 从IndexedDB加载主题
    async loadThemes() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['themes'], 'readonly');
            const objectStore = transaction.objectStore('themes');
            const request = objectStore.getAll();
            
            request.onsuccess = () => {
                this.themes = request.result || [];
                console.log(`加载了 ${this.themes.length} 个主题`);
                resolve();
            };
            
            request.onerror = () => {
                console.error('加载主题失败');
                reject(request.error);
            };
        });
    },
    
    // 保存主题到IndexedDB
    async saveTheme(themeData) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['themes'], 'readwrite');
            const objectStore = transaction.objectStore('themes');
            const request = objectStore.put(themeData);
            
            request.onsuccess = () => {
                console.log('主题保存成功:', themeData.name);
                resolve();
            };
            
            request.onerror = () => {
                console.error('主题保存失败');
                reject(request.error);
            };
        });
    },
    
    // 删除主题
    async deleteTheme(themeId) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['themes'], 'readwrite');
            const objectStore = transaction.objectStore('themes');
            const request = objectStore.delete(themeId);
            
            request.onsuccess = () => {
                console.log('主题删除成功:', themeId);
                // 从内存中移除
                this.themes = this.themes.filter(t => t.id !== themeId);
                
                // 如果删除的是当前激活的主题，移除样式
                const theme = this.themes.find(t => t.id === themeId);
                if (theme && theme.isActive) {
                    this.removeThemeStyle(themeId);
                }
                
                resolve();
            };
            
            request.onerror = () => {
                console.error('主题删除失败');
                reject(request.error);
            };
        });
    },
    
    // 创建新主题
    async createTheme(name, type, css, bindingType = 'global', boundCharacters = []) {
        const themeId = 'theme_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const themeData = {
            id: themeId,
            name: name,
            type: type,
            css: css,
            createdAt: new Date().toISOString(),
            isActive: false,
            bindingType: bindingType, // 'global' | 'single' | 'multiple'
            boundCharacters: boundCharacters // 绑定的角色ID数组
        };
        
        // 保存到IndexedDB
        await this.saveTheme(themeData);
        
        // 添加到内存
        this.themes.push(themeData);
        
        return themeData;
    },
    
    // 应用主题
    async applyTheme(themeId, currentCharacterId = null) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) {
            throw new Error('主题不存在');
        }
        
        try {
            // 如果是角色绑定主题，检查当前角色是否匹配
            if (currentCharacterId && theme.bindingType !== 'global') {
                const isCharacterMatch = theme.boundCharacters.includes(currentCharacterId);
                if (!isCharacterMatch) {
                    console.log('主题不适用于当前角色');
                    return false;
                }
            }
            
            // 移除同类型的其他激活主题（只移除全局主题或当前角色的主题）
            const sameTypeThemes = this.themes.filter(t =>
                t.type === theme.type &&
                t.isActive &&
                (t.bindingType === 'global' ||
                 (currentCharacterId && t.boundCharacters.includes(currentCharacterId)))
            );
            
            for (const oldTheme of sameTypeThemes) {
                oldTheme.isActive = false;
                this.removeThemeStyle(oldTheme.id);
                await this.saveTheme(oldTheme);
            }
            
            // 应用新主题
            this.injectThemeStyle(theme);
            theme.isActive = true;
            await this.saveTheme(theme);
            
            console.log('主题应用成功:', theme.name);
            return true;
        } catch (error) {
            console.error('主题应用失败:', error);
            throw new Error('主题应用失败: ' + error.message);
        }
    },
    
    // 注入主题样式
    injectThemeStyle(theme) {
        // 检查是否已存在该主题的style标签
        let styleEl = document.getElementById(`theme-style-${theme.id}`);
        
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = `theme-style-${theme.id}`;
            styleEl.setAttribute('data-theme-type', theme.type);
            document.head.appendChild(styleEl);
        }
        
        styleEl.textContent = theme.css;
        console.log('注入主题样式:', theme.name);
    },
    
    // 移除主题样式
    removeThemeStyle(themeId) {
        const styleEl = document.getElementById(`theme-style-${themeId}`);
        if (styleEl) {
            styleEl.remove();
            console.log('移除主题样式:', themeId);
        }
    },
    
    // 取消激活主题
    async deactivateTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return;
        
        theme.isActive = false;
        this.removeThemeStyle(themeId);
        await this.saveTheme(theme);
        console.log('主题已取消激活:', theme.name);
    },
    
    // 应用存储的主题（页面加载时或切换角色时）
    async applyStoredThemes(currentCharacterId = null) {
        // 移除所有当前应用的主题样式
        this.themes.forEach(theme => {
            this.removeThemeStyle(theme.id);
        });
        
        // 获取应该应用的主题
        const themesToApply = this.themes.filter(t => {
            if (!t.isActive) return false;
            
            // 全局主题总是应用
            if (t.bindingType === 'global') return true;
            
            // 如果有当前角色ID，检查角色绑定
            if (currentCharacterId) {
                return t.boundCharacters.includes(currentCharacterId);
            }
            
            return false;
        });
        
        // 应用主题
        for (const theme of themesToApply) {
            try {
                this.injectThemeStyle(theme);
                console.log('已应用存储的主题:', theme.name, '绑定类型:', theme.bindingType);
            } catch (error) {
                console.error('应用存储主题失败:', error);
            }
        }
    },
    
    // 切换角色时更新主题
    async switchCharacterThemes(characterId) {
        await this.applyStoredThemes(characterId);
    },
    
    // 获取所有主题
    getAllThemes() {
        return this.themes;
    },
    
    // 按类型获取主题
    getThemesByType(type) {
        return this.themes.filter(t => t.type === type);
    },
    
    // 获取激活的主题
    getActiveThemes() {
        return this.themes.filter(t => t.isActive);
    },
    
    // 获取默认CSS（用于编辑器预填充）
    getDefaultCSS(type) {
        const defaults = {
            topBar: `/* 顶部栏样式 */
.chat-nav {
    background: #f7f7f7;
    border-bottom: 0.5px solid #e5e5e5;
}

.chat-title {
    color: #666;
    font-size: 15px;
}

.back-arrow {
    border-color: #666;
}`,
            bottomBar: `/* 底部栏样式 */
.chat-input-area {
    background: #f7f7f7;
    border-top: 0.5px solid #e5e5e5;
}

.chat-input {
    background: rgba(255, 253, 250, 0.95);
    border: 0.5px solid #ebebeb;
    border-radius: 8px;
}

.chat-send-btn {
    background: #ffd5e0;
    color: #fff;
    border-radius: 15px;
}

.chat-toolbar {
    background: #f7f7f7;
}`,
            messageBubble: `/* 消息气泡样式 */
.chat-bubble {
    background: #fff;
    border-radius: 8px;
    padding: 10px 14px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chat-bubble.sent {
    background: #ffd5e0;
}

.chat-bubble.received {
    background: #fff;
}`,
            voiceBar: `/* 语音条样式 */
.voice-bubble {
    background: #fff;
    border-radius: 20px;
    padding: 8px 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.voice-bubble.sent {
    background: #ffd5e0;
}`,
            locationCard: `/* 位置卡片样式 */
.location-bubble {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.location-info {
    padding: 12px;
}

.location-name {
    color: #333;
    font-weight: 600;
}`,
            photoDescCard: `/* 图片描述卡片样式 */
.photo-description-card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}`,
            momentCard: `/* 朋友圈卡片样式 */
.forward-moment-card {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.forward-moment-header {
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    padding: 14px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.forward-moment-content {
    padding: 14px 16px;
}`
        };
        
        return defaults[type] || '';
    }
};

// CSS主题管理器UI
const ThemeManagerUI = {
    currentType: 'topBar', // 当前选中的主题类型
    
    // 打开主题管理器页面
    open() {
        // 检查是否已存在decoration-page
        let decorationPage = document.getElementById('decoration-page');
        if (!decorationPage) {
            decorationPage = document.createElement('div');
            decorationPage.id = 'decoration-page';
            decorationPage.className = 'sub-page';
            document.getElementById('app-container').appendChild(decorationPage);
        }
        
        this.render(decorationPage);
        decorationPage.classList.add('open');
        
        // 绑定事件
        this.bindEvents(decorationPage);
    },
    
    // 渲染页面
    render(page) {
        const themeTypes = ThemeManager.themeTypes;
        
        // 生成类型选项卡
        const typeTabsHTML = Object.values(themeTypes).map(type => `
            <button class="theme-type-tab ${type.id === this.currentType ? 'active' : ''}" 
                    data-type="${type.id}">
                ${type.name}
            </button>
        `).join('');
        
        // 获取当前类型的主题列表
        const currentThemes = ThemeManager.getThemesByType(this.currentType);
        const currentTypeInfo = themeTypes[this.currentType];
        
        const themesHTML = currentThemes.length > 0 ? currentThemes.map(theme => {
            // 获取绑定信息 - 只显示角色名称
            let bindingInfo = '';
            if (theme.bindingType === 'global' || !theme.bindingType) {
                bindingInfo = '<span class="theme-binding-badge global">全局</span>';
            } else if (theme.boundCharacters && theme.boundCharacters.length > 0) {
                const charNames = theme.boundCharacters.map(id => this.getCharacterName(id)).join('、');
                bindingInfo = `<span class="theme-binding-badge single">${charNames}</span>`;
            }
            
            return `
            <div class="theme-item ${theme.isActive ? 'active' : ''}" data-theme-id="${theme.id}">
                <div class="theme-item-header">
                    <div class="theme-item-info">
                        <div class="theme-item-name">${this.escapeHtml(theme.name)}</div>
                        <div class="theme-item-meta">
                            <span class="theme-item-date">${new Date(theme.createdAt).toLocaleDateString('zh-CN')}</span>
                            ${bindingInfo}
                        </div>
                    </div>
                    <div class="theme-item-actions">
                        ${theme.isActive ?
                            '<span class="theme-active-badge">使用中</span>' :
                            '<button class="theme-apply-btn" data-theme-id="' + theme.id + '">应用</button>'
                        }
                        <button class="theme-edit-btn" data-theme-id="${theme.id}">编辑</button>
                        <button class="theme-delete-btn" data-theme-id="${theme.id}">删除</button>
                    </div>
                </div>
                <div class="theme-preview">
                    <pre><code>${this.escapeHtml(theme.css.substring(0, 200))}${theme.css.length > 200 ? '...' : ''}</code></pre>
                </div>
            </div>
            `;
        }).join('') : '<div class="empty-state-text">暂无主题，点击下方按钮创建新主题</div>';
        
        page.innerHTML = `
            <div class="sub-nav">
                <div class="back-btn" id="theme-manager-back-btn">
                    <div class="back-arrow"></div>
                    <span>返回</span>
                </div>
                <div class="sub-title">CSS主题管理</div>
            </div>
            <div class="sub-content theme-manager-content">
                <!-- 类型选择 -->
                <div class="theme-type-selector">
                    <div class="theme-type-title">选择样式类型</div>
                    <div class="theme-type-tabs">
                        ${typeTabsHTML}
                    </div>
                    <div class="theme-type-description">
                        <svg viewBox="0 0 24 24" width="14" height="14" style="fill: #999;">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        ${currentTypeInfo.description}
                    </div>
                </div>
                
                <!-- 主题列表 -->
                <div class="theme-library-section">
                    <div class="theme-library-header">
                        <div class="theme-library-title">${currentTypeInfo.name}主题 (${currentThemes.length})</div>
                        <button class="theme-create-btn" id="theme-create-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor;">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                            创建新主题
                        </button>
                    </div>
                    <div class="theme-list">
                        ${themesHTML}
                    </div>
                </div>
            </div>
            
            <!-- 主题编辑器模态框 -->
            <div class="theme-editor-modal" id="theme-editor-modal">
                <div class="theme-editor-overlay"></div>
                <div class="theme-editor-container">
                    <div class="theme-editor-header">
                        <h3 id="theme-editor-title">创建新主题</h3>
                        <button class="theme-editor-close" id="theme-editor-close">×</button>
                    </div>
                    <div class="theme-editor-body">
                        <div class="theme-editor-field">
                            <label>主题名称</label>
                            <input type="text" id="theme-name-input" class="theme-input" placeholder="输入主题名称">
                        </div>
                        
                        <div class="theme-editor-field">
                            <label>应用范围</label>
                            <select id="theme-binding-type" class="theme-input">
                                <option value="global">全局（所有角色）</option>
                                <option value="single">单个角色</option>
                                <option value="multiple">多个角色</option>
                            </select>
                        </div>
                        
                        <div class="theme-editor-field" id="theme-character-selector" style="display:none;">
                            <label>选择角色</label>
                            <div id="theme-character-list" class="theme-character-list"></div>
                        </div>
                        
                        <div class="theme-editor-field">
                            <label>CSS代码</label>
                            <textarea id="theme-css-input" class="theme-textarea" placeholder="输入CSS代码..."></textarea>
                        </div>
                        <div class="theme-editor-tips">
                            <svg viewBox="0 0 24 24" width="14" height="14" style="fill: #ff9800;">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                            </svg>
                            提示：请确保CSS选择器正确，避免影响其他页面元素
                        </div>
                    </div>
                    <div class="theme-editor-footer">
                        <button class="theme-btn theme-btn-cancel" id="theme-editor-cancel">取消</button>
                        <button class="theme-btn theme-btn-save" id="theme-editor-save">保存</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // 绑定事件
    bindEvents(page) {
        // 返回按钮
        const backBtn = page.querySelector('#theme-manager-back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                page.classList.remove('open');
            };
        }
        
        // 类型选项卡切换
        page.querySelectorAll('.theme-type-tab').forEach(tab => {
            tab.onclick = () => {
                this.currentType = tab.dataset.type;
                this.refresh();
            };
        });
        
        // 创建新主题按钮
        const createBtn = page.querySelector('#theme-create-btn');
        if (createBtn) {
            createBtn.onclick = () => this.openEditor();
        }
        
        // 应用主题按钮
        page.querySelectorAll('.theme-apply-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const themeId = btn.dataset.themeId;
                this.applyTheme(themeId);
            };
        });
        
        // 编辑主题按钮
        page.querySelectorAll('.theme-edit-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const themeId = btn.dataset.themeId;
                this.editTheme(themeId);
            };
        });
        
        // 删除主题按钮
        page.querySelectorAll('.theme-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const themeId = btn.dataset.themeId;
                this.deleteTheme(themeId);
            };
        });
        
        // 编辑器相关事件
        this.bindEditorEvents(page);
    },
    
    // 绑定编辑器事件
    bindEditorEvents(page) {
        const modal = page.querySelector('#theme-editor-modal');
        const closeBtn = page.querySelector('#theme-editor-close');
        const cancelBtn = page.querySelector('#theme-editor-cancel');
        const saveBtn = page.querySelector('#theme-editor-save');
        const overlay = page.querySelector('.theme-editor-overlay');
        
        if (closeBtn) {
            closeBtn.onclick = () => this.closeEditor();
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeEditor();
        }
        
        if (saveBtn) {
            saveBtn.onclick = () => this.saveTheme();
        }
        
        if (overlay) {
            overlay.onclick = () => this.closeEditor();
        }
    },
    
    // 打开编辑器
    openEditor(themeId = null) {
        const modal = document.getElementById('theme-editor-modal');
        const title = document.getElementById('theme-editor-title');
        const nameInput = document.getElementById('theme-name-input');
        const cssInput = document.getElementById('theme-css-input');
        const bindingTypeSelect = document.getElementById('theme-binding-type');
        const characterSelector = document.getElementById('theme-character-selector');
        
        if (themeId) {
            // 编辑模式
            const theme = ThemeManager.themes.find(t => t.id === themeId);
            if (theme) {
                title.textContent = '编辑主题';
                nameInput.value = theme.name;
                cssInput.value = theme.css;
                bindingTypeSelect.value = theme.bindingType || 'global';
                modal.dataset.editingId = themeId;
                
                // 更新角色选择器
                this.updateCharacterSelector(theme.bindingType, theme.boundCharacters || []);
            }
        } else {
            // 创建模式
            title.textContent = '创建新主题';
            nameInput.value = '';
            cssInput.value = ThemeManager.getDefaultCSS(this.currentType);
            bindingTypeSelect.value = 'global';
            characterSelector.style.display = 'none';
            delete modal.dataset.editingId;
        }
        
        // 绑定类型变化事件
        bindingTypeSelect.onchange = () => {
            this.updateCharacterSelector(bindingTypeSelect.value, []);
        };
        
        modal.classList.add('show');
    },
    
    // 更新角色选择器
    updateCharacterSelector(bindingType, selectedCharacters = []) {
        const characterSelector = document.getElementById('theme-character-selector');
        const characterList = document.getElementById('theme-character-list');
        
        if (bindingType === 'global') {
            characterSelector.style.display = 'none';
            return;
        }
        
        characterSelector.style.display = 'block';
        
        // 获取所有角色（从AppState）
        const characters = this.getAllCharacters();
        
        if (characters.length === 0) {
            characterList.innerHTML = '<div style="color:#999;font-size:13px;padding:10px;">暂无角色，请先添加好友或创建群聊</div>';
            return;
        }
        
        // 渲染角色列表
        characterList.innerHTML = characters.map(char => {
            // 处理头像显示
            let avatarHTML = '';
            if (char.avatar && char.avatar.trim()) {
                // 如果有头像URL，使用背景图片
                avatarHTML = `<span class="theme-character-avatar" style="background-image: url('${char.avatar}'); background-size: cover; background-position: center;"></span>`;
            } else {
                // 如果没有头像，显示首字母
                avatarHTML = `<span class="theme-character-avatar">${char.name.charAt(0)}</span>`;
            }
            
            return `
                <label class="theme-character-item">
                    <input type="${bindingType === 'single' ? 'radio' : 'checkbox'}"
                           name="theme-character"
                           value="${char.id}"
                           ${selectedCharacters.includes(char.id) ? 'checked' : ''}>
                    ${avatarHTML}
                    <span class="theme-character-name">${this.escapeHtml(char.name)}</span>
                </label>
            `;
        }).join('');
    },
    
    // 获取所有角色
    getAllCharacters() {
        if (!window.AppState) return [];
        
        const characters = [];
        
        // 添加好友
        if (AppState.friends) {
            AppState.friends.forEach(friend => {
                characters.push({
                    id: friend.id,
                    name: friend.name,
                    avatar: friend.avatar,
                    type: 'friend'
                });
            });
        }
        
        // 添加群组
        if (AppState.groups) {
            AppState.groups.forEach(group => {
                characters.push({
                    id: group.id,
                    name: group.name,
                    avatar: group.avatar,
                    type: 'group'
                });
            });
        }
        
        return characters;
    },
    
    // 获取角色名称
    getCharacterName(characterId) {
        const characters = this.getAllCharacters();
        const character = characters.find(c => c.id === characterId);
        return character ? character.name : '未知角色';
    },
    
    // 关闭编辑器
    closeEditor() {
        const modal = document.getElementById('theme-editor-modal');
        modal.classList.remove('show');
    },
    
    // 保存主题
    async saveTheme() {
        const modal = document.getElementById('theme-editor-modal');
        const nameInput = document.getElementById('theme-name-input');
        const cssInput = document.getElementById('theme-css-input');
        const bindingTypeSelect = document.getElementById('theme-binding-type');
        
        const name = nameInput.value.trim();
        const css = cssInput.value.trim();
        const bindingType = bindingTypeSelect ? bindingTypeSelect.value : 'global';
        
        if (!name) {
            this.showToast('请输入主题名称', 'error');
            return;
        }
        
        if (!css) {
            this.showToast('请输入CSS代码', 'error');
            return;
        }
        
        // 获取选中的角色
        let boundCharacters = [];
        if (bindingType !== 'global') {
            const characterInputs = document.querySelectorAll('input[name="theme-character"]:checked');
            boundCharacters = Array.from(characterInputs).map(input => input.value);
            
            if (boundCharacters.length === 0) {
                this.showToast('请选择至少一个角色', 'error');
                return;
            }
        }
        
        this.showLoading('正在保存主题...');
        
        try {
            if (modal.dataset.editingId) {
                // 更新现有主题
                const theme = ThemeManager.themes.find(t => t.id === modal.dataset.editingId);
                if (theme) {
                    theme.name = name;
                    theme.css = css;
                    theme.bindingType = bindingType;
                    theme.boundCharacters = boundCharacters;
                    await ThemeManager.saveTheme(theme);
                    
                    // 如果主题正在使用，重新应用
                    if (theme.isActive) {
                        ThemeManager.injectThemeStyle(theme);
                    }
                }
            } else {
                // 创建新主题
                await ThemeManager.createTheme(name, this.currentType, css, bindingType, boundCharacters);
            }
            
            this.hideLoading();
            this.showToast('主题保存成功');
            this.closeEditor();
            this.refresh();
        } catch (error) {
            this.hideLoading();
            this.showToast(error.message, 'error');
        }
    },
    
    // 应用主题
    async applyTheme(themeId) {
        this.showLoading('正在应用主题...');
        
        try {
            await ThemeManager.applyTheme(themeId);
            this.hideLoading();
            this.showToast('主题已应用');
            this.refresh();
        } catch (error) {
            this.hideLoading();
            this.showToast(error.message, 'error');
        }
    },
    
    // 编辑主题
    editTheme(themeId) {
        this.openEditor(themeId);
    },
    
    // 自定义确认对话框
    showConfirm(message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'custom-confirm-modal';
        modal.innerHTML = `
            <div class="custom-confirm-overlay"></div>
            <div class="custom-confirm-container">
                <div class="custom-confirm-message">${message}</div>
                <div class="custom-confirm-buttons">
                    <button class="custom-confirm-btn custom-confirm-cancel">取消</button>
                    <button class="custom-confirm-btn custom-confirm-ok">确定</button>
                </div>
            </div>
            <style>
                .custom-confirm-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .custom-confirm-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
                .custom-confirm-container {
                    position: relative;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(40px) saturate(180%);
                    -webkit-backdrop-filter: blur(40px) saturate(180%);
                    border-radius: 16px;
                    padding: 24px;
                    min-width: 280px;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    border: 0.5px solid rgba(255, 255, 255, 0.8);
                }
                .custom-confirm-message {
                    font-size: 16px;
                    color: #1a1a1a;
                    line-height: 1.6;
                    margin-bottom: 24px;
                    text-align: center;
                }
                .custom-confirm-buttons {
                    display: flex;
                    gap: 12px;
                }
                .custom-confirm-btn {
                    flex: 1;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    letter-spacing: 0.3px;
                }
                .custom-confirm-cancel {
                    background: rgba(0, 0, 0, 0.04);
                    color: #1a1a1a;
                }
                .custom-confirm-cancel:hover {
                    background: rgba(0, 0, 0, 0.08);
                }
                .custom-confirm-ok {
                    background: #000000;
                    color: #ffffff;
                }
                .custom-confirm-ok:hover {
                    background: #1a1a1a;
                }
                .custom-confirm-btn:active {
                    transform: scale(0.98);
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        
        modal.querySelector('.custom-confirm-overlay').onclick = closeModal;
        modal.querySelector('.custom-confirm-cancel').onclick = closeModal;
        modal.querySelector('.custom-confirm-ok').onclick = () => {
            closeModal();
            if (onConfirm) onConfirm();
        };
    },
    
    // 删除主题
    async deleteTheme(themeId) {
        this.showConfirm('确定要删除这个主题吗？', async () => {
            this.showLoading('正在删除主题...');
            
            try {
                await ThemeManager.deleteTheme(themeId);
                this.hideLoading();
                this.showToast('主题已删除');
                this.refresh();
            } catch (error) {
                this.hideLoading();
                this.showToast(error.message, 'error');
            }
        });
    },
    
    // 刷新页面
    refresh() {
        const page = document.getElementById('decoration-page');
        if (page) {
            this.render(page);
            this.bindEvents(page);
        }
    },
    
    // 显示加载提示
    showLoading(message) {
        // 复用现有的加载提示系统
        if (window.showLoadingToast) {
            window.showLoadingToast(message);
        }
    },
    
    // 隐藏加载提示
    hideLoading() {
        if (window.hideLoadingToast) {
            window.hideLoadingToast();
        }
    },
    
    // 显示提示消息
    showToast(message, type = 'success') {
        // 复用现有的提示系统
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    },
    
    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// 暴露到全局作用域
window.ThemeManager = ThemeManager;
window.ThemeManagerUI = ThemeManagerUI;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init().catch(err => {
        console.error('主题管理器初始化失败:', err);
    });
});