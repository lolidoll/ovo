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
            KEY_API: window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api/keys'
                : 'https://ovo-psi.vercel.app/api/keys',
            SCOPES: ['identify', 'email']
        };
        
        // 本地存储键
        this.STORAGE_KEYS = {
            TOKEN: 'discord_auth_token',
            USER: 'discord_user_data',
            EXPIRY: 'discord_token_expiry',
            STATE: 'oauth_state',
            KEY_VERIFIED: 'key_verified'
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
    async initiateLogin() {
        try {
            // 检查密钥是否已验证（由 KeyAuthManager 处理）
            const keyVerified = localStorage.getItem(this.STORAGE_KEYS.KEY_VERIFIED);

            if (!keyVerified) {
                console.warn('⚠️ 密钥未验证，请先验证密钥');
                // 通知 authModalManager 显示密钥输入
                if (window.authModalManager && window.authModalManager.keyAuth) {
                    window.authModalManager.keyAuth.showKeyModal();
                }
                return;
            }

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

    // 提示用户输入密钥 - 使用漂亮的模态框
    promptForKey() {
        return new Promise((resolve) => {
            // 创建模态框遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'key-modal-overlay';
            
            // 创建模态框
            const modal = document.createElement('div');
            modal.className = 'key-modal';
            modal.innerHTML = `
                <!-- 猫耳装饰 -->
                <div class="cat-ears">
                    <div class="cat-ear-left"></div>
                    <div class="cat-ear-right"></div>
                </div>
                
                <!-- 关闭按钮 -->
                <button class="key-modal-close" title="关闭">×</button>
                
                <!-- 图标 -->
                <div class="key-modal-icon">
                    <div class="icon-wrapper">
                        <span>🔐</span>
                    </div>
                </div>
                
                <!-- 标题 -->
                <h3 class="key-modal-title">登录验证</h3>
                
                <!-- 描述 -->
                <p class="key-modal-desc">请输入登录密钥以继续 ~</p>
                
                <!-- 输入框容器 -->
                <div class="key-input-container">
                    <div class="key-input-wrapper">
                        <input type="password" class="key-input" name="login-key" placeholder="请输入您的登录密钥..." autocomplete="new-password" data-form-type="other">
                        <button type="button" class="key-toggle-btn" title="显示/隐藏密钥">👁️</button>
                    </div>
                </div>
                
                <!-- 错误提示 -->
                <div class="key-error-msg">
                    <span>⚠️</span>
                    <span class="error-text"></span>
                </div>
                
                <!-- 按钮组 -->
                <div class="key-modal-buttons">
                    <button class="key-modal-btn secondary">
                        <span class="btn-text">取消</span>
                    </button>
                    <button class="key-modal-btn primary">
                        <span class="btn-spinner"></span>
                        <span class="btn-text">确认</span>
                    </button>
                </div>
                
                <!-- 底部提示 -->
                <div class="key-modal-footer">
                    还没有密钥？联系小薯片获取哦 ~
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // 获取元素
            const input = modal.querySelector('.key-input');
            const toggleBtn = modal.querySelector('.key-toggle-btn');
            const closeBtn = modal.querySelector('.key-modal-close');
            const cancelBtn = modal.querySelector('.key-modal-btn.secondary');
            const confirmBtn = modal.querySelector('.key-modal-btn.primary');
            const errorMsg = modal.querySelector('.key-error-msg');
            const errorText = modal.querySelector('.error-text');
            
            // 防止浏览器自动填充 - 强制清空并设置只读后解除
            input.value = '';
            setTimeout(() => {
                input.value = '';
                input.setAttribute('readonly', 'readonly');
                setTimeout(() => {
                    input.removeAttribute('readonly');
                    input.focus();
                }, 100);
            }, 50);
            
            // 显示错误消息
            const showError = (message) => {
                input.classList.add('error');
                errorText.textContent = message;
                errorMsg.classList.add('show');
                
                // 1.5秒后清除错误状态
                setTimeout(() => {
                    input.classList.remove('error');
                    errorMsg.classList.remove('show');
                }, 1500);
            };
            
            // 关闭模态框
            const closeModal = (result) => {
                overlay.style.animation = 'fadeOut 0.2s ease-out';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(result);
                }, 200);
            };
            
            // 显示/隐藏密钥
            toggleBtn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                toggleBtn.textContent = isPassword ? '🙈' : '👁️';
            });
            
            // 关闭按钮
            closeBtn.addEventListener('click', () => closeModal(null));
            
            // 取消按钮
            cancelBtn.addEventListener('click', () => closeModal(null));
            
            // 点击遮罩层关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal(null);
            });
            
            // 确认按钮 - 验证密钥
            confirmBtn.addEventListener('click', async () => {
                const key = input.value.trim();
                
                if (!key) {
                    showError('请输入登录密钥 ~');
                    input.focus();
                    return;
                }
                
                // 显示加载状态
                confirmBtn.classList.add('loading');
                input.disabled = true;
                
                // 验证密钥
                const isValid = await this.verifyKeyInModal(key, modal, showError);
                
                confirmBtn.classList.remove('loading');
                
                if (isValid) {
                    // 验证成功，延迟关闭让用户看到成功动画
                    setTimeout(() => {
                        closeModal(key);
                    }, 800);
                } else {
                    // 验证失败，恢复输入
                    input.disabled = false;
                    input.focus();
                }
            });
            
            // 回车键确认
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
            
            // ESC键关闭
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    closeModal(null);
                }
            });
            
            // 自动聚焦输入框
            setTimeout(() => input.focus(), 100);
            
            // 添加淡出动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        });
    }
    
    // 在模态框中验证密钥
    async verifyKeyInModal(key, modal, showError) {
        try {
            const response = await fetch(`${this.CONFIG.KEY_API}?action=verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });

            const data = await response.json();

            if (data.valid) {
                // 显示成功状态
                modal.classList.add('success');
                // 更新图标
                const iconWrapper = modal.querySelector('.icon-wrapper');
                iconWrapper.innerHTML = '<span style="color: #6bc96b; font-size: 36px;">✓</span>';
                
                localStorage.setItem(this.STORAGE_KEYS.KEY_VERIFIED, key);
                console.log('✅ 密钥验证成功');
                return true;
            } else {
                if (data.used) {
                    showError('该密钥已被使用，已永久失效 ~');
                } else {
                    showError('无效的密钥，请检查是否正确 ~');
                }
                return false;
            }
        } catch (error) {
            console.error('密钥验证失败:', error);
            showError('密钥验证失败，请稍后重试 ~');
            return false;
        }
    }
    
    // 原有的 verifyKey 方法保留用于其他地方
    async verifyKey(key) {
        return await this.verifyKeyInModal(key, { classList: { add: () => {} }, querySelector: () => ({innerHTML: ''}) }, () => {});
    }

    // 验证密钥
    async verifyKey(key) {
        try {
            const response = await fetch(`${this.CONFIG.KEY_API}?action=verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });

            const data = await response.json();

            if (data.valid) {
                // 标记密钥已验证
                localStorage.setItem(this.STORAGE_KEYS.KEY_VERIFIED, key);
                console.log('✅ 密钥验证成功');
                return true;
            } else {
                if (data.used) {
                    alert('❌ 该密钥已被使用，已永久失效！\n请联系小薯片获取新密钥。');
                } else {
                    alert('❌ 无效的密钥！\n请检查密钥是否正确。');
                }
                return false;
            }
        } catch (error) {
            console.error('密钥验证失败:', error);
            alert('❌ 密钥验证失败，请稍后重试');
            return false;
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
            // 获取已验证的密钥
            const verifiedKey = localStorage.getItem(this.STORAGE_KEYS.KEY_VERIFIED);
            
            // 调用 Vercel API 进行 token 交换
            const response = await fetch(this.CONFIG.TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    code: code,
                    client_id: this.CONFIG.CLIENT_ID,
                    verified_key: verifiedKey
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
                // 清除已验证密钥的临时存储
                localStorage.removeItem(this.STORAGE_KEYS.KEY_VERIFIED);
                
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
            
            // 保存管理员登录信息
            this.saveUserData(adminUserData);
            
            this.handleLoginSuccess(adminUserData);
        }
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
    
    // 添加飘落的心形背景装饰
    createFloatingHearts();
});

// ========================================
// 创建飘落的心形背景
// ========================================

function createFloatingHearts() {
    const heartsContainer = document.createElement('div');
    heartsContainer.className = 'floating-hearts';
    document.body.appendChild(heartsContainer);
    
    const hearts = ['💕', '💗', '💖', '💝', '💓', '✨', '🎀'];
    const numHearts = 12;
    
    for (let i = 0; i < numHearts; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.className = 'floating-heart';
            heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.left = Math.random() * 100 + '%';
            heart.style.fontSize = (15 + Math.random() * 20) + 'px';
            heart.style.animationDuration = (12 + Math.random() * 10) + 's';
            heart.style.animationDelay = (Math.random() * 5) + 's';
            heartsContainer.appendChild(heart);
        }, i * 300);
    }
}

// ========================================
// 导出给其他脚本使用
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscordAuthManager;
}
