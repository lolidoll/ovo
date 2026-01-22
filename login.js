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
        // 检查登录状态
        if (this.isUserLoggedIn()) {
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
    
    // 生成随机 state
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
            
            // 保存 state 用于验证
            localStorage.setItem(this.STORAGE_KEYS.STATE, state);
            
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
        
        if (!code) return; // 没有授权码，不处理
        
        // 验证 state（CSRF 保护）
        const savedState = localStorage.getItem(this.STORAGE_KEYS.STATE);
        if (state !== savedState) {
            console.error('状态码验证失败');
            alert('登录验证失败，请重新尝试');
            window.location.href = 'index.html';
            return;
        }
        
        localStorage.removeItem(this.STORAGE_KEYS.STATE);
        this.showLoadingTip();
        
        // 交换授权码获取 token
        this.exchangeCodeForToken(code);
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
            console.error('Token 交换失败:', error);
            alert('登录失败: ' + error.message);
            window.location.href = 'index.html';
        }
    }
    
    // 获取用户数据
    async fetchUserData(accessToken) {
        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            
            const user = await response.json();
            console.log('获取用户数据成功:', user);
            
            // 保存用户数据
            this.saveUserData(user);
            
            this.hideLoadingTip();
            this.redirectToApp();
            
        } catch (error) {
            console.error('获取用户数据失败:', error);
            alert('获取用户信息失败: ' + error.message);
            window.location.href = 'index.html';
        }
    }
    
    // 保存 auth token
    saveAuthToken(token, expiresIn) {
        const expiryTime = new Date().getTime() + (expiresIn * 1000);
        localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(this.STORAGE_KEYS.EXPIRY, expiryTime.toString());
        console.log('✅ Token 已保存');
    }
    
    // 保存用户数据
    saveUserData(user) {
        localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
        console.log('✅ 用户数据已保存:', user.username);
    }
    
    // 检查用户是否已登录
    isUserLoggedIn() {
        const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
        const expiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY);
        
        if (!token || !expiry) {
            return false;
        }
        
        // 检查 token 是否过期
        if (new Date().getTime() > parseInt(expiry)) {
            this.clearAuthData();
            return false;
        }
        
        return true;
    }
    
    // 获取当前用户
    getCurrentUser() {
        const userJson = localStorage.getItem(this.STORAGE_KEYS.USER);
        return userJson ? JSON.parse(userJson) : null;
    }
    
    // 获取 auth token
    getAuthToken() {
        return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
    }
    
    // 清除 auth 数据
    clearAuthData() {
        localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER);
        localStorage.removeItem(this.STORAGE_KEYS.EXPIRY);
        console.log('✅ Auth 数据已清除');
    }
    
    // 登出
    logout() {
        this.clearAuthData();
        window.location.href = 'index.html';
    }
    
    // 重定向到应用
    redirectToApp() {
        const redirectUrl = sessionStorage.getItem('redirect_after_login') || 'index.html';
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirectUrl;
    }
    
    // 显示加载提示
    showLoadingTip() {
        const loadingContainer = document.getElementById('auth-loading');
        if (loadingContainer) {
            loadingContainer.style.display = 'flex';
        }
    }
    
    // 隐藏加载提示
    hideLoadingTip() {
        const loadingContainer = document.getElementById('auth-loading');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
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
