// 表情包管理器模块
(function() {
    'use strict';
    
    // 表情包管理器对象
    window.EmojiManager = {
        // 初始化
        init: function() {
            this.initEventListeners();
            this.renderGroups();
        },
        
        // 初始化事件监听
        initEventListeners: function() {
            // 返回按钮
            const backBtn = document.getElementById('emoji-manager-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.hide();
                });
            }
            
            // 导入文件按钮
            const importFileBtn = document.getElementById('emoji-manager-import-file');
            if (importFileBtn) {
                importFileBtn.addEventListener('click', () => {
                    document.getElementById('emoji-manager-file-input').click();
                });
            }
            
            // 文件输入
            const fileInput = document.getElementById('emoji-manager-file-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    this.handleFileImport(e.target.files);
                    e.target.value = '';
                });
            }
            
            // 导入URL按钮
            const importUrlBtn = document.getElementById('emoji-manager-import-url');
            if (importUrlBtn) {
                importUrlBtn.addEventListener('click', () => {
                    this.showUrlImportDialog();
                });
            }
            
            // 删除模式按钮
            const deleteModeBtn = document.getElementById('emoji-manager-delete-mode');
            if (deleteModeBtn) {
                deleteModeBtn.addEventListener('click', () => {
                    this.toggleDeleteMode();
                });
            }
        },
        
        // 显示表情包管理器
        show: function() {
            const page = document.getElementById('emoji-manager-page');
            if (page) {
                page.style.display = 'flex';
                this.renderGroups();
            }
        },
        
        // 隐藏表情包管理器
        hide: function() {
            const page = document.getElementById('emoji-manager-page');
            if (page) {
                page.style.display = 'none';
            }
        },
        
        // 渲染分组
        renderGroups: function() {
            const container = document.getElementById('emoji-manager-groups');
            if (!container) return;
            
            container.innerHTML = '';
            
            const firstGroup = AppState.emojiGroups[0];
            if (!firstGroup) return;
            
            // 渲染每个分组
            AppState.emojiGroups.forEach((group, index) => {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'emoji-group-container';
                
                // 分组按钮
                const btn = document.createElement('button');
                btn.className = 'emoji-group-btn';
                btn.textContent = group.name.charAt(0).toUpperCase();
                btn.dataset.groupId = group.id;
                btn.title = index === 0 ? group.name + ' (默认)' : group.name;
                
                // 默认选中第一个分组
                if (group.id === firstGroup.id) {
                    btn.classList.add('active');
                    this.renderEmojis(group.id);
                }
                
                btn.addEventListener('click', () => {
                    // 移除所有active类
                    container.querySelectorAll('.emoji-group-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    // 添加active类
                    btn.classList.add('active');
                    // 渲染该分组的表情
                    this.renderEmojis(group.id);
                });
                
                groupContainer.appendChild(btn);
                
                // 操作按钮容器
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'emoji-group-actions';
                
                // 编辑按钮
                const editBtn = document.createElement('button');
                editBtn.className = 'emoji-group-action';
                editBtn.textContent = '编辑';
                editBtn.title = '修改分组名称';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editGroupName(group.id);
                });
                actionsContainer.appendChild(editBtn);
                
                // 删除按钮（默认分组不能删除）
                if (index > 0) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'emoji-group-action delete';
                    deleteBtn.textContent = '删除';
                    deleteBtn.title = '删除分组';
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除分组"${group.name}"吗？该分组下的所有表情包也会被删除。`)) {
                            this.deleteGroup(group.id);
                        }
                    });
                    actionsContainer.appendChild(deleteBtn);
                }
                
                groupContainer.appendChild(actionsContainer);
                container.appendChild(groupContainer);
            });
            
            // 添加"新增分组"按钮
            const addContainer = document.createElement('div');
            addContainer.className = 'emoji-group-container';
            
            const addBtn = document.createElement('button');
            addBtn.className = 'emoji-group-btn add-group';
            addBtn.textContent = '+';
            addBtn.title = '新增分组';
            addBtn.addEventListener('click', () => {
                this.createNewGroup();
            });
            
            addContainer.appendChild(addBtn);
            container.appendChild(addContainer);
        },
        
        // 渲染表情包
        renderEmojis: function(groupId) {
            const emojisInGroup = AppState.emojis.filter(e => e.groupId === groupId);
            const contentArea = document.getElementById('emoji-manager-content');
            
            if (!contentArea) return;
            
            if (emojisInGroup.length === 0) {
                contentArea.innerHTML = `
                    <div class="emoji-manager-empty">
                        <div style="font-size:48px;margin-bottom:8px;">🙂</div>
                        <div>该分组下暂无表情包</div>
                    </div>
                `;
                return;
            }
            
            const grid = document.createElement('div');
            grid.className = 'emoji-manager-grid';
            
            emojisInGroup.forEach(emoji => {
                const item = document.createElement('div');
                item.className = 'emoji-manager-item';
                item.dataset.id = emoji.id;
                
                const img = document.createElement('img');
                img.src = emoji.url;
                img.alt = emoji.text || '';
                
                const text = document.createElement('div');
                text.className = 'emoji-manager-item-text';
                text.textContent = emoji.text || '无描述';
                
                const checkbox = document.createElement('div');
                checkbox.className = 'emoji-manager-item-checkbox';
                
                item.appendChild(img);
                item.appendChild(text);
                item.appendChild(checkbox);
                
                // 双击编辑描述
                item.addEventListener('dblclick', () => {
                    this.editEmojiDescription(emoji);
                });
                
                // 单击选择（删除模式下）
                item.addEventListener('click', () => {
                    const deleteBtn = document.getElementById('emoji-manager-delete-mode');
                    if (deleteBtn && deleteBtn.classList.contains('active')) {
                        item.classList.toggle('selected');
                    }
                });
                
                grid.appendChild(item);
            });
            
            contentArea.innerHTML = '';
            contentArea.appendChild(grid);
        },
        
        // 切换删除模式
        toggleDeleteMode: function() {
            const btn = document.getElementById('emoji-manager-delete-mode');
            const contentArea = document.getElementById('emoji-manager-content');
            
            if (!btn || !contentArea) return;
            
            if (btn.classList.contains('active')) {
                // 执行删除
                const selectedItems = contentArea.querySelectorAll('.emoji-manager-item.selected');
                if (selectedItems.length === 0) {
                    alert('请先选择要删除的表情包');
                    return;
                }
                
                if (!confirm(`确定要删除选中的 ${selectedItems.length} 个表情包吗？`)) return;
                
                const idsToDelete = Array.from(selectedItems).map(item => item.dataset.id);
                AppState.emojis = AppState.emojis.filter(e => !idsToDelete.includes(e.id));
                
                saveToStorage();
                
                // 重新渲染当前分组
                const activeGroup = document.querySelector('.emoji-group-btn.active');
                if (activeGroup) {
                    this.renderEmojis(activeGroup.dataset.groupId);
                }
                
                // 退出删除模式
                btn.classList.remove('active');
                contentArea.querySelectorAll('.emoji-manager-item').forEach(item => {
                    item.classList.remove('selecting');
                });
            } else {
                // 进入删除模式
                btn.classList.add('active');
                contentArea.querySelectorAll('.emoji-manager-item').forEach(item => {
                    item.classList.add('selecting');
                });
            }
        },
        
        // 处理文件导入
        handleFileImport: function(files) {
            if (!files || files.length === 0) return;
            
            if (files.length > 1) {
                // 多个文件：直接导入
                this.importMultipleFiles(files);
            } else {
                // 单个文件
                const file = files[0];
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    this.handleJsonImport(file);
                } else if (file.type.startsWith('image/')) {
                    this.showSingleImageDialog(file);
                } else {
                    alert('不支持的文件类型');
                }
            }
        },
        
        // 导入多个文件
        importMultipleFiles: function(files) {
            const filesArray = Array.from(files);
            
            // 选择分组
            this.showGroupSelectDialog((groupId) => {
                let processed = 0;
                filesArray.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const fileName = file.name.replace(/\.[^.]+$/, '');
                        
                        AppState.emojis.push({
                            id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            url: e.target.result,
                            text: fileName,
                            groupId: groupId,
                            createdAt: new Date().toISOString()
                        });
                        
                        processed++;
                        if (processed === filesArray.length) {
                            saveToStorage();
                            this.renderGroups();
                            alert('已导入 ' + filesArray.length + ' 个表情包');
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });
        },
        
        // 处理JSON导入
        handleJsonImport: function(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    let emojis = [];
                    
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            const text = item.name || item.text || item.description || '无描述';
                            const url = item.url || item.image || item.link;
                            if (url) {
                                emojis.push({ text, url });
                            }
                        });
                    } else if (typeof data === 'object') {
                        Object.entries(data).forEach(([key, value]) => {
                            let text = key;
                            let url = '';
                            
                            if (typeof value === 'string') {
                                url = value;
                            } else if (typeof value === 'object') {
                                text = value.name || value.text || key;
                                url = value.url || value.image || value.link;
                            }
                            
                            if (url) {
                                emojis.push({ text, url });
                            }
                        });
                    }
                    
                    if (emojis.length === 0) {
                        alert('JSON文件中未找到有效的表情数据');
                        return;
                    }
                    
                    // 选择分组
                    this.showGroupSelectDialog((groupId) => {
                        emojis.forEach(emoji => {
                            AppState.emojis.push({
                                id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                url: emoji.url,
                                text: emoji.text,
                                groupId: groupId,
                                createdAt: new Date().toISOString()
                            });
                        });
                        
                        saveToStorage();
                        this.renderGroups();
                        alert('已导入 ' + emojis.length + ' 个表情包');
                    });
                } catch (err) {
                    alert('JSON文件解析失败：' + err.message);
                }
            };
            reader.readAsText(file);
        },
        
        // 显示单个图片描述对话框
        showSingleImageDialog: function(file) {
            const desc = prompt('请输入表情包描述：', file.name.replace(/\.[^.]+$/, ''));
            if (!desc) return;
            
            this.showGroupSelectDialog((groupId) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    AppState.emojis.push({
                        id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        url: e.target.result,
                        text: desc,
                        groupId: groupId,
                        createdAt: new Date().toISOString()
                    });
                    
                    saveToStorage();
                    this.renderGroups();
                    alert('已导入表情包');
                };
                reader.readAsDataURL(file);
            });
        },
        
        // 显示分组选择对话框
        showGroupSelectDialog: function(callback) {
            let modal = document.getElementById('emoji-group-select-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'emoji-group-select-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 300px;
                width: 90%;
            `;
            
            content.innerHTML = `
                <h3 style="margin:0 0 16px 0;font-size:16px;">选择分组</h3>
                <div id="group-select-list"></div>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            const list = document.getElementById('group-select-list');
            AppState.emojiGroups.forEach(group => {
                const btn = document.createElement('button');
                btn.style.cssText = `
                    width: 100%;
                    padding: 12px;
                    margin-bottom: 8px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                `;
                btn.textContent = group.name;
                btn.addEventListener('click', () => {
                    modal.remove();
                    callback(group.id);
                });
                list.appendChild(btn);
            });
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },
        
        // 显示URL导入对话框
        showUrlImportDialog: function() {
            const text = prompt('请输入表情包URL（格式：名称:链接，多个用分号分隔）\n例如：开心:https://example.com/1.jpg;难过:https://example.com/2.jpg');
            if (!text) return;
            
            const emojis = this.parseUrlText(text);
            if (emojis.length === 0) {
                alert('未找到有效的URL链接');
                return;
            }
            
            this.showGroupSelectDialog((groupId) => {
                emojis.forEach(emoji => {
                    AppState.emojis.push({
                        id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        url: emoji.url,
                        text: emoji.text,
                        groupId: groupId,
                        createdAt: new Date().toISOString()
                    });
                });
                
                saveToStorage();
                this.renderGroups();
                alert('已导入 ' + emojis.length + ' 个表情包');
            });
        },
        
        // 解析URL文本
        parseUrlText: function(text) {
            const emojis = [];
            
            // 支持分号分隔
            if (text.includes(';') || text.includes('；') || text.includes(':') || text.includes('：')) {
                const pairs = text.split(/[;；]/).map(p => p.trim()).filter(p => p);
                
                pairs.forEach(pair => {
                    const colonIndex = pair.search(/[:：]/);
                    if (colonIndex === -1) return;
                    
                    const name = pair.substring(0, colonIndex).trim();
                    const url = pair.substring(colonIndex + 1).trim();
                    
                    if (name && url && (url.startsWith('http://') || url.startsWith('https://'))) {
                        emojis.push({ text: name, url: url });
                    }
                });
            }
            
            return emojis;
        },
        
        // 创建新分组
        createNewGroup: function() {
            const name = prompt('请输入新分组的名称：');
            if (!name || name.trim() === '') return;
            
            const newGroup = {
                id: 'group_' + Date.now(),
                name: name.trim(),
                createdAt: new Date().toISOString()
            };
            
            AppState.emojiGroups.push(newGroup);
            saveToStorage();
            
            this.renderGroups();
            this.renderEmojis(newGroup.id);
        },
        
        // 编辑分组名称
        editGroupName: function(groupId) {
            const group = AppState.emojiGroups.find(g => g.id === groupId);
            if (!group) return;
            
            const newName = prompt('请输入新的分组名称：', group.name);
            if (!newName || newName.trim() === '') return;
            
            group.name = newName.trim();
            saveToStorage();
            
            this.renderGroups();
        },
        
        // 删除分组
        deleteGroup: function(groupId) {
            AppState.emojiGroups = AppState.emojiGroups.filter(g => g.id !== groupId);
            AppState.emojis = AppState.emojis.filter(e => e.groupId !== groupId);
            
            saveToStorage();
            
            this.renderGroups();
            
            const firstGroup = AppState.emojiGroups[0];
            if (firstGroup) {
                this.renderEmojis(firstGroup.id);
            }
        },
        
        // 编辑表情描述
        editEmojiDescription: function(emoji) {
            const newDesc = prompt('修改表情包描述：', emoji.text || '');
            if (newDesc !== null && newDesc.trim()) {
                emoji.text = newDesc.trim();
                saveToStorage();
                
                const activeGroup = document.querySelector('.emoji-group-btn.active');
                if (activeGroup) {
                    this.renderEmojis(activeGroup.dataset.groupId);
                }
            }
        }
    };
})();