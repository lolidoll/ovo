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
            
            // 导入图片按钮
            const importImageBtn = document.getElementById('emoji-manager-import-image');
            if (importImageBtn) {
                importImageBtn.addEventListener('click', () => {
                    document.getElementById('emoji-manager-image-input').click();
                });
            }
            
            // 导入JSON按钮
            const importJsonBtn = document.getElementById('emoji-manager-import-json');
            if (importJsonBtn) {
                importJsonBtn.addEventListener('click', () => {
                    document.getElementById('emoji-manager-json-input').click();
                });
            }
            
            // 图片文件输入
            const imageInput = document.getElementById('emoji-manager-image-input');
            if (imageInput) {
                imageInput.addEventListener('change', (e) => {
                    this.handleImageImport(e.target.files);
                    e.target.value = '';
                });
            }
            
            // JSON文件输入
            const jsonInput = document.getElementById('emoji-manager-json-input');
            if (jsonInput) {
                jsonInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleJsonImport(e.target.files[0]);
                    }
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
            
            // 批量选择按钮
            const selectModeBtn = document.getElementById('emoji-manager-select-mode');
            if (selectModeBtn) {
                selectModeBtn.addEventListener('click', () => {
                    this.toggleSelectMode();
                });
            }
            
            // 取消选择按钮
            const cancelSelectBtn = document.getElementById('emoji-manager-cancel-select');
            if (cancelSelectBtn) {
                cancelSelectBtn.addEventListener('click', () => {
                    this.exitSelectMode();
                });
            }
        },
        
        // 切换选择模式
        toggleSelectMode: function() {
            const btn = document.getElementById('emoji-manager-select-mode');
            const cancelBtn = document.getElementById('emoji-manager-cancel-select');
            const contentArea = document.getElementById('emoji-manager-content');
            
            if (!btn || !contentArea) return;
            
            if (btn.classList.contains('active')) {
                // 执行批量删除
                const selectedItems = contentArea.querySelectorAll('.emoji-manager-item.selected');
                if (selectedItems.length === 0) {
                    this.showAlert('请先选择要删除的表情包');
                    return;
                }
                
                this.showConfirm(`确定要删除选中的 ${selectedItems.length} 个表情包吗？`, () => {
                    const idsToDelete = Array.from(selectedItems).map(item => item.dataset.id);
                    AppState.emojis = AppState.emojis.filter(e => !idsToDelete.includes(e.id));
                    
                    saveToStorage();
                    this.exitSelectMode();
                });
            } else {
                // 进入选择模式
                btn.classList.add('active');
                btn.querySelector('span').textContent = '删除选中';
                if (cancelBtn) {
                    cancelBtn.style.display = 'flex';
                }
                contentArea.querySelectorAll('.emoji-manager-item').forEach(item => {
                    item.classList.add('selecting');
                });
            }
        },
        
        // 退出选择模式
        exitSelectMode: function() {
            const btn = document.getElementById('emoji-manager-select-mode');
            const cancelBtn = document.getElementById('emoji-manager-cancel-select');
            const contentArea = document.getElementById('emoji-manager-content');
            
            if (btn) {
                btn.classList.remove('active');
                btn.querySelector('span').textContent = '批量选择';
            }
            if (cancelBtn) {
                cancelBtn.style.display = 'none';
            }
            
            // 重新渲染当前分组
            const activeGroup = document.querySelector('.emoji-group-btn.active');
            if (activeGroup) {
                this.renderEmojis(activeGroup.dataset.groupId);
            }
        },
        
        // 自定义Alert弹窗
        showAlert: function(message) {
            this.showDialog({
                title: '提示',
                message: message,
                buttons: [
                    { text: '确定', primary: true, callback: null }
                ]
            });
        },
        
        // 自定义Confirm弹窗
        showConfirm: function(message, onConfirm) {
            this.showDialog({
                title: '确认',
                message: message,
                buttons: [
                    { text: '取消', primary: false, callback: null },
                    { text: '确定', primary: true, callback: onConfirm }
                ]
            });
        },
        
        // 自定义Prompt弹窗
        showPrompt: function(message, defaultValue, onConfirm) {
            this.showDialog({
                title: '输入',
                message: message,
                input: true,
                defaultValue: defaultValue || '',
                buttons: [
                    { text: '取消', primary: false, callback: null },
                    { text: '确定', primary: true, callback: onConfirm }
                ]
            });
        },
        
        // 通用对话框
        showDialog: function(options) {
            // 移除已存在的对话框
            const existing = document.getElementById('emoji-custom-dialog');
            if (existing) existing.remove();
            
            const overlay = document.createElement('div');
            overlay.id = 'emoji-custom-dialog';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                animation: fadeIn 0.2s ease;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #ffffff;
                border-radius: 12px;
                padding: 20px;
                max-width: 320px;
                width: 85%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                animation: slideUp 0.3s ease;
            `;
            
            // 标题
            if (options.title) {
                const title = document.createElement('div');
                title.textContent = options.title;
                title.style.cssText = `
                    font-size: 16px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 12px;
                    text-align: center;
                `;
                dialog.appendChild(title);
            }
            
            // 消息
            if (options.message) {
                const message = document.createElement('div');
                message.textContent = options.message;
                message.style.cssText = `
                    font-size: 14px;
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: ${options.input ? '16px' : '20px'};
                    text-align: center;
                `;
                dialog.appendChild(message);
            }
            
            // 输入框
            let input;
            if (options.input) {
                input = document.createElement('input');
                input.type = 'text';
                input.value = options.defaultValue || '';
                input.style.cssText = `
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 14px;
                    margin-bottom: 20px;
                    box-sizing: border-box;
                    outline: none;
                `;
                input.addEventListener('focus', () => {
                    input.style.borderColor = '#667eea';
                });
                input.addEventListener('blur', () => {
                    input.style.borderColor = '#e0e0e0';
                });
                dialog.appendChild(input);
                setTimeout(() => input.focus(), 100);
            }
            
            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: center;
            `;
            
            // 按钮
            options.buttons.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.textContent = btnConfig.text;
                btn.style.cssText = `
                    flex: 1;
                    padding: 11px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    ${btnConfig.primary ?
                        'background: #667eea; color: #ffffff;' :
                        'background: #f5f5f5; color: #666;'}
                `;
                
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-1px)';
                    if (btnConfig.primary) {
                        btn.style.background = '#5568d3';
                    } else {
                        btn.style.background = '#ebebeb';
                    }
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    if (btnConfig.primary) {
                        btn.style.background = '#667eea';
                    } else {
                        btn.style.background = '#f5f5f5';
                    }
                });
                
                btn.addEventListener('click', () => {
                    if (btnConfig.callback) {
                        if (options.input) {
                            btnConfig.callback(input.value);
                        } else {
                            btnConfig.callback();
                        }
                    }
                    overlay.remove();
                });
                
                buttonContainer.appendChild(btn);
            });
            
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // 点击外部关闭（仅非必须确认的对话框）
            if (options.buttons.length === 1) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        overlay.remove();
                    }
                });
            }
            
            // 添加动画样式
            if (!document.getElementById('emoji-dialog-styles')) {
                const style = document.createElement('style');
                style.id = 'emoji-dialog-styles';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `;
                document.head.appendChild(style);
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
                        this.showConfirm(`确定要删除分组"${group.name}"吗？该分组下的所有表情包也会被删除。`, () => {
                            this.deleteGroup(group.id);
                        });
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
                
                // 检查是否处于选择模式
                const selectModeBtn = document.getElementById('emoji-manager-select-mode');
                const isSelectMode = selectModeBtn && selectModeBtn.classList.contains('active');
                
                if (isSelectMode) {
                    // 选择模式下添加selecting类
                    item.classList.add('selecting');
                }
                
                // 点击事件
                item.addEventListener('click', () => {
                    const selectBtn = document.getElementById('emoji-manager-select-mode');
                    if (selectBtn && selectBtn.classList.contains('active')) {
                        // 选择模式下切换选中状态
                        item.classList.toggle('selected');
                    }
                });
                
                // 长按菜单（移动端）
                let longPressTimer;
                item.addEventListener('touchstart', (e) => {
                    const selectBtn = document.getElementById('emoji-manager-select-mode');
                    if (selectBtn && selectBtn.classList.contains('active')) {
                        return; // 选择模式下不触发长按
                    }
                    longPressTimer = setTimeout(() => {
                        this.showEmojiMenu(emoji, item);
                    }, 500);
                });
                item.addEventListener('touchend', () => {
                    clearTimeout(longPressTimer);
                });
                item.addEventListener('touchmove', () => {
                    clearTimeout(longPressTimer);
                });
                
                // 双击编辑描述（桌面端）
                item.addEventListener('dblclick', () => {
                    const selectBtn = document.getElementById('emoji-manager-select-mode');
                    if (selectBtn && selectBtn.classList.contains('active')) {
                        return; // 选择模式下不触发双击
                    }
                    this.editEmojiDescription(emoji);
                });
                
                // 右键菜单（桌面端）
                item.addEventListener('contextmenu', (e) => {
                    const selectBtn = document.getElementById('emoji-manager-select-mode');
                    if (selectBtn && selectBtn.classList.contains('active')) {
                        return; // 选择模式下不触发右键菜单
                    }
                    e.preventDefault();
                    this.showEmojiMenu(emoji, item);
                });
                
                grid.appendChild(item);
            });
            
            contentArea.innerHTML = '';
            contentArea.appendChild(grid);
        },
        
        // 显示表情包菜单
        showEmojiMenu: function(emoji, itemElement) {
            // 移除已存在的菜单
            const existingMenu = document.getElementById('emoji-context-menu');
            if (existingMenu) existingMenu.remove();
            
            const menu = document.createElement('div');
            menu.id = 'emoji-context-menu';
            menu.style.cssText = `
                position: fixed;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10001;
                padding: 8px;
                min-width: 160px;
            `;
            
            const options = [
                {
                    text: '编辑描述',
                    action: () => {
                        menu.remove();
                        this.editEmojiDescription(emoji);
                    }
                },
                {
                    text: '移动到分组',
                    action: () => {
                        menu.remove();
                        this.moveEmojiToGroup(emoji);
                    }
                },
                {
                    text: '删除',
                    color: '#ff4757',
                    action: () => {
                        menu.remove();
                        this.showConfirm('确定要删除这个表情包吗？', () => {
                            AppState.emojis = AppState.emojis.filter(e => e.id !== emoji.id);
                            saveToStorage();
                            const activeGroup = document.querySelector('.emoji-group-btn.active');
                            if (activeGroup) {
                                this.renderEmojis(activeGroup.dataset.groupId);
                            }
                        });
                    }
                }
            ];
            
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.style.cssText = `
                    width: 100%;
                    padding: 14px 16px;
                    border: none;
                    background: transparent;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 8px;
                    font-size: 15px;
                    color: ${opt.color || '#333'};
                    transition: all 0.2s;
                    font-weight: 500;
                `;
                btn.textContent = opt.text;
                btn.addEventListener('click', opt.action);
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = opt.color ? '#fff5f5' : '#f5f5f5';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'transparent';
                });
                btn.addEventListener('touchstart', () => {
                    btn.style.background = opt.color ? '#fff5f5' : '#f5f5f5';
                });
                btn.addEventListener('touchend', () => {
                    setTimeout(() => {
                        btn.style.background = 'transparent';
                    }, 150);
                });
                menu.appendChild(btn);
            });
            
            document.body.appendChild(menu);
            
            // 定位菜单
            const rect = itemElement.getBoundingClientRect();
            const menuWidth = 160;
            const menuHeight = menu.offsetHeight;
            
            let left = rect.left + rect.width / 2 - menuWidth / 2;
            let top = rect.bottom + 8;
            
            // 边界检查
            if (left + menuWidth > window.innerWidth) {
                left = window.innerWidth - menuWidth - 10;
            }
            if (left < 10) {
                left = 10;
            }
            if (top + menuHeight > window.innerHeight) {
                top = rect.top - menuHeight - 8;
            }
            
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
            
            // 点击外部关闭
            setTimeout(() => {
                const closeMenu = (e) => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                        document.removeEventListener('touchstart', closeMenu);
                    }
                };
                document.addEventListener('click', closeMenu);
                document.addEventListener('touchstart', closeMenu);
            }, 100);
        },
        
        // 移动表情包到其他分组
        moveEmojiToGroup: function(emoji) {
            this.showGroupSelectDialog((groupId) => {
                if (groupId === emoji.groupId) {
                    this.showAlert('表情包已在该分组中');
                    return;
                }
                
                emoji.groupId = groupId;
                saveToStorage();
                
                const activeGroup = document.querySelector('.emoji-group-btn.active');
                if (activeGroup) {
                    this.renderEmojis(activeGroup.dataset.groupId);
                }
                
                this.showAlert('移动成功！');
            }, '移动到分组');
        },
        
        // 处理图片导入
        handleImageImport: function(files) {
            if (!files || files.length === 0) return;
            
            const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (filesArray.length === 0) {
                this.showAlert('请选择图片文件');
                return;
            }
            
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
                            this.showAlert('已导入 ' + filesArray.length + ' 个表情包');
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
                        this.showAlert('JSON文件中未找到有效的表情数据');
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
                        this.showAlert('已导入 ' + emojis.length + ' 个表情包');
                    });
                } catch (err) {
                    this.showAlert('JSON文件解析失败：' + err.message);
                }
            };
            reader.readAsText(file);
        },
        
        // 显示分组选择对话框
        showGroupSelectDialog: function(callback, title = '选择分组') {
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
                <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;text-align:center;">${title}</h3>
                <div id="group-select-list"></div>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            const list = document.getElementById('group-select-list');
            AppState.emojiGroups.forEach(group => {
                const btn = document.createElement('button');
                btn.style.cssText = `
                    width: 100%;
                    padding: 14px;
                    margin-bottom: 10px;
                    border: none;
                    border-radius: 10px;
                    background: #f5f5f5;
                    color: #333;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                    transition: all 0.2s;
                `;
                btn.textContent = group.name;
                btn.addEventListener('click', () => {
                    modal.remove();
                    callback(group.id);
                });
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#e8e8e8';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = '#f5f5f5';
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
            this.showPrompt('请输入表情包URL\n格式：名称:链接，多个用分号分隔\n例如：开心:https://example.com/1.jpg', '', (text) => {
                if (!text || !text.trim()) return;
                
                const emojis = this.parseUrlText(text);
                if (emojis.length === 0) {
                    this.showAlert('未找到有效的URL链接');
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
                    this.showAlert('已导入 ' + emojis.length + ' 个表情包');
                });
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
            this.showPrompt('请输入新分组的名称：', '', (name) => {
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
            });
        },
        
        // 编辑分组名称
        editGroupName: function(groupId) {
            const group = AppState.emojiGroups.find(g => g.id === groupId);
            if (!group) return;
            
            this.showPrompt('请输入新的分组名称：', group.name, (newName) => {
                if (!newName || newName.trim() === '') return;
                
                group.name = newName.trim();
                saveToStorage();
                
                this.renderGroups();
            });
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
            this.showPrompt('修改表情包描述：', emoji.text || '', (newDesc) => {
                if (newDesc && newDesc.trim()) {
                    emoji.text = newDesc.trim();
                    saveToStorage();
                    
                    const activeGroup = document.querySelector('.emoji-group-btn.active');
                    if (activeGroup) {
                        this.renderEmojis(activeGroup.dataset.groupId);
                    }
                }
            });
        }
    };
})();