/**
 * 消息/好友页面背景管理器 UI
 */

const MessageBackgroundManagerUI = {
    open(pageType = 'msg') {
        if (!window.MessageBackgroundManager) {
            console.error('MessageBackgroundManager 未加载');
            return;
        }

        const targetPageType = MessageBackgroundManager.normalizePageType(pageType);
        MessageBackgroundManager.setCurrentPageType(targetPageType);

        let page = document.getElementById('message-background-manager-page');
        if (!page) {
            page = document.createElement('div');
            page.id = 'message-background-manager-page';
            page.className = 'sub-page';
            document.getElementById('app-container').appendChild(page);
        }

        const scopeLabel = targetPageType === 'friend' ? '好友页面' : '消息页面';
        const title = targetPageType === 'friend' ? '好友背景' : '消息背景';
        const backgrounds = MessageBackgroundManager.getBackgrounds(targetPageType);
        const currentBackgroundId = MessageBackgroundManager.getStoredBackgroundId(targetPageType);
        const currentSearchInputStyle = MessageBackgroundManager.getSearchInputStyle(targetPageType);

        let backgroundsHTML = '';
        if (backgrounds.length > 0) {
            backgroundsHTML = backgrounds
                .slice()
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .map((bg) => `
                    <div class="bg-item ${bg.id === currentBackgroundId ? 'active' : ''}" data-id="${bg.id}">
                        <div class="bg-preview" style="background-image:url('${bg.imageData}')"></div>
                        <div class="bg-info">
                            <div class="bg-name" title="${this.escapeHtml(bg.name)}">${this.escapeHtml(bg.name)}</div>
                            <div class="bg-size">${this.escapeHtml(bg.size || '未知大小')}</div>
                        </div>
                        <div class="bg-actions">
                            <button class="bg-apply-btn" data-id="${bg.id}">应用</button>
                            <button class="bg-delete-btn" data-id="${bg.id}">删除</button>
                        </div>
                    </div>
                `)
                .join('');
        } else {
            backgroundsHTML = '<div class="no-backgrounds">当前页面还没有背景图，先上传一张吧</div>';
        }

        page.innerHTML = `
            <div class="sub-nav">
                <div class="back-btn" id="message-background-back-btn">
                    <div class="back-arrow"></div>
                    <span>返回</span>
                </div>
                <div class="sub-title">${title}</div>
            </div>
            <div class="sub-content" style="padding:0;background:#f5f5f7;overflow-y:auto;">
                <div class="message-background-container">
                    <div class="scope-switch">
                        <button class="scope-btn ${targetPageType === 'msg' ? 'active' : ''}" data-scope="msg">消息页面</button>
                        <button class="scope-btn ${targetPageType === 'friend' ? 'active' : ''}" data-scope="friend">好友页面</button>
                    </div>

                    <div class="scope-hint">背景会覆盖整个 app-container（包含顶部栏、搜索栏、底部栏）。当前编辑：${scopeLabel}</div>

                    <div class="search-style-section">
                        <div class="list-title">${scopeLabel} 搜索框样式</div>
                        <div class="search-style-panel">
                            <label class="search-style-field">
                                <span>背景颜色</span>
                                <input type="color" id="search-bg-color" value="${currentSearchInputStyle.color}">
                            </label>
                            <label class="search-style-field">
                                <span>透明度 <em id="search-bg-opacity-value"></em></span>
                                <input type="range" id="search-bg-opacity" min="0" max="1" step="0.01" value="${currentSearchInputStyle.opacity}">
                            </label>
                        </div>
                    </div>

                    <div class="upload-section">
                        <div class="upload-title">上传 ${scopeLabel} 背景图</div>
                        <div class="upload-area" id="upload-area">
                            <div class="upload-icon">+</div>
                            <div class="upload-text">点击上传或拖拽图片到此</div>
                            <div class="upload-hint">支持 JPG/PNG/GIF，最大 10MB</div>
                            <input type="file" id="background-file-input" accept="image/*" style="display:none;">
                        </div>
                    </div>

                    <div class="backgrounds-list-section">
                        <div class="list-title">${scopeLabel} 已上传背景</div>
                        <div class="backgrounds-list">
                            ${backgroundsHTML}
                        </div>
                    </div>

                    <div class="actions-section">
                        <button class="clear-background-btn" id="clear-current-background-btn">清除当前页面背景</button>
                    </div>
                </div>
            </div>

            <style>
                .message-background-container {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .scope-switch {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .scope-btn {
                    border: 1px solid #d8d8dd;
                    background: #fff;
                    color: #333;
                    border-radius: 10px;
                    padding: 10px 12px;
                    font-size: 13px;
                    cursor: pointer;
                }

                .scope-btn.active {
                    background: #111;
                    color: #fff;
                    border-color: #111;
                }

                .scope-hint {
                    font-size: 12px;
                    color: #666;
                    line-height: 1.5;
                }

                .upload-section,
                .backgrounds-list-section,
                .search-style-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .upload-title,
                .list-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #111;
                }

                .search-style-panel {
                    border: 1px solid #e5e5ea;
                    border-radius: 12px;
                    background: #fff;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .search-style-field {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .search-style-field span {
                    font-size: 13px;
                    color: #333;
                    font-weight: 500;
                }

                .search-style-field em {
                    font-style: normal;
                    color: #666;
                }

                #search-bg-color {
                    width: 100%;
                    height: 38px;
                    border: 1px solid #d8d8dd;
                    border-radius: 8px;
                    background: #fff;
                    padding: 2px;
                    cursor: pointer;
                }

                #search-bg-opacity {
                    width: 100%;
                }

                .upload-area {
                    border: 2px dashed #d6d6db;
                    border-radius: 12px;
                    padding: 24px 16px;
                    text-align: center;
                    background: #fff;
                    cursor: pointer;
                    transition: border-color .2s ease, background .2s ease;
                }

                .upload-area:hover {
                    border-color: #aaa;
                    background: #fafafa;
                }

                .upload-icon {
                    width: 36px;
                    height: 36px;
                    line-height: 36px;
                    border-radius: 50%;
                    margin: 0 auto 8px;
                    background: #f0f0f3;
                    font-size: 22px;
                    color: #666;
                }

                .upload-text {
                    font-size: 14px;
                    color: #222;
                }

                .upload-hint {
                    margin-top: 6px;
                    font-size: 12px;
                    color: #888;
                }

                .backgrounds-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .bg-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border: 1px solid #e5e5ea;
                    border-radius: 12px;
                    padding: 10px;
                    background: #fff;
                }

                .bg-item.active {
                    border-color: #111;
                }

                .bg-preview {
                    width: 56px;
                    height: 56px;
                    border-radius: 8px;
                    flex-shrink: 0;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    border: 1px solid #ececf0;
                }

                .bg-info {
                    min-width: 0;
                    flex: 1;
                }

                .bg-name {
                    font-size: 13px;
                    color: #111;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .bg-size {
                    margin-top: 2px;
                    font-size: 12px;
                    color: #888;
                }

                .bg-actions {
                    display: flex;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .bg-apply-btn,
                .bg-delete-btn {
                    border: 1px solid #d4d4d8;
                    background: #fff;
                    color: #222;
                    border-radius: 8px;
                    font-size: 12px;
                    padding: 6px 10px;
                    cursor: pointer;
                }

                .bg-apply-btn {
                    background: #111;
                    color: #fff;
                    border-color: #111;
                }

                .no-backgrounds {
                    font-size: 13px;
                    color: #888;
                    text-align: center;
                    background: #fff;
                    border: 1px dashed #d8d8dd;
                    border-radius: 12px;
                    padding: 22px 12px;
                }

                .clear-background-btn {
                    width: 100%;
                    border: 1px solid #ffb8b8;
                    background: #fff5f5;
                    color: #c73434;
                    border-radius: 12px;
                    padding: 12px 14px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                }

                @media (max-width: 480px) {
                    .message-background-container {
                        padding: 16px 12px;
                    }

                    .bg-item {
                        flex-wrap: wrap;
                    }

                    .bg-actions {
                        width: 100%;
                    }
                }
            </style>
        `;

        page.classList.add('open');
        this.bindEvents(page, targetPageType);
    },

    bindEvents(page, pageType) {
        const backBtn = page.querySelector('#message-background-back-btn');
        if (backBtn) {
            backBtn.onclick = () => page.remove();
        }

        const scopeBtns = page.querySelectorAll('.scope-btn');
        scopeBtns.forEach((btn) => {
            btn.onclick = () => {
                this.open(btn.dataset.scope);
            };
        });

        const searchBgColorInput = page.querySelector('#search-bg-color');
        const searchBgOpacityInput = page.querySelector('#search-bg-opacity');
        const searchBgOpacityValue = page.querySelector('#search-bg-opacity-value');
        if (searchBgColorInput && searchBgOpacityInput && searchBgOpacityValue) {
            let saveStyleTimer = null;

            const updateOpacityValue = () => {
                const opacity = Number(searchBgOpacityInput.value);
                const percent = Math.round(opacity * 100);
                searchBgOpacityValue.textContent = `${percent}%`;
            };

            const queueSaveSearchStyle = () => {
                updateOpacityValue();
                clearTimeout(saveStyleTimer);
                saveStyleTimer = setTimeout(() => {
                    MessageBackgroundManager.saveSearchInputStyle(pageType, {
                        color: searchBgColorInput.value,
                        opacity: Number(searchBgOpacityInput.value)
                    }).catch((error) => {
                        console.error('保存搜索框样式失败:', error);
                    });
                }, 120);
            };

            searchBgColorInput.oninput = queueSaveSearchStyle;
            searchBgOpacityInput.oninput = queueSaveSearchStyle;
            updateOpacityValue();
        }

        const uploadArea = page.querySelector('#upload-area');
        const fileInput = page.querySelector('#background-file-input');

        if (uploadArea && fileInput) {
            uploadArea.onclick = () => fileInput.click();

            uploadArea.ondragover = (event) => {
                event.preventDefault();
                uploadArea.style.borderColor = '#999';
                uploadArea.style.background = '#f8f8f8';
            };

            uploadArea.ondragleave = () => {
                uploadArea.style.borderColor = '#d6d6db';
                uploadArea.style.background = '#fff';
            };

            uploadArea.ondrop = (event) => {
                event.preventDefault();
                uploadArea.style.borderColor = '#d6d6db';
                uploadArea.style.background = '#fff';

                const files = event.dataTransfer.files;
                if (files && files[0]) {
                    this.handleFileSelect(files[0], pageType);
                }
            };

            fileInput.onchange = () => {
                if (fileInput.files && fileInput.files[0]) {
                    this.handleFileSelect(fileInput.files[0], pageType);
                }
            };
        }

        const applyBtns = page.querySelectorAll('.bg-apply-btn');
        applyBtns.forEach((btn) => {
            btn.onclick = async (event) => {
                event.stopPropagation();
                const bgId = btn.dataset.id;
                const bg = MessageBackgroundManager.getBackground(bgId, pageType);
                if (!bg) {
                    return;
                }

                MessageBackgroundManager.applyBackground(bg, pageType);
                await MessageBackgroundManager.saveCurrentBackgroundId(bgId, pageType);
                this.open(pageType);

                if (window.showToast) {
                    window.showToast('背景已应用');
                }
            };
        });

        const deleteBtns = page.querySelectorAll('.bg-delete-btn');
        deleteBtns.forEach((btn) => {
            btn.onclick = async (event) => {
                event.stopPropagation();
                const bgId = btn.dataset.id;
                if (!confirm('确定删除这张背景图吗？')) {
                    return;
                }

                await MessageBackgroundManager.deleteBackground(bgId, pageType);
                this.open(pageType);

                if (window.showToast) {
                    window.showToast('背景已删除');
                }
            };
        });

        const clearBtn = page.querySelector('#clear-current-background-btn');
        if (clearBtn) {
            clearBtn.onclick = async () => {
                if (!confirm('确定清除当前页面已应用的背景吗？')) {
                    return;
                }

                await MessageBackgroundManager.saveCurrentBackgroundId(null, pageType);
                MessageBackgroundManager.applyCurrentTabBackground();
                this.open(pageType);

                if (window.showToast) {
                    window.showToast('当前页面背景已清除');
                }
            };
        }
    },

    handleFileSelect(file, pageType) {
        if (!file || !file.type.startsWith('image/')) {
            if (window.showToast) {
                window.showToast('请选择图片文件');
            }
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            if (window.showToast) {
                window.showToast('图片大小不能超过 10MB');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const backgroundData = {
                id: MessageBackgroundManager.generateId(),
                name: file.name,
                size: this.formatFileSize(file.size),
                imageData: event.target.result,
                createdAt: new Date().toISOString()
            };

            try {
                await MessageBackgroundManager.saveBackground(backgroundData, pageType);
                MessageBackgroundManager.applyBackground(backgroundData, pageType);
                await MessageBackgroundManager.saveCurrentBackgroundId(backgroundData.id, pageType);

                if (window.showToast) {
                    window.showToast('背景上传并应用成功');
                }

                this.open(pageType);
            } catch (error) {
                console.error('保存背景图失败:', error);
                if (window.showToast) {
                    window.showToast('保存背景图失败');
                }
            }
        };

        reader.onerror = () => {
            if (window.showToast) {
                window.showToast('读取图片失败');
            }
        };

        reader.readAsDataURL(file);
    },

    formatFileSize(bytes) {
        if (!bytes) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex += 1;
        }

        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    },

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};

window.MessageBackgroundManagerUI = MessageBackgroundManagerUI;
console.log('✅ MessageBackgroundManagerUI 已暴露到 window 对象');
