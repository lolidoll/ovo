/**
 * 前端密钥验证系统
 * 独立于 Discord 登录的密钥验证模块
 */

class KeyAuthManager {
    constructor() {
        // API 端点 - 指向你的 Vercel 后端
        // 如果使用 Upstash Redis SET (keys:valid)，用 verify-key-upstash
        // 如果使用 Vercel 环境变量 (VALID_KEYS)，用 verify-key
        this.API_ENDPOINT = 'https://ovo-psi.vercel.app/api/verify-key-upstash';
        
        // 本地存储键
        this.STORAGE_KEY = 'key_verified';
        
        // 回调函数
        this.onSuccess = null;
        this.onFail = null;
    }
    
    /**
     * 检查是否已通过密钥验证
     */
    isVerified() {
        return localStorage.getItem(this.STORAGE_KEY) === 'true';
    }
    
    /**
     * 显示密钥输入模态框
     */
    showKeyModal() {
        // 创建模态框容器
        const overlay = document.createElement('div');
        overlay.className = 'key-modal-overlay';
        overlay.innerHTML = `
            <div class="key-modal">
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
                <h3 class="key-modal-title">身份验证</h3>
                
                <!-- 描述 -->
                <p class="key-modal-desc">请输入访问密钥以继续</p>
                
                <!-- 输入框容器 -->
                <div class="key-input-container">
                    <div class="key-input-wrapper">
                        <input type="password" class="key-input" name="login-key" placeholder="输入您的密钥" autocomplete="new-password" data-form-type="other">
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
                        <span class="btn-text">验证</span>
                    </button>
                </div>
                
                <!-- 底部提示 -->
                <div class="key-modal-footer">
                    还没有密钥？联系小薯片获取哦 ~
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 绑定事件
        const input = overlay.querySelector('.key-input');
        const toggle = overlay.querySelector('.key-toggle-btn');
        const cancelBtn = overlay.querySelector('.key-modal-btn.secondary');
        const submitBtn = overlay.querySelector('.key-modal-btn.primary');
        const closeBtn = overlay.querySelector('.key-modal-close');
        const errorMsg = overlay.querySelector('.key-error-msg');
        const errorText = errorMsg.querySelector('.error-text');
        
        // 显示/隐藏密钥
        toggle.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                toggle.textContent = '🙈';
            } else {
                input.type = 'password';
                toggle.textContent = '👁️';
            }
        });
        
        // 提交验证
        submitBtn.addEventListener('click', () => this.verifyKey(input.value, errorText, errorMsg, submitBtn, overlay));
        
        // 取消/关闭
        const cancelHandler = () => {
            overlay.remove();
        };
        cancelBtn.addEventListener('click', cancelHandler);
        closeBtn.addEventListener('click', cancelHandler);
        
        // 回车提交
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyKey(input.value, errorText, errorMsg, submitBtn, overlay);
            }
        });
        
        // 自动聚焦
        setTimeout(() => input.focus(), 100);
    }
    
    /**
     * 验证密钥
     */
    async verifyKey(key, errorText, errorMsg, submitBtn, overlay) {
        if (!key || key.trim() === '') {
            errorMsg.classList.add('show');
            errorText.textContent = '请输入密钥';
            return;
        }
        
        // 显示加载状态
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        errorMsg.classList.remove('show');
        
        try {
            const response = await fetch(`${this.API_ENDPOINT}?key=${encodeURIComponent(key)}`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                // 验证成功
                localStorage.setItem(this.STORAGE_KEY, 'true');
                overlay.classList.add('success');
                
                setTimeout(() => {
                    overlay.remove();
                    if (this.onSuccess) {
                        this.onSuccess();
                    }
                }, 500);
            } else {
                // 验证失败
                let msg = data.message || '密钥验证失败';
                if (data.code === 'KEY_ALREADY_USED') {
                    msg = '该密钥已被使用，已永久失效';
                } else if (data.code === 'INVALID_KEY') {
                    msg = '无效的密钥';
                }
                errorText.textContent = msg;
                errorMsg.classList.add('show');
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('密钥验证错误:', error);
            errorText.textContent = '网络错误，请稍后重试';
            errorMsg.classList.add('show');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
    
    /**
     * 初始化并执行验证
     * @param {Function} onSuccess - 验证成功回调
     * @param {Function} onFail - 验证失败回调（可选）
     */
    init(onSuccess, onFail) {
        this.onSuccess = onSuccess;
        this.onFail = onFail;
        
        if (this.isVerified()) {
            // 已验证，直接执行成功回调
            if (onSuccess) onSuccess();
            return true;
        }
        
        // 未验证，显示输入框
        this.showKeyModal();
        return false;
    }
}

// 导出
window.KeyAuthManager = KeyAuthManager;
