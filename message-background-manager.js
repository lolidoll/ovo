/**
 * 消息页面背景管理器
 * 管理消息页面、顶部栏、底部栏的背景图
 */

const MessageBackgroundManager = {
    // 背景图库
    backgroundImages: [],
    currentBackgroundId: null,
    db: null,
    initialized: false,
    
    // 初始化
    async init() {
        try {
            console.log('🔄 消息背景管理器初始化...');
            if (this.initialized) {
                console.log('✅ 消息背景管理器已初始化');
                return;
            }
            
            await this.initIndexedDB();
            console.log('✅ IndexedDB 初始化完成');
            
            await this.loadBackgrounds();
            console.log('✅ 背景图加载完成');
            
            await this.applyStoredBackground();
            console.log('✅ 消息背景管理器初始化成功');
            
            this.initialized = true;
            
            // 添加页面加载事件监听，以便在页面切换时重新应用背景
            this.addPageLoadListener();
        } catch (error) {
            console.error('❌ 消息背景管理器初始化失败:', error);
        }
    },
    
    // 初始化IndexedDB
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MessageBackgroundManagerDB', 1);
            
            request.onerror = () => {
                console.error('IndexedDB打开失败');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('MessageBackgroundManager IndexedDB打开成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('backgrounds')) {
                    const objectStore = db.createObjectStore('backgrounds', { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('创建backgrounds对象存储');
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('创建settings对象存储');
                }
            };
        });
    },
    
    // 从IndexedDB加载背景图
    async loadBackgrounds() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['backgrounds'], 'readonly');
            const objectStore = transaction.objectStore('backgrounds');
            const request = objectStore.getAll();
            
            request.onsuccess = () => {
                this.backgroundImages = request.result || [];
                console.log(`加载了 ${this.backgroundImages.length} 个背景图`);
                resolve();
            };
            
            request.onerror = () => {
                console.error('加载背景图失败');
                reject(request.error);
            };
        });
    },
    
    // 保存背景图到IndexedDB
    async saveBackground(backgroundData) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['backgrounds'], 'readwrite');
            const objectStore = transaction.objectStore('backgrounds');
            const request = objectStore.put(backgroundData);
            
            request.onsuccess = () => {
                console.log('背景图保存成功:', backgroundData.name);
                this.backgroundImages.push(backgroundData);
                resolve();
            };
            
            request.onerror = () => {
                console.error('背景图保存失败');
                reject(request.error);
            };
        });
    },
    
    // 删除背景图
    async deleteBackground(backgroundId) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['backgrounds'], 'readwrite');
            const objectStore = transaction.objectStore('backgrounds');
            const request = objectStore.delete(backgroundId);
            
            request.onsuccess = () => {
                console.log('背景图删除成功');
                this.backgroundImages = this.backgroundImages.filter(b => b.id !== backgroundId);
                resolve();
            };
            
            request.onerror = () => {
                console.error('背景图删除失败');
                reject(request.error);
            };
        });
    },
    
    // 保存当前选中的背景图ID
    async saveCurrentBackgroundId(backgroundId) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const objectStore = transaction.objectStore('settings');
            const request = objectStore.put({ key: 'currentBackgroundId', value: backgroundId });
            
            request.onsuccess = () => {
                this.currentBackgroundId = backgroundId;
                console.log('当前背景图ID已保存');
                resolve();
            };
            
            request.onerror = () => {
                console.error('保存当前背景图ID失败');
                reject(request.error);
            };
        });
    },
    
    // 获取存储的背景图ID
    async getStoredBackgroundId() {
        if (!this.db) return null;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const objectStore = transaction.objectStore('settings');
            const request = objectStore.get('currentBackgroundId');
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    },
    
    // 应用存储的背景图
    async applyStoredBackground() {
        try {
            const backgroundId = await this.getStoredBackgroundId();
            if (backgroundId) {
                const background = this.backgroundImages.find(b => b.id === backgroundId);
                if (background) {
                    this.applyBackground(background);
                    console.log('✅ 应用存储的背景图:', background.name);
                } else {
                    console.warn('⚠️ 背景图不存在:', backgroundId, '，应用默认背景');
                    this.applyDefaultBackground();
                }
            } else {
                // 没有存储的背景图时，应用默认背景
                console.log('📋 没有存储的背景图，应用默认背景');
                this.applyDefaultBackground();
            }
        } catch (error) {
            console.error('❌ 应用存储的背景图失败:', error);
            console.log('应用默认背景');
            this.applyDefaultBackground();
        }
    },
    
    // 应用默认背景图
    applyDefaultBackground() {
        const defaultBgUrl = 'https://img.heliar.top/file/1772604265513_IMG_20260304_104453.jpg';
        const defaultBg = {
            id: 'default-background',
            name: '默认背景',
            imageData: defaultBgUrl,
            applyToTopBar: false,
            applyToBottomBar: false
        };
        console.log('🖼️ 应用默认背景图:', defaultBgUrl);
        this.applyBackground(defaultBg);
        console.log('✅ 默认背景图已应用');
    },
    
    // 添加页面加载监听器
    addPageLoadListener() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 页面隐藏，暂停背景应用');
            } else {
                console.log('📱 页面显示，重新应用背景');
                setTimeout(() => {
                    this.applyStoredBackground();
                }, 500);
            }
        });
        
        // 监听导航变化
        if (window.history) {
            window.addEventListener('popstate', () => {
                console.log('🔄 导航变化，重新应用背景');
                setTimeout(() => {
                    this.applyStoredBackground();
                }, 500);
            });
        }
        
        // 监听路由变化（如果存在）
        if (window.app && window.app.navigateToPage) {
            const originalNavigate = window.app.navigateToPage;
            window.app.navigateToPage = function(page) {
                console.log('📱 页面切换到:', page);
                setTimeout(() => {
                    MessageBackgroundManager.applyStoredBackground();
                }, 1000);
                return originalNavigate.call(this, page);
            };
        }
    },
    
    // 应用背景图到页面
    applyBackground(background) {
        try {
            if (!background || !background.imageData) {
                console.warn('⚠️ 背景图数据无效');
                return;
            }
            
            console.log('🎨 开始应用背景图:', background.name);
            
            // 检查消息页面是否已加载
            const msgPage = document.querySelector('.msg-page');
            const chatArea = document.querySelector('.chat-area');
            
            if (!msgPage && !chatArea) {
                console.warn('⚠️ 消息页面元素未找到，等待页面加载...');
                // 等待页面加载后重试
                setTimeout(() => {
                    this.applyBackground(background);
                }, 1000);
                return;
            }
            
            // 使用msg-page优先，如果没有则使用chat-area
            const targetArea = msgPage || chatArea;
            console.log('✅ 使用目标区域:', targetArea.className, targetArea.id);
            
            // 检查目标区域的背景色
            const targetAreaStyle = window.getComputedStyle(targetArea);
            console.log('目标区域背景色:', targetAreaStyle.backgroundColor);
            console.log('目标区域背景图:', targetAreaStyle.backgroundImage);
            console.log('目标区域z-index:', targetAreaStyle.zIndex);
            console.log('目标区域position:', targetAreaStyle.position);
            
            // 设置目标区域为透明
            targetArea.style.backgroundColor = 'transparent';
            targetArea.style.backgroundImage = 'none';
            if (targetArea.style.position !== 'relative' && targetArea.style.position !== 'absolute' && targetArea.style.position !== 'fixed') {
                targetArea.style.position = 'relative';
            }
            console.log('✅ 已设置目标区域背景为透明和position为relative');
            
            // 先清除旧背景容器（全局查找）
            const oldContainer = document.querySelector('.message-bg-container');
            if (oldContainer) {
                oldContainer.remove();
                console.log('✅ 旧背景容器已清除');
            }
            
            // 创建背景容器
            const bgContainer = document.createElement('div');
            bgContainer.className = 'message-bg-container';
            bgContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                height: 100%;
                background-image: url(${background.imageData});
                background-size: cover;
                background-position: center;
                background-attachment: fixed;
                background-repeat: no-repeat;
                z-index: 0;
                pointer-events: none;
            `;
            // 插入到msg-page内部，作为第一个子元素
            targetArea.insertBefore(bgContainer, targetArea.firstChild);
            console.log('✅ 背景容器已插入到', targetArea.className);
            console.log('背景图片URL:', background.imageData);
            
            // 检查并设置所有子元素的背景色
            const children = targetArea.children;
            console.log('目标区域子元素数量:', children.length);
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child.className !== 'message-bg-container') {
                    const childStyle = window.getComputedStyle(child);
                    const childBg = childStyle.backgroundColor;
                    const childZIndex = childStyle.zIndex;
                    console.log(`子元素 ${i} [${child.className}] - 背景: ${childBg}, z-index: ${childZIndex}`);
                    
                    // 设置子元素背景透明（除了背景容器）
                    if (childBg !== 'rgba(0, 0, 0, 0)' && childBg !== 'transparent') {
                        child.style.backgroundColor = 'transparent';
                        console.log(`  -> 已设置 ${child.className} 背景为透明`);
                    }
                    
                    // 确保子元素有z-index
                    if (childZIndex === 'auto' && child.className !== 'message-bg-container') {
                        child.style.zIndex = '1';
                        console.log(`  -> 已设置 ${child.className} z-index为1`);
                    }
                    
                    // 递归设置所有后代元素的背景为透明
                    const allDescendants = child.querySelectorAll('*');
                    allDescendants.forEach(desc => {
                        const descStyle = window.getComputedStyle(desc);
                        const descBg = descStyle.backgroundColor;
                        if (descBg !== 'rgba(0, 0, 0, 0)' && descBg !== 'transparent') {
                            desc.style.backgroundColor = 'transparent';
                        }
                    });
                    console.log(`  -> 已递归设置所有后代元素背景为透明`);
                }
            }
            
            // 专门处理对话项
            const msgItems = targetArea.querySelectorAll('.msg-item');
            console.log(`找到 ${msgItems.length} 个 .msg-item`);
            msgItems.forEach((item, index) => {
                item.style.backgroundColor = 'transparent';
                console.log(`  -> 已设置 msg-item[${index}] 背景为透明`);
            });
            
            // 应用顶部栏背景（如果启用）
            if (background.applyToTopBar) {
                const chatNav = document.querySelector('.chat-nav');
                if (chatNav) {
                    chatNav.style.backgroundImage = `url(${background.imageData})`;
                    chatNav.style.backgroundSize = 'cover';
                    chatNav.style.backgroundPosition = 'center';
                    chatNav.style.backgroundAttachment = 'fixed';
                    chatNav.style.backgroundRepeat = 'no-repeat';
                    // 添加半透明遮罩确保文字可读
                    if (!chatNav.querySelector('.nav-overlay')) {
                        const overlay = document.createElement('div');
                        overlay.className = 'nav-overlay';
                        overlay.style.cssText = `
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0, 0, 0, 0.3);
                            z-index: 1;
                        `;
                        chatNav.appendChild(overlay);
                    }
                }
            }
            
            // 应用底部栏背景（如果启用）
            if (background.applyToBottomBar) {
                const chatToolbar = document.querySelector('.chat-toolbar');
                const chatInputArea = document.querySelector('.chat-input-area');
                const bottomBars = [chatToolbar, chatInputArea].filter(Boolean);
                
                bottomBars.forEach(bar => {
                    if (bar) {
                        bar.style.backgroundImage = `url(${background.imageData})`;
                        bar.style.backgroundSize = 'cover';
                        bar.style.backgroundPosition = 'center';
                        bar.style.backgroundAttachment = 'fixed';
                        bar.style.backgroundRepeat = 'no-repeat';
                    }
                });
            }
            
            this.currentBackgroundId = background.id;
            console.log('✅ 背景应用完成');
            
        } catch (error) {
            console.error('❌ 应用背景图失败:', error);
        }
    },
    
    // 其他方法...
    
    // 清除背景图
    clearBackground() {
        try {
            console.log('🧹 开始清除背景图');
            
            // 清除消息页面背景
            const bgContainer = document.querySelector('.message-bg-container');
            if (bgContainer) {
                bgContainer.remove();
                console.log('✅ 消息页面背景容器已清除');
            }
            
            // 清除顶部栏背景
            const chatNav = document.querySelector('.chat-nav');
            if (chatNav) {
                chatNav.style.backgroundImage = 'none';
                const overlay = chatNav.querySelector('.nav-overlay');
                if (overlay) {
                    overlay.remove();
                }
                console.log('✅ 顶部栏背景已清除');
            }
            
            // 清除底部栏背景
            const chatToolbar = document.querySelector('.chat-toolbar');
            const chatInputArea = document.querySelector('.chat-input-area');
            
            if (chatToolbar) {
                chatToolbar.style.backgroundImage = 'none';
                console.log('✅ 底部工具栏背景已清除');
            }
            
            if (chatInputArea) {
                chatInputArea.style.backgroundImage = 'none';
                console.log('✅ 输入区域背景已清除');
            }
            
            // 清除其他可能相关的背景元素
            const allBgElements = document.querySelectorAll('[style*="background-image"]');
            allBgElements.forEach(element => {
                const style = element.getAttribute('style');
                if (style && style.includes('background-image') && !style.includes('url(data:')) {
                    // 清除外部图片背景，但保留内联样式
                    element.style.backgroundImage = 'none';
                }
            });
            
            this.currentBackgroundId = null;
            console.log('✅ 所有背景设置已清除');
            
        } catch (error) {
            console.error('❌ 清除背景图失败:', error);
        }
    },
    
    // 获取背景图列表
    getBackgrounds() {
        return this.backgroundImages;
    },
    
    // 获取指定背景图
    getBackground(backgroundId) {
        return this.backgroundImages.find(b => b.id === backgroundId);
    },
    
    // 生成唯一ID
    generateId() {
        return 'bg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// 立即暴露到 window 对象（不等待初始化完成）
window.MessageBackgroundManager = MessageBackgroundManager;
console.log('✅ MessageBackgroundManager 已暴露到 window 对象');

// 手动触发初始化
function initMessageBackgroundManager() {
    console.log('🔄 手动初始化消息背景管理器...');
    MessageBackgroundManager.init().catch(error => {
        console.error('❌ 初始化失败:', error);
    });
}

// 多种方式触发初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initMessageBackgroundManager, 100);
    });
} else {
    // 立即初始化
    setTimeout(initMessageBackgroundManager, 100);
}
