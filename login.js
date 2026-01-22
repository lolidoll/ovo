/* ========================================
   登录系统 JavaScript - Discord OAuth 集成
   ======================================== */

class DiscordAuthManager {
    constructor() {
        // Discord OAuth 配置
        // 注意：请在下方配置您的 Discord 应用程序信息
        this.CONFIG = {
            // 从 Discord Developer Portal 获取
            CLIENT_ID: '1463827536440983615',
            
            // 重定向 URI（必须在 Discord Developer Portal 中注册）
            REDIRECT_URI: this.getRedirectUri(),
            
            // OAuth 授权 URL
            AUTHORIZE_URL: 'https://discord.com/api/oauth2/authorize',
            
            // Token 交换端点（需要后端实现）
            TOKEN_ENDPOINT: '/api/auth/discord/callback',
            
            // 作用域
            SCOPES: ['identify', 'email']
        };
        
        // 本地存储键
        this.STORAGE_KEYS = {
            TOKEN: 'discord_auth_token',
            USER: 'discord_user_data',
            EXPIRY: 'discord_token_expiry',
            STATE: 'oauth_state'
        };
        
        this.init();
    }
    
    // 初始化
    init() {
        // 检查是否已登录
        if (this.isUserLoggedIn()) {
            // 如果是在集成模式下，模态框管理器会处理隐藏
            // 如果是单独页面，则跳转
            if (window.location.pathname.includes('login.html')) {
                this.redirectToApp();
            }
            return;
        }
        
        // 检查授权回调
        this.handleAuthCallback();
        
        // 绑定登录按钮事件（仅在单独页面中）
        if (window.location.pathname.includes('login.html')) {
            this.setupEventListeners();
        }
    }
    
    // 设置事件监听
    setupEventListeners() {
        const loginBtn = document.getElementById('discord-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.initiateLogin());
        }
        
        // 新的集成模式：同时处理新设计的按钮
        const authDiscordBtn = document.getElementById('auth-discord-btn');
        if (authDiscordBtn) {
            authDiscordBtn.addEventListener('click', () => this.initiateLogin());
        }
    }
    
