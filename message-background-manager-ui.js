/**
 * 消息背景管理器UI
 * 提供上传、预览、管理背景图的用户界面
 */

const MessageBackgroundManagerUI = {
    
    // 打开消息背景管理器
    open() {
        let page = document.getElementById('message-background-manager-page');
        if (!page) {
            page = document.createElement('div');
            page.id = 'message-background-manager-page';
            page.className = 'sub-page';
            document.getElementById('app-container').appendChild(page);
        }
        
        const currentBg = MessageBackgroundManager.currentBackgroundId;
        const backgrounds = MessageBackgroundManager.getBackgrounds();
        
        let backgroundsHTML = '';
        if (backgrounds && backgrounds.length > 0) {
            backgroundsHTML = backgrounds.map(bg => `
                <div class="bg-item ${bg.id === currentBg ? 'active' : ''}" data-id="${bg.id}">
                    <div class="bg-preview" style="background-image: url(${bg.imageData}); background-size: cover; background-position: center;"></div>
                    <div class="bg-info">
                        <div class="bg-name">${bg.name}</div>
                        <div class="bg-size">${bg.size || '未知'}</div>
                    </div>
                    <div class="bg-actions">
                        <button class="bg-apply-btn" data-id="${bg.id}">应用</button>
                        <button class="bg-delete-btn" data-id="${bg.id}">删除</button>
                    </div>
                </div>
            `).join('');
        } else {
            backgroundsHTML = '<div class="no-backgrounds">暂无背景图，请上传一张</div>';
        }
        
        page.innerHTML = `
            <div class="sub-nav">
                <div class="back-btn" id="message-background-back-btn">
                    <div class="back-arrow"></div>
                    <span>返回</span>
                </div>
                <div class="sub-title">消息背景</div>
            </div>
            <div class="sub-content" style="padding:0;background:#f5f5f7;overflow-y:auto;">
                <div class="message-background-container">
                    <!-- 上传区域 -->
                    <div class="upload-section">
                        <div class="upload-title">上传背景图</div>
                        <div class="upload-area" id="upload-area">
                            <div class="upload-icon">
                                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                            </div>
                            <div class="upload-text">点击上传或拖拽图片到此</div>
                            <div class="upload-hint">支持 JPG、PNG、GIF 格式，最大 10MB</div>
                            <input type="file" id="background-file-input" accept="image/*" style="display:none;">
                        </div>
                    </div>
                    
                    <!-- 背景图列表 -->
                    <div class="backgrounds-list-section">
                        <div class="list-title">已上传的背景图</div>
                        <div class="backgrounds-list">
                            ${backgroundsHTML}
                        </div>
                    </div>
                    
                    <!-- 设置选项 -->
                    <div class="settings-section">
                        <div class="settings-title">应用范围</div>
                        <div class="settings-options">
                            <label class="option-label">
                                <input type="checkbox" id="apply-to-chat-area" checked>
                                <span>消息页面</span>
                            </label>
                            <label class="option-label">
                                <input type="checkbox" id="apply-to-top-bar">
                                <span>顶部栏</span>
                            </label>
                            <label class="option-label">
                                <input type="checkbox" id="apply-to-bottom-bar">
                                <span>底部栏</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 清除按钮 -->
                    <div class="actions-section">
                        <button class="clear-background-btn" id="clear-background-btn">清除所有背景</button>
                    </div>
                </div>
            </div>
            
            <style>
                /* ========================================
                   消息背景管理器 - iOS风格设计
                ======================================== */
                
                .message-background-container {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                /* 上传区域 */
                .upload-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .upload-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                
                .upload-area {
                    background: rgba(255, 255, 255, 0.9);
                    border: 2px dashed rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    padding: 32px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }
                
                .upload-area:hover {
                    border-color: rgba(0, 0, 0, 0.3);
                    background: rgba(255, 255, 255, 1);
                }
                
                .upload-icon {
                    color: #86868b;
                    display: flex;
                    justify-content: center;
                }
                
                .upload-text {
                    font-size: 15px;
                    color: #1a1a1a;
                    font-weight: 500;
                }
                
                .upload-hint {
                    font-size: 12px;
                    color: #86868b;
                }
                
                /* 背景图列表 */
                .backgrounds-list-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .list-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                
                .backgrounds-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .bg-item {
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    border: 2px solid transparent;
                    transition: all 0.3s ease;
                }
                
                .bg-item.active {
                    border-color: #007AFF;
                    background: rgba(0, 122, 255, 0.05);
                }
                
                .bg-preview {
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    flex-shrink: 0;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                .bg-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 0;
                }
                
                .bg-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: #1a1a1a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .bg-size {
                    font-size: 12px;
                    color: #86868b;
                }
                
                .bg-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .bg-apply-btn,
                .bg-delete-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .bg-apply-btn {
                    background: #007AFF;
                    color: white;
                }
                
                .bg-apply-btn:hover {
                    background: #0051d5;
                    transform: scale(1.05);
                }
                
                .bg-delete-btn {
                    background: rgba(0, 0, 0, 0.08);
                    color: #1a1a1a;
                }
                
                .bg-delete-btn:hover {
                    background: rgba(0, 0, 0, 0.12);
                }
                
                .no-backgrounds {
                    text-align: center;
                    padding: 40px 20px;
                    color: #86868b;
                    font-size: 14px;
                }
                
                /* 设置选项 */
                .settings-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .settings-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                
                .settings-options {
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .option-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #1a1a1a;
                }
                
                .option-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: #007AFF;
                }
                
                /* 操作按钮 */
                .actions-section {
                    display: flex;
                    gap: 12px;
                }
                
                .clear-background-btn {
                    flex: 1;
                    padding: 14px;
                    background: rgba(255, 59, 48, 0.1);
                    border: 1px solid rgba(255, 59, 48, 0.3);
                    border-radius: 12px;
                    color: #FF3B30;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .clear-background-btn:hover {
                    background: rgba(255, 59, 48, 0.2);
                    border-color: rgba(255, 59, 48, 0.5);
                }
                
                /* 响应式 */
                @media (max-width: 480px) {
                    .message-background-container {
                        padding: 16px;
                        gap: 20px;
                    }
                    
                    .bg-item {
                        flex-wrap: wrap;
                    }
                    
                    .bg-actions {
                        width: 100%;
                        order: 3;
                    }
                    
                    .upload-area {
                        padding: 24px 16px;
                    }
                }
            </style>
        `;
        
        // 绑定事件
        this.bindEvents(page);
        
        // 更新显示
        document.getElementById('app-container').style.display = 'block';
    },
    
    // 绑定事件
    bindEvents(page) {
        // 返回按钮
        const backBtn = page.querySelector('#message-background-back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                page.remove();
            };
        }
        
        // 上传区域
        const uploadArea = page.querySelector('#upload-area');
        const fileInput = page.querySelector('#background-file-input');
        
        if (uploadArea && fileInput) {
            uploadArea.onclick = () => fileInput.click();
            
            // 拖拽上传
            uploadArea.ondragover = (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'rgba(0, 0, 0, 0.3)';
                uploadArea.style.background = 'rgba(255, 255, 255, 1)';
            };
            
            uploadArea.ondragleave = () => {
                uploadArea.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                uploadArea.style.background = 'rgba(255, 255, 255, 0.9)';
            };
            
            uploadArea.ondrop = (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                uploadArea.style.background = 'rgba(255, 255, 255, 0.9)';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            };
            
            fileInput.onchange = () => {
                if (fileInput.files.length > 0) {
                    this.handleFileSelect(fileInput.files[0]);
                }
            };
        }
        
        // 应用背景按钮
        const applyBtns = page.querySelectorAll('.bg-apply-btn');
        applyBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const bgId = btn.dataset.id;
                const bg = MessageBackgroundManager.getBackground(bgId);
                if (bg) {
                    MessageBackgroundManager.applyBackground(bg);
                    MessageBackgroundManager.saveCurrentBackgroundId(bgId);
                    // 更新UI
                    this.open();
                    if (window.showToast) {
                        window.showToast('背景已应用');
                    }
                }
            };
        });
        
        // 删除背景按钮
        const deleteBtns = page.querySelectorAll('.bg-delete-btn');
        deleteBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const bgId = btn.dataset.id;
                if (confirm('确定要删除这张背景图吗？')) {
                    MessageBackgroundManager.deleteBackground(bgId).then(() => {
                        this.open();
                        if (window.showToast) {
                            window.showToast('背景已删除');
                        }
                    });
                }
            };
        });
        
        // 清除背景按钮
        const clearBtn = page.querySelector('#clear-background-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm('确定要清除所有背景设置吗？')) {
                    MessageBackgroundManager.clearBackground();
                    MessageBackgroundManager.saveCurrentBackgroundId(null);
                    if (window.showToast) {
                        window.showToast('背景已清除');
                    }
                }
            };
        }
    },
    
    // 处理文件选择
    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            if (window.showToast) {
                window.showToast('请选择图片文件');
            }
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            if (window.showToast) {
                window.showToast('图片大小不能超过10MB');
            }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const backgroundData = {
                id: MessageBackgroundManager.generateId(),
                name: file.name,
                size: this.formatFileSize(file.size),
                imageData: e.target.result,
                createdAt: new Date().toISOString(),
                applyToTopBar: false,
                applyToBottomBar: false
            };
            
            MessageBackgroundManager.saveBackground(backgroundData).then(() => {
                if (window.showToast) {
                    window.showToast('背景图已保存');
                }
                this.open();
            }).catch(err => {
                console.error('保存背景图失败:', err);
                if (window.showToast) {
                    window.showToast('保存背景图失败');
                }
            });
        };
        
        reader.onerror = () => {
            if (window.showToast) {
                window.showToast('读取文件失败');
            }
        };
        
        reader.readAsDataURL(file);
    },
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
};

// 暴露到window对象
window.MessageBackgroundManagerUI = MessageBackgroundManagerUI;
console.log('✅ MessageBackgroundManagerUI 已暴露到 window 对象');

// 初始化时验证管理器是否已加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.MessageBackgroundManager) {
            console.warn('⚠️ MessageBackgroundManager 还未加载');
        } else {
            console.log('✅ MessageBackgroundManagerUI 和 Manager 都已加载');
        }
    });
} else {
    if (!window.MessageBackgroundManager) {
        console.warn('⚠️ MessageBackgroundManager 还未加载');
    } else {
        console.log('✅ MessageBackgroundManagerUI 和 Manager 都已加载');
    }
}
