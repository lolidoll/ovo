// 字体管理器
const FontManager = {
    fonts: [], // 字体库 [{ id, name, data, format, createdAt, isActive }]
    currentFontId: null,
    db: null,
    
    // 初始化
    async init() {
        console.log('字体管理器初始化...');
        await this.initIndexedDB();
        await this.loadFonts();
        this.applyStoredFont();
    },
    
    // 初始化IndexedDB
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FontManagerDB', 1);
            
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
                if (!db.objectStoreNames.contains('fonts')) {
                    const objectStore = db.createObjectStore('fonts', { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('创建fonts对象存储');
                }
            };
        });
    },
    
    // 从IndexedDB加载字体
    async loadFonts() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fonts'], 'readonly');
            const objectStore = transaction.objectStore('fonts');
            const request = objectStore.getAll();
            
            request.onsuccess = () => {
                this.fonts = request.result || [];
                console.log(`加载了 ${this.fonts.length} 个字体`);
                
                // 从localStorage加载当前激活的字体ID
                const storedFontId = localStorage.getItem('activeFontId');
                if (storedFontId) {
                    this.currentFontId = storedFontId;
                }
                
                resolve();
            };
            
            request.onerror = () => {
                console.error('加载字体失败');
                reject(request.error);
            };
        });
    },
    
    // 保存字体到IndexedDB
    async saveFont(fontData) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fonts'], 'readwrite');
            const objectStore = transaction.objectStore('fonts');
            const request = objectStore.put(fontData);
            
            request.onsuccess = () => {
                console.log('字体保存成功:', fontData.name);
                resolve();
            };
            
            request.onerror = () => {
                console.error('字体保存失败');
                reject(request.error);
            };
        });
    },
    
    // 删除字体
    async deleteFont(fontId) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fonts'], 'readwrite');
            const objectStore = transaction.objectStore('fonts');
            const request = objectStore.delete(fontId);
            
            request.onsuccess = () => {
                console.log('字体删除成功:', fontId);
                // 从内存中移除
                this.fonts = this.fonts.filter(f => f.id !== fontId);
                
                // 如果删除的是当前激活的字体，清除激活状态
                if (this.currentFontId === fontId) {
                    this.currentFontId = null;
                    localStorage.removeItem('activeFontId');
                    this.removeGlobalFont();
                }
                
                resolve();
            };
            
            request.onerror = () => {
                console.error('字体删除失败');
                reject(request.error);
            };
        });
    },
    
    // 导入TTF字体文件
    async importFontFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.name.toLowerCase().endsWith('.ttf')) {
                reject(new Error('仅支持TTF格式字体文件'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const base64 = this.arrayBufferToBase64(arrayBuffer);
                    
                    // 生成字体ID和名称
                    const fontId = 'font_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    const fontName = file.name.replace('.ttf', '').replace('.TTF', '');
                    
                    const fontData = {
                        id: fontId,
                        name: fontName,
                        data: base64,
                        format: 'truetype',
                        createdAt: new Date().toISOString(),
                        isActive: false
                    };
                    
                    // 保存到IndexedDB
                    await this.saveFont(fontData);
                    
                    // 添加到内存
                    this.fonts.push(fontData);
                    
                    resolve(fontData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    },
    
    // 在线导入字体（通过URL）
    async importFontFromURL(url, fontName) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('字体下载失败');
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const base64 = this.arrayBufferToBase64(arrayBuffer);
            
            const fontId = 'font_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const fontData = {
                id: fontId,
                name: fontName || 'Online Font',
                data: base64,
                format: 'truetype',
                createdAt: new Date().toISOString(),
                isActive: false
            };
            
            await this.saveFont(fontData);
            this.fonts.push(fontData);
            
            return fontData;
        } catch (error) {
            throw new Error('在线导入失败: ' + error.message);
        }
    },
    
    // ArrayBuffer转Base64
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },
    
    // 应用字体到全局
    async applyFont(fontId) {
        const font = this.fonts.find(f => f.id === fontId);
        if (!font) {
            throw new Error('字体不存在');
        }
        
        try {
            // 创建@font-face规则
            const fontFace = new FontFace(
                font.name,
                `url(data:font/ttf;base64,${font.data})`,
                { style: 'normal', weight: 'normal' }
            );
            
            // 加载字体
            await fontFace.load();
            
            // 添加到document
            document.fonts.add(fontFace);
            
            // 应用到全局CSS
            document.documentElement.style.setProperty('--custom-font', `"${font.name}"`);
            document.body.style.fontFamily = `"${font.name}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            
            // 更新激活状态
            this.fonts.forEach(f => f.isActive = false);
            font.isActive = true;
            this.currentFontId = fontId;
            
            // 保存到localStorage
            localStorage.setItem('activeFontId', fontId);
            
            // 更新IndexedDB
            await this.saveFont(font);
            
            console.log('字体应用成功:', font.name);
            return true;
        } catch (error) {
            console.error('字体应用失败:', error);
            throw new Error('字体应用失败: ' + error.message);
        }
    },
    
    // 移除全局字体
    removeGlobalFont() {
        document.documentElement.style.removeProperty('--custom-font');
        document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        console.log('已移除全局字体');
    },
    
    // 应用存储的字体（页面加载时）
    async applyStoredFont() {
        if (this.currentFontId) {
            const font = this.fonts.find(f => f.id === this.currentFontId);
            if (font) {
                try {
                    await this.applyFont(this.currentFontId);
                    console.log('已应用存储的字体:', font.name);
                } catch (error) {
                    console.error('应用存储字体失败:', error);
                }
            }
        }
    },
    
    // 获取所有字体
    getAllFonts() {
        return this.fonts;
    },
    
    // 获取当前激活的字体
    getActiveFont() {
        return this.fonts.find(f => f.id === this.currentFontId);
    }
};

// 字体管理器UI
const FontManagerUI = {
    // 打开字体管理器页面
    open() {
        let page = document.getElementById('decoration-page');
        if (!page) {
            page = document.createElement('div');
            page.id = 'decoration-page';
            page.className = 'sub-page';
            document.getElementById('app-container').appendChild(page);
        }
        
        this.render(page);
        page.classList.add('open');
        
        // 绑定事件
        this.bindEvents(page);
    },
    
    // 渲染页面
    render(page) {
        const fonts = FontManager.getAllFonts();
        const activeFont = FontManager.getActiveFont();
        
        const fontsHTML = fonts.length > 0 ? fonts.map(font => `
            <div class="font-item" data-font-id="${font.id}">
                <div class="font-item-header">
                    <div class="font-item-info">
                        <div class="font-item-name" style="font-family: '${font.name}', sans-serif;">${this.escapeHtml(font.name)}</div>
                        <div class="font-item-date">${new Date(font.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <div class="font-item-actions">
                        ${font.id === FontManager.currentFontId ?
                            '<span class="font-active-badge">使用中</span>' :
                            '<button class="font-apply-btn" data-font-id="' + font.id + '">应用</button>'
                        }
                        <button class="font-delete-btn" data-font-id="${font.id}">删除</button>
                    </div>
                </div>
                <div class="font-preview" style="font-family: '${font.name}', sans-serif;">
                    The quick brown fox jumps over the lazy dog<br>
                    快速的棕色狐狸跳过懒狗 0123456789
                </div>
            </div>
        `).join('') : '<div class="empty-state-text">暂无字体，请导入字体文件</div>';
        
        page.innerHTML = `
            <div class="sub-nav">
                <div class="back-btn" id="font-manager-back-btn">
                    <div class="back-arrow"></div>
                    <span>返回</span>
                </div>
                <div class="sub-title">字体管理</div>
            </div>
            <div class="sub-content font-manager-content">
                <!-- 顶部操作区 -->
                <div class="font-manager-header">
                    <div class="font-manager-actions">
                        <button class="font-import-btn" id="font-import-btn">导入字体</button>
                        <button class="font-reset-btn" id="font-reset-btn">重置默认</button>
                    </div>
                </div>
                
                <!-- 字体列表 -->
                <div class="font-list-section">
                    <div class="font-list-title">字体库 (${fonts.length})</div>
                    <div class="font-list">
                        ${fontsHTML}
                    </div>
                </div>
            </div>
        `;
    },
    
    // 绑定事件
    bindEvents(page) {
        // 返回按钮
        const backBtn = page.querySelector('#font-manager-back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                page.classList.remove('open');
            };
        }
        
        // 导入字体按钮
        const importBtn = page.querySelector('#font-import-btn');
        console.log('字体管理器 - 导入按钮:', importBtn);
        if (importBtn) {
            importBtn.onclick = () => {
                console.log('字体管理器 - 点击导入按钮');
                this.openImportModal();
            };
        } else {
            console.error('字体管理器 - 未找到导入按钮');
        }
        
        // 重置默认按钮
        const resetBtn = page.querySelector('#font-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetToDefault();
        }
        
        // 应用字体按钮
        page.querySelectorAll('.font-apply-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const fontId = btn.dataset.fontId;
                this.applyFont(fontId);
            };
        });
        
        // 删除字体按钮
        page.querySelectorAll('.font-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const fontId = btn.dataset.fontId;
                this.deleteFont(fontId);
            };
        });
    },
    
    // 打开导入模态框
    openImportModal() {
        console.log('字体管理器 - 打开导入模态框');
        let modal = document.getElementById('font-import-modal');
        if (!modal) {
            console.log('字体管理器 - 创建新模态框');
            modal = document.createElement('div');
            modal.id = 'font-import-modal';
            modal.className = 'font-import-modal';
            document.body.appendChild(modal);
            console.log('字体管理器 - 模态框已添加到body');
        } else {
            console.log('字体管理器 - 使用现有模态框');
        }
        
        modal.innerHTML = `
            <div class="font-import-overlay"></div>
            <div class="font-import-container">
                <div class="font-import-header">
                    <h3>导入字体</h3>
                    <button class="font-import-close" id="font-import-close">×</button>
                </div>
                <div class="font-import-body">
                    <div class="font-import-field">
                        <label>选择字体文件</label>
                        <div class="font-file-input-wrapper">
                            <input type="file" id="font-file-input" accept=".ttf" multiple>
                            <label for="font-file-input" class="font-file-label">
                                <span>选择TTF文件</span>
                            </label>
                        </div>
                        <div class="font-file-name" id="font-file-name"></div>
                    </div>
                    
                    <div class="font-import-field">
                        <label>或从URL导入</label>
                        <input type="text" id="font-url-input" class="font-input" placeholder="输入字体文件URL（TTF格式）">
                    </div>
                    
                    <div class="font-import-field">
                        <label>字体名称</label>
                        <input type="text" id="font-name-input" class="font-input" placeholder="输入字体名称">
                    </div>
                    
                    <div class="font-import-tips">
                        <span>支持TTF格式字体文件，可同时选择多个文件批量导入</span>
                    </div>
                </div>
                <div class="font-import-footer">
                    <button class="font-btn font-btn-cancel" id="font-import-cancel">取消</button>
                    <button class="font-btn font-btn-import" id="font-import-confirm">导入</button>
                </div>
            </div>
        `;
        
        console.log('字体管理器 - 添加show类');
        modal.classList.add('show');
        console.log('字体管理器 - 模态框类名:', modal.className);
        console.log('字体管理器 - 模态框样式display:', window.getComputedStyle(modal).display);
        
        // 绑定模态框事件
        const closeBtn = modal.querySelector('#font-import-close');
        const cancelBtn = modal.querySelector('#font-import-cancel');
        const confirmBtn = modal.querySelector('#font-import-confirm');
        const overlay = modal.querySelector('.font-import-overlay');
        const fileInput = modal.querySelector('#font-file-input');
        const fileNameDisplay = modal.querySelector('#font-file-name');
        
        const closeModal = () => modal.classList.remove('show');
        
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        overlay.onclick = closeModal;
        
        fileInput.onchange = (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                fileNameDisplay.textContent = files.length === 1 ? files[0].name : `已选择 ${files.length} 个文件`;
            }
        };
        
        confirmBtn.onclick = async () => {
            const files = fileInput.files;
            const url = modal.querySelector('#font-url-input').value.trim();
            const name = modal.querySelector('#font-name-input').value.trim();
            
            if (files.length > 0) {
                // 文件导入
                await this.handleFileUploadFromModal(files);
                closeModal();
            } else if (url) {
                // URL导入
                await this.handleOnlineImportFromModal(url, name);
                closeModal();
            } else {
                this.showToast('请选择文件或输入URL', 'error');
            }
        };
    },
    
    // 从模态框处理文件上传
    async handleFileUploadFromModal(files) {
        this.showLoading('正在导入字体...');
        
        let successCount = 0;
        let failCount = 0;
        
        for (let file of files) {
            try {
                await FontManager.importFontFile(file);
                successCount++;
            } catch (error) {
                console.error('导入失败:', file.name, error);
                failCount++;
            }
        }
        
        this.hideLoading();
        
        if (successCount > 0) {
            this.showToast(`成功导入 ${successCount} 个字体${failCount > 0 ? `，${failCount} 个失败` : ''}`);
            this.refresh();
        } else {
            this.showToast('导入失败', 'error');
        }
    },
    
    // 从模态框处理在线导入
    async handleOnlineImportFromModal(url, name) {
        if (!name) {
            this.showToast('请输入字体名称', 'error');
            return;
        }
        
        this.showLoading('正在下载字体...');
        
        try {
            await FontManager.importFontFromURL(url, name);
            this.hideLoading();
            this.showToast('字体导入成功');
            this.refresh();
        } catch (error) {
            this.hideLoading();
            this.showToast('导入失败: ' + error.message, 'error');
        }
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
    
    // 重置为默认字体
    async resetToDefault() {
        this.showConfirm('确定要重置为默认字体吗？', async () => {
            // 清除当前字体ID
            FontManager.currentFontId = null;
            localStorage.removeItem('activeFontId');
            
            // 移除所有应用的字体样式
            const styleEl = document.getElementById('custom-font-style');
            if (styleEl) {
                styleEl.remove();
            }
            
            // 重置body字体
            document.body.style.fontFamily = '';
            
            this.showToast('已重置为默认字体');
            this.refresh();
        });
    },
    
    
    // 应用字体
    async applyFont(fontId) {
        this.showLoading('正在应用字体...');
        
        try {
            await FontManager.applyFont(fontId);
            this.hideLoading();
            this.showToast('字体已应用');
            this.refresh();
        } catch (error) {
            this.hideLoading();
            this.showToast(error.message, 'error');
        }
    },
    
    // 删除字体
    async deleteFont(fontId) {
        this.showConfirm('确定要删除这个字体吗？', async () => {
            this.showLoading('正在删除...');
            
            try {
                await FontManager.deleteFont(fontId);
                this.hideLoading();
                this.showToast('字体已删除');
                this.refresh();
            } catch (error) {
                this.hideLoading();
                this.showToast('删除失败', 'error');
            }
        });
    },
    
    // 刷新页面
    refresh() {
        const page = document.getElementById('decoration-page');
        if (page && page.classList.contains('open')) {
            this.render(page);
            this.bindEvents(page);
        }
    },
    
    // 显示加载提示
    showLoading(message) {
        if (window.showLoadingOverlay) {
            window.showLoadingOverlay(message);
        }
    },
    
    // 隐藏加载提示
    hideLoading() {
        if (window.hideLoadingOverlay) {
            window.hideLoadingOverlay();
        }
    },
    
    // 显示提示
    showToast(message, type = 'success') {
        if (window.showToast) {
            window.showToast(message);
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

// 初始化字体管理器
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await FontManager.init();
        console.log('✅ 字体管理器初始化成功');
    } catch (error) {
        console.error('❌ 字体管理器初始化失败:', error);
    }
});

// 暴露到全局
window.FontManager = FontManager;
window.FontManagerUI = FontManagerUI;