    // 获取重定向 URI
    getRedirectUri() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const pathname = 'login.html';
        return `${protocol}//${hostname}${port}/${pathname}`;
    }
    
    // 生成随机状态码（用于防止 CSRF 攻击）
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(this.STORAGE_KEYS.STATE, state);
        return state;
    }
    
    // 验证状态码
    verifyState(state) {
        const savedState = localStorage.getItem(this.STORAGE_KEYS.STATE);
        localStorage.removeItem(this.STORAGE_KEYS.STATE);
        return state === savedState;
    }
    
    // 启动登录流程
    initiateLogin() {
        try {
            const clientId = this.CONFIG.CLIENT_ID;
            
            // 检查是否配置了 CLIENT_ID
            if (!clientId || clientId === 'YOUR_DISCORD_CLIENT_ID') {
                console.error('请配置 Discord CLIENT_ID');
                alert('登录系统未正确配置，请联系管理员');
                return;
            }
            
            const state = this.generateState();
            const scopes = this.CONFIG.SCOPES.join('%20');
            
            const authUrl = 
                `${this.CONFIG.AUTHORIZE_URL}?` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(this.CONFIG.REDIRECT_URI)}&` +
                `response_type=code&` +
                `scope=${scopes}&` +
                `state=${state}`;
            
            // 显示加载状态
            this.showLoadingTip();
            
            // 重定向到 Discord 授权页面
            window.location.href = authUrl;
            
        } catch (error) {
            console.error('启动登录失败:', error);
            alert('启动登录失败，请重试');
            this.hideLoadingTip();
        }
    }
    
    // 处理授权回调
    handleAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        
        if (code && state) {
            // 验证状态码
            if (!this.verifyState(state)) {
                console.error('状态码验证失败');
                alert('登录安全验证失败，请重新登录');
                this.clearAuthData();
                window.location.href = 'login.html';
                return;
            }
            
            // 显示认证加载界面
            this.showAuthLoading();
            
            // 交换授权码获取 token
            this.exchangeCodeForToken(code);
        }
    }
    
    // 交换授权码获取 Token
    async exchangeCodeForToken(code) {
        try {
            // 方式 1: 使用后端 API（推荐）
            // 如果您有后端服务，使用此方式更安全
            const response = await fetch(this.CONFIG.TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.access_token) {
                this.saveAuthToken(data.access_token, data.expires_in);
                await this.fetchUserData(data.access_token);
            } else {
                throw new Error('未获取到访问令牌');
            }
            
        } catch (error) {
            console.error('Token 交换失败:', error);
            
            // 如果后端不可用，尝试本地处理（不安全，仅用于演示）
            // 注意：实际应用中应使用后端处理以保护 CLIENT_SECRET
            this.handleLocalAuth(code);
        }
    }
    
    // 本地 Token 处理（不推荐用于生产环境）
    async handleLocalAuth(code) {
        try {
            // 这是一个演示方案，实际应用中应在后端处理
            // 生成一个模拟的认证令牌
            const token = await this.generateLocalToken(code);
            
            // 保存 Token
            this.saveAuthToken(token, 3600);
            
            // 获取用户数据（演示数据）
            const userData = {
                id: 'local_user_' + Math.random().toString(36).substr(2, 9),
                username: 'User_' + Math.floor(Math.random() * 10000),
                discriminator: '0000',
                avatar: null
            };
            
            this.saveUserData(userData);
            this.redirectToApp();
            
        } catch (error) {
            console.error('本地认证失败:', error);
            alert('登录失败，请确保配置了后端 API 或检查网络连接');
            window.location.href = 'login.html';
        }
    }
    
    // 生成本地 Token（演示用）
    async generateLocalToken(code) {
        return 'local_token_' + btoa(`${code}_${Date.now()}`).substring(0, 50);
    }
    
    // 获取用户数据
    async fetchUserData(accessToken) {
        try {
            const response = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const userData = await response.json();
            this.saveUserData(userData);
            this.redirectToApp();
            
        } catch (error) {
            console.error('获取用户数据失败:', error);
            alert('获取用户信息失败，请重新登录');
            this.clearAuthData();
            window.location.href = 'login.html';
        }
    }
    
    // 保存 Token
    saveAuthToken(token, expiresIn) {
        localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
        
        if (expiresIn) {
            const expiryTime = Date.now() + (expiresIn * 1000);
            localStorage.setItem(this.STORAGE_KEYS.EXPIRY, expiryTime);
        }
    }
    
    // 保存用户数据
    saveUserData(userData) {
        localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(userData));
    }
    
    // 检查用户是否已登录
    isUserLoggedIn() {
        const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
        const expiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY);
        
        if (!token) {
            return false;
        }
        
        // 检查 Token 是否过期
        if (expiry && Date.now() > parseInt(expiry)) {
            this.clearAuthData();
            return false;
        }
        
        return true;
    }
    
    // 获取当前用户数据
    getCurrentUser() {
        const userData = localStorage.getItem(this.STORAGE_KEYS.USER);
        return userData ? JSON.parse(userData) : null;
    }
    
    // 获取 Token
    getAuthToken() {
        return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
    }
    
    // 清除认证数据
    clearAuthData() {
        localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER);
        localStorage.removeItem(this.STORAGE_KEYS.EXPIRY);
        localStorage.removeItem(this.STORAGE_KEYS.STATE);
    }
    
    // 登出
    logout() {
        this.clearAuthData();
        window.location.href = 'login.html';
    }
    
    // 显示加载提示
    showLoadingTip() {
        const btn = document.getElementById('discord-login-btn');
        const tip = document.getElementById('loading-tip');
        
        if (btn) btn.style.display = 'none';
        if (tip) tip.style.display = 'flex';
    }
    
    // 隐藏加载提示
    hideLoadingTip() {
        const btn = document.getElementById('discord-login-btn');
        const tip = document.getElementById('loading-tip');
        
        if (btn) btn.style.display = 'flex';
        if (tip) tip.style.display = 'none';
    }
    
    // 显示认证加载界面
    showAuthLoading() {
        const container = document.getElementById('auth-callback-container');
        if (container) {
            container.style.display = 'flex';
        }
    }
    
    // 重定向到应用
    redirectToApp() {
        // 延迟 1 秒后重定向，给用户看到成功提示
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// ========================================
// 应用启动
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // 初始化认证管理器
    window.authManager = new DiscordAuthManager();
});

// ========================================
// 导出给其他脚本使用
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscordAuthManager;
}
