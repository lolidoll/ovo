/**
 * 认证模态框管理器
 * 管理登录界面的显示/隐藏和用户体验
 */

class AuthModalManager {
    constructor() {
        this.modal = document.getElementById('auth-modal-overlay');
        this.discordBtn = document.getElementById('auth-discord-btn');
        this.adminBtn = document.getElementById('auth-admin-btn');
        this.adminForm = document.getElementById('auth-admin-form');
        this.adminKeyInput = document.getElementById('auth-admin-key');
        this.adminSubmitBtn = document.getElementById('auth-admin-submit');
        this.adminCancelBtn = document.getElementById('auth-admin-cancel');
        this.adminError = document.getElementById('auth-admin-error');
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
        
        // 管理员登录按钮
        if (this.adminBtn) {
            this.adminBtn.addEventListener('click', () => {
                this.showAdminForm();
            });
        }
        
        // 管理员表单提交
        if (this.adminSubmitBtn) {
            this.adminSubmitBtn.addEventListener('click', () => {
                this.handleAdminLogin();
            });
        }
        
        // 管理员表单取消
        if (this.adminCancelBtn) {
            this.adminCancelBtn.addEventListener('click', () => {
                this.hideAdminForm();
            });
        }
        
        // 回车键提交
        if (this.adminKeyInput) {
            this.adminKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAdminLogin();
                }
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
    
    showAdminForm() {
        // 隐藏登录按钮
        if (this.discordBtn) {
            this.discordBtn.style.display = 'none';
        }
        if (this.adminBtn) {
            this.adminBtn.style.display = 'none';
        }
        
        // 显示表单
        if (this.adminForm) {
            this.adminForm.style.display = 'block';
        }
        
        // 清空输入和错误
        if (this.adminKeyInput) {
            this.adminKeyInput.value = '';
            this.adminKeyInput.focus();
        }
        if (this.adminError) {
            this.adminError.style.display = 'none';
        }
    }
    
    hideAdminForm() {
        // 显示登录按钮
        if (this.discordBtn) {
            this.discordBtn.style.display = 'flex';
        }
        if (this.adminBtn) {
            this.adminBtn.style.display = 'flex';
        }
        
        // 隐藏表单
        if (this.adminForm) {
            this.adminForm.style.display = 'none';
        }
        
        // 清空输入和错误
        if (this.adminKeyInput) {
            this.adminKeyInput.value = '';
        }
        if (this.adminError) {
            this.adminError.style.display = 'none';
        }
    }
    
    handleAdminLogin() {
        const key = this.adminKeyInput ? this.adminKeyInput.value.trim() : '';
        
        if (!key) {
            this.showAdminError('请输入管理员密钥');
            return;
        }
        
        // 调用登录验证
        const result = authManager.adminLogin(key);
        
        if (result.success) {
            // 登录成功
            this.hide();
            // 可以选择刷新页面或者触发登录成功事件
            if (typeof location !== 'undefined') {
                location.reload();
            }
        } else {
            // 显示错误
            this.showAdminError(result.message);
        }
    }
    
    showAdminError(message) {
        if (this.adminError) {
            this.adminError.textContent = message;
            this.adminError.style.display = 'block';
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
