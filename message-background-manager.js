/**
 * 消息/好友页面背景管理器
 * - 分别管理消息页和好友页背景图
 * - 背景应用到整个 app-container（包含顶部栏、搜索栏、底部栏）
 */

const MessageBackgroundManager = {
    DB_NAME: 'MessageBackgroundManagerDB',
    DB_VERSION: 2,
    BACKGROUND_STORE: 'backgrounds',
    SETTINGS_STORE: 'settings',
    CURRENT_IDS_KEY: 'currentBackgroundIds',
    SEARCH_INPUT_STYLE_KEY: 'searchInputStyles',
    LEGACY_CURRENT_ID_KEY: 'currentBackgroundId',
    DEFAULT_PAGE_BACKGROUND_IMAGE: 'https://img.heliar.top/file/1772604265513_IMG_20260304_104453.jpg',

    backgroundImages: [],
    currentBackgroundIds: { msg: null, friend: null },
    searchInputStyles: {
        msg: { color: '#ffffff', opacity: 0.85 },
        friend: { color: '#ffffff', opacity: 0.85 }
    },
    currentBackgroundId: null, // 向后兼容：表示 currentPageType 的当前背景ID
    currentPageType: 'msg',
    db: null,

    async init() {
        try {
            console.log('🔄 页面背景管理器初始化...');
            await this.initIndexedDB();
            await this.loadBackgrounds();
            await this.loadCurrentBackgroundIds();
            await this.loadSearchInputStyles();
            this.applySearchInputStyles();
            this.applyCurrentTabBackground();
            console.log('✅ 页面背景管理器初始化成功');
        } catch (error) {
            console.error('❌ 页面背景管理器初始化失败:', error);
        }
    },

    normalizePageType(pageType) {
        return pageType === 'friend' ? 'friend' : 'msg';
    },

    mapTabToPageType(tabId) {
        if (tabId === 'friend-page') {
            return 'friend';
        }
        if (tabId === 'msg-page') {
            return 'msg';
        }
        return null;
    },

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const tx = event.target.transaction;

                let bgStore;
                if (!db.objectStoreNames.contains(this.BACKGROUND_STORE)) {
                    bgStore = db.createObjectStore(this.BACKGROUND_STORE, { keyPath: 'id' });
                } else {
                    bgStore = tx.objectStore(this.BACKGROUND_STORE);
                }

                if (!bgStore.indexNames.contains('name')) {
                    bgStore.createIndex('name', 'name', { unique: false });
                }
                if (!bgStore.indexNames.contains('createdAt')) {
                    bgStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!bgStore.indexNames.contains('pageType')) {
                    bgStore.createIndex('pageType', 'pageType', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
                    db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' });
                }
            };
        });
    },

    readSetting(key) {
        if (!this.db) {
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.SETTINGS_STORE], 'readonly');
            const store = tx.objectStore(this.SETTINGS_STORE);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    writeSetting(key, value) {
        if (!this.db) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.SETTINGS_STORE], 'readwrite');
            const store = tx.objectStore(this.SETTINGS_STORE);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async loadBackgrounds() {
        if (!this.db) {
            this.backgroundImages = [];
            return;
        }

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.BACKGROUND_STORE], 'readonly');
            const store = tx.objectStore(this.BACKGROUND_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                this.backgroundImages = (request.result || []).map((item) => ({
                    ...item,
                    pageType: this.normalizePageType(item.pageType)
                }));
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    async loadCurrentBackgroundIds() {
        const stored = await this.readSetting(this.CURRENT_IDS_KEY);
        if (stored && typeof stored === 'object') {
            this.currentBackgroundIds = {
                msg: stored.msg || null,
                friend: stored.friend || null
            };
            this.syncLegacyCurrentBackgroundId();
            return;
        }

        const legacyId = await this.readSetting(this.LEGACY_CURRENT_ID_KEY);
        if (legacyId) {
            this.currentBackgroundIds.msg = legacyId;
            this.currentBackgroundIds.friend = null;
            await this.writeSetting(this.CURRENT_IDS_KEY, this.currentBackgroundIds);
        }

        this.syncLegacyCurrentBackgroundId();
    },

    async saveCurrentBackgroundIds() {
        await this.writeSetting(this.CURRENT_IDS_KEY, this.currentBackgroundIds);
    },

    getDefaultSearchInputStyle() {
        return { color: '#ffffff', opacity: 0.85 };
    },

    normalizeSearchInputStyle(style) {
        const fallback = this.getDefaultSearchInputStyle();
        const rawColor = style && typeof style.color === 'string' ? style.color.trim() : fallback.color;
        const color = /^#([0-9a-fA-F]{6})$/.test(rawColor) ? rawColor : fallback.color;

        let opacity = Number(style && style.opacity);
        if (!Number.isFinite(opacity)) {
            opacity = fallback.opacity;
        }
        opacity = Math.max(0, Math.min(1, Math.round(opacity * 100) / 100));

        return { color, opacity };
    },

    getSearchInputStyle(pageType = this.currentPageType) {
        const normalizedPageType = this.normalizePageType(pageType);
        const style = this.searchInputStyles[normalizedPageType] || this.getDefaultSearchInputStyle();
        return this.normalizeSearchInputStyle(style);
    },

    async loadSearchInputStyles() {
        const fallback = this.getDefaultSearchInputStyle();
        const stored = await this.readSetting(this.SEARCH_INPUT_STYLE_KEY);

        this.searchInputStyles = {
            msg: this.normalizeSearchInputStyle(stored && stored.msg ? stored.msg : fallback),
            friend: this.normalizeSearchInputStyle(stored && stored.friend ? stored.friend : fallback)
        };
    },

    async saveSearchInputStyle(pageType = this.currentPageType, style = {}) {
        const normalizedPageType = this.normalizePageType(pageType);
        this.searchInputStyles[normalizedPageType] = this.normalizeSearchInputStyle(style);
        await this.writeSetting(this.SEARCH_INPUT_STYLE_KEY, this.searchInputStyles);
        this.applySearchInputStyle(normalizedPageType);
    },

    syncLegacyCurrentBackgroundId() {
        const pageType = this.normalizePageType(this.currentPageType);
        this.currentBackgroundId = this.currentBackgroundIds[pageType] || null;
    },

    setCurrentPageType(pageType) {
        this.currentPageType = this.normalizePageType(pageType);
        this.syncLegacyCurrentBackgroundId();
    },

    getStoredBackgroundId(pageType = this.currentPageType) {
        const normalized = this.normalizePageType(pageType);
        return this.currentBackgroundIds[normalized] || null;
    },

    async saveCurrentBackgroundId(backgroundId, pageType = this.currentPageType) {
        const normalized = this.normalizePageType(pageType);
        this.currentBackgroundIds[normalized] = backgroundId || null;
        this.syncLegacyCurrentBackgroundId();
        await this.saveCurrentBackgroundIds();

        if (this.getActivePageType() === normalized) {
            this.applyCurrentTabBackground();
        }
    },

    getBackgrounds(pageType = this.currentPageType) {
        const normalized = this.normalizePageType(pageType);
        return this.backgroundImages.filter((item) => this.normalizePageType(item.pageType) === normalized);
    },

    getBackground(backgroundId, pageType = this.currentPageType) {
        const normalized = this.normalizePageType(pageType);
        return this.backgroundImages.find((item) => item.id === backgroundId && this.normalizePageType(item.pageType) === normalized) || null;
    },

    async saveBackground(backgroundData, pageType = this.currentPageType) {
        if (!this.db) {
            throw new Error('IndexedDB not initialized');
        }

        const normalized = this.normalizePageType(pageType);
        const payload = {
            ...backgroundData,
            pageType: normalized
        };

        await new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.BACKGROUND_STORE], 'readwrite');
            const store = tx.objectStore(this.BACKGROUND_STORE);
            const request = store.put(payload);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        const existingIndex = this.backgroundImages.findIndex((item) => item.id === payload.id);
        if (existingIndex >= 0) {
            this.backgroundImages[existingIndex] = payload;
        } else {
            this.backgroundImages.push(payload);
        }
    },

    async deleteBackground(backgroundId, pageType = this.currentPageType) {
        if (!this.db) {
            return;
        }

        const existing = this.backgroundImages.find((item) => item.id === backgroundId);
        const normalized = this.normalizePageType((existing && existing.pageType) || pageType);

        await new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.BACKGROUND_STORE], 'readwrite');
            const store = tx.objectStore(this.BACKGROUND_STORE);
            const request = store.delete(backgroundId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        this.backgroundImages = this.backgroundImages.filter((item) => item.id !== backgroundId);

        if (this.currentBackgroundIds[normalized] === backgroundId) {
            this.currentBackgroundIds[normalized] = null;
            await this.saveCurrentBackgroundIds();
            this.syncLegacyCurrentBackgroundId();
        }

        if (this.getActivePageType() === normalized) {
            this.applyCurrentTabBackground();
        }
    },

    applyBackground(background, pageType = this.currentPageType) {
        if (!background || !background.imageData) {
            return;
        }

        const normalized = this.normalizePageType(pageType || background.pageType);
        this.currentBackgroundIds[normalized] = background.id;
        this.syncLegacyCurrentBackgroundId();

        if (this.getActivePageType() === normalized) {
            this.applyBackgroundToContainer(background, normalized);
        }
    },

    applyStoredBackground(pageType = this.currentPageType) {
        const normalized = this.normalizePageType(pageType);
        if (this.getActivePageType() === normalized) {
            this.applyCurrentTabBackground();
        }
    },

    clearBackground(pageType = this.currentPageType) {
        const normalized = this.normalizePageType(pageType);
        this.currentBackgroundIds[normalized] = null;
        this.syncLegacyCurrentBackgroundId();
        this.saveCurrentBackgroundIds().catch((error) => {
            console.error('❌ 保存背景ID失败:', error);
        });

        if (this.getActivePageType() === normalized) {
            this.applyCurrentTabBackground();
        }
    },

    getActiveTabId() {
        if (window.AppState && window.AppState.currentTab) {
            return window.AppState.currentTab;
        }

        const activeTab = document.querySelector('.tab-item.active');
        return activeTab ? activeTab.dataset.tab : null;
    },

    getActivePageType(tabId = null) {
        const activeTabId = tabId || this.getActiveTabId();
        return this.mapTabToPageType(activeTabId);
    },

    hexToRgb(hexColor) {
        const normalized = String(hexColor || '').trim().replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
            return null;
        }

        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16)
        };
    },

    buildRgbaColor(hexColor, opacity) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) {
            return 'rgba(255, 255, 255, 0.85)';
        }

        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    },

    applySearchInputStyle(pageType = this.currentPageType) {
        const normalizedPageType = this.normalizePageType(pageType);
        const inputId = normalizedPageType === 'friend' ? 'search-input-friend' : 'search-input-msg';
        const searchInput = document.getElementById(inputId);
        if (!searchInput) {
            return;
        }

        const style = this.getSearchInputStyle(normalizedPageType);
        const rgbaColor = this.buildRgbaColor(style.color, style.opacity);

        searchInput.style.setProperty('background-image', 'none', 'important');
        searchInput.style.setProperty('background-color', rgbaColor, 'important');
    },

    applySearchInputStyles() {
        this.applySearchInputStyle('msg');
        this.applySearchInputStyle('friend');
    },

    setTransparentMode(pageType) {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            return;
        }

        appContainer.classList.remove('page-bg-mode', 'msg-page-bg-mode', 'friend-page-bg-mode');

        if (pageType === 'msg' || pageType === 'friend') {
            appContainer.classList.add('page-bg-mode', `${pageType}-page-bg-mode`);
        }
    },

    applyBackgroundToContainer(background, pageType = this.currentPageType) {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            return;
        }

        const activePageType = pageType === 'msg' || pageType === 'friend' ? pageType : null;
        const effectiveBackgroundImage = background && background.imageData
            ? background.imageData
            : (activePageType ? this.DEFAULT_PAGE_BACKGROUND_IMAGE : '');

        if (effectiveBackgroundImage) {
            const useFixedAttachment = !(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
            appContainer.style.backgroundImage = `url('${effectiveBackgroundImage}')`;
            appContainer.style.backgroundSize = 'cover';
            appContainer.style.backgroundPosition = 'center';
            appContainer.style.backgroundRepeat = 'no-repeat';
            appContainer.style.backgroundAttachment = useFixedAttachment ? 'fixed' : 'scroll';
            appContainer.style.backgroundColor = 'transparent';
        } else {
            appContainer.style.backgroundImage = 'none';
            appContainer.style.backgroundSize = '';
            appContainer.style.backgroundPosition = '';
            appContainer.style.backgroundRepeat = '';
            appContainer.style.backgroundAttachment = '';
            appContainer.style.backgroundColor = '#ffffff';
        }
    },

    applyCurrentTabBackground(tabId = null) {
        const pageType = this.getActivePageType(tabId);
        this.applySearchInputStyles();

        this.setTransparentMode(pageType);

        if (!pageType) {
            this.applyBackgroundToContainer(null, null);
            return;
        }

        this.setCurrentPageType(pageType);
        const backgroundId = this.getStoredBackgroundId(pageType);
        const background = backgroundId ? this.getBackground(backgroundId, pageType) : null;
        this.applyBackgroundToContainer(background, pageType);
    },

    setPageTypeByTab(tabId) {
        const pageType = this.mapTabToPageType(tabId);
        if (pageType) {
            this.setCurrentPageType(pageType);
        }
        this.applyCurrentTabBackground(tabId);
    },

    generateId() {
        return `bg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
};

window.MessageBackgroundManager = MessageBackgroundManager;
console.log('✅ MessageBackgroundManager 已暴露到 window 对象');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MessageBackgroundManager.init().catch(console.error);
    });
} else {
    MessageBackgroundManager.init().catch(console.error);
}
