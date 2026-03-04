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
                    console.warn('⚠️ 背景图不存在:', backgroundId);
                }
            }
        } catch (error) {
            console.error('❌ 应用存储的背景图失败:', error);
        }
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
                    this.applyStoredBackground();
                }.bind(this), 1000);
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
            
            // 创建或获取背景容器（应用到消息页面）
            let bgContainer = document.querySelector('.message-bg-container');
            if (!bgContainer) {
                const chatArea = document.querySelector('.chat-area');
                if (!chatArea) {
                    console.warn('⚠️ 找不到 .chat-area 元素，消息页面可能还未加载');
                    return;
                }
                
                console.log('✅ 找到 chat-area，创建背景容器');
                
                bgContainer = document.createElement('div');
                bgContainer.className = 'message-bg-container';
                bgContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
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
                
                // 设置chat-area为相对定位以包含背景
                if (chatArea.style.position !== 'relative' && chatArea.style.position !== 'absolute' && chatArea.style.position !== 'fixed') {
                    chatArea.style.position = 'relative';
                }
                
                chatArea.insertBefore(bgContainer, chatArea.firstChild);
                console.log('✅ 背景容器已插入');
                
                // 确保所有消息在背景之上
                const messageList = chatArea.querySelector('.chat-messages, .messages-list');
                if (messageList) {
                    messageList.style.position = 'relative';
                    messageList.style.zIndex = '1';
                }
            } else {
                // 更新已有背景容器
                console.log('✅ 更新已存在的背景容器');
                bgContainer.style.backgroundImage = `url(${background.imageData})`;
            }
            
            // 应用到顶部栏（可选）
            if (background.applyToTopBar) {
                const chatNav = document.querySelector('.chat-nav');
                if (chatNav) {
                    // 创建半透明遮罩效果
                    chatNav.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(${background.imageData})`;
                    chatNav.style.backgroundSize = 'auto, cover';
                    chatNav.style.backgroundPosition = 'center';
                    chatNav.style.backgroundRepeat = 'no-repeat';
                    chatNav.style.backgroundAttachment = 'fixed';
                }
            }
            
            // 应用到底部栏（可选）
            if (background.applyToBottomBar) {
                const chatToolbar = document.querySelector('.chat-toolbar');
                if (chatToolbar) {
                    chatToolbar.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(${background.imageData})`;
                    chatToolbar.style.backgroundSize = 'auto, cover';
                    chatToolbar.style.backgroundPosition = 'center';
                    chatToolbar.style.backgroundRepeat = 'no-repeat';
                    chatToolbar.style.backgroundAttachment = 'fixed';
                }
                
                console.log('✅ 背景图应用完成');
                this.currentBackgroundId = background.id;
            }
        } catch (error) {
            console.error('❌ 应用背景图失败:', error);
        }
    },
    
    // 其他方法...
    
    // 清除背景图
    clearBackground() {
        // 清除背景容器
        const bgContainer = document.querySelector('.message-bg-container');
        if (bgContainer) {
            bgContainer.remove();
        }
        
        const chatNav = document.querySelector('.chat-nav');
        if (chatNav) {
            chatNav.style.backgroundImage = 'none';
        }
        
        const chatToolbar = document.querySelector('.chat-toolbar');
        if (chatToolbar) {
            chatToolbar.style.backgroundImage = 'none';
        }
        
        const chatInputArea = document.querySelector('.chat-input-area');
        if (chatInputArea) {
            chatInputArea.style.backgroundImage = 'none';
        }
        
        this.currentBackgroundId = null;
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

// 初始化（异步执行）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MessageBackgroundManager.init().catch(console.error);
    });
} else {
    MessageBackgroundManager.init().catch(console.error);
}
