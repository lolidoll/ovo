/* ========================================
   登录系统 JavaScript - Discord OAuth 集成
   ======================================== */

class DiscordAuthManager {
    constructor() {
        this.CONFIG = {
            CLIENT_ID: '1463827536440983615',
            REDIRECT_URI: 'https://lolidoll.github.io/ovo/index.html',
            AUTHORIZE_URL: 'https://discord.com/api/oauth2/authorize',
            TOKEN_ENDPOINT: 'https://ovo-psi.vercel.app/api/callback',
            SCOPES: ['identify', 'email'],
            ADMIN_KEY: 'spj21' // 管理员密钥
        };
        
        // 本地存储键
        this.STORAGE_KEYS = {
            TOKEN: 'discord_auth_token',
            USER: 'discord_user_data',
            EXPIRY: 'discord_token_expiry',
            STATE: 'oauth_state',
            ADMIN_AUTH: 'admin_authenticated', // 管理员认证状态
            ADMIN_USER: 'admin_user_data' // 管理员用户数据
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
            
            if (!clientId || clientId === 'YOUR_DISCORD_CLIENT_ID') {
                console.error('请配置 Discord CLIENT_ID');
                alert('登录系统未正确配置，请联系管理员');
                return;
            }
            
            const state = this.generateState();
            const scopes = this.CONFIG.SCOPES.join('%20');
            
            // 调试日志
            console.log('🔍 Discord OAuth 配置：');
            console.log('  CLIENT_ID:', this.CONFIG.CLIENT_ID);
            console.log('  REDIRECT_URI:', this.CONFIG.REDIRECT_URI);
            console.log('  AUTHORIZE_URL:', this.CONFIG.AUTHORIZE_URL);
            
            const authUrl = 
                `${this.CONFIG.AUTHORIZE_URL}?` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(this.CONFIG.REDIRECT_URI)}&` +
                `response_type=code&` +
                `scope=${scopes}&` +
                `state=${state}`;
            
            console.log('🚀 完整重定向 URL:', authUrl);
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
            // 调用 Vercel API 进行 token 交换
            const response = await fetch(this.CONFIG.TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    code: code,
                    client_id: this.CONFIG.CLIENT_ID
                })
            });
            
            console.log('Token 交换响应状态:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API 错误:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Token 交换成功:', data.user ? data.user.username : '用户数据');
            
            if (data.access_token) {
                this.saveAuthToken(data.access_token, data.expires_in || 3600);
                await this.fetchUserData(data.access_token);
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error('未获取到访问令牌');
            }
            
        } catch (error) {
            console.error('❌ Token 交换失败:', error);
            console.error('错误详情:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            const errorMsg = error.message || '未知错误';
            alert('登录失败: ' + errorMsg);
            window.location.href = 'index.html';
        }
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
        // 检查管理员登录
        const adminAuth = localStorage.getItem(this.STORAGE_KEYS.ADMIN_AUTH);
        if (adminAuth === 'true') {
            return true;
        }
        
        // 检查Discord登录
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
        // 优先检查管理员登录
        const adminAuth = localStorage.getItem(this.STORAGE_KEYS.ADMIN_AUTH);
        if (adminAuth === 'true') {
            const adminUser = localStorage.getItem(this.STORAGE_KEYS.ADMIN_USER);
            return adminUser ? JSON.parse(adminUser) : null;
        }
        
        // 返回Discord用户数据
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
        localStorage.removeItem(this.STORAGE_KEYS.ADMIN_AUTH);
        localStorage.removeItem(this.STORAGE_KEYS.ADMIN_USER);
    }
    
    // 管理员密钥登录
    adminLogin(key) {
        if (key === this.CONFIG.ADMIN_KEY) {
            // 创建管理员用户数据
            const adminUserData = {
                id: 'admin_' + Date.now(),
                username: '管理员',
                discriminator: '0000',
                avatar: null,
                isAdmin: true,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem(this.STORAGE_KEYS.ADMIN_AUTH, 'true');
            localStorage.setItem(this.STORAGE_KEYS.ADMIN_USER, JSON.stringify(adminUserData));
            
            return { success: true, message: '管理员登录成功' };
        } else {
            return { success: false, message: '密钥错误，请重试' };
        }
    }
    
    // 检查是否为管理员
    isAdmin() {
        return localStorage.getItem(this.STORAGE_KEYS.ADMIN_AUTH) === 'true';
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
