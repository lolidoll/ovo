/**
 * 认证模态框管理器
 * 管理登录界面的显示/隐藏和用户体验
 */

class AuthModalManager {
    constructor() {
        this.modal = document.getElementById('auth-modal-overlay');
        this.discordBtn = document.getElementById('auth-discord-btn');
        this.loadingContainer = document.getElementById('auth-loading');
        this.init();
    }
    
    init() {
        // 检查登录状态
        if (typeof authManager !== 'undefined') {
            this.checkLoginStatus();
        } else {
            // authManager 可能还未加载，等待
            setTimeout(() => this.init(), 100);
            return;
        }
        
        // 绑定事件
        this.bindEvents();
    }
    
    bindEvents() {
        // Discord 登录按钮
        if (this.discordBtn) {
            this.discordBtn.addEventListener('click', () => {
                this.showLoading();
                authManager.initiateLogin();
            });
        }
    }
    
    checkLoginStatus() {
        // 如果用户已登录，隐藏模态框
        if (authManager && authManager.isUserLoggedIn()) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            // 禁用背景滚动
            document.body.style.overflow = 'hidden';
        }
    }
    
    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            // 启用背景滚动
            document.body.style.overflow = '';
        }
    }
    
    showLoading() {
        if (this.discordBtn) {
            this.discordBtn.disabled = true;
        }
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'flex';
        }
    }
    
    hideLoading() {
        if (this.discordBtn) {
            this.discordBtn.disabled = false;
        }
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 等待 authManager 加载
    const checkAuthManager = setInterval(() => {
        if (typeof authManager !== 'undefined') {
            clearInterval(checkAuthManager);
            window.authModalManager = new AuthModalManager();
            
            // 监听登录完成事件
            const originalRedirect = authManager.redirectToApp;
            authManager.redirectToApp = function() {
                if (window.authModalManager) {
                    window.authModalManager.hide();
                }
                originalRedirect.call(this);
            };
        }
    }, 100);
});
