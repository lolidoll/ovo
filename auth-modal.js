/**
 * 认证模态框管理器
 * 管理登录界面的显示/隐藏和用户体验
 * 集成密钥验证 + Discord 登录（双重验证）
 */

class AuthModalManager {
    constructor() {
        this.modal = document.getElementById('auth-modal-overlay');
        this.discordBtn = document.getElementById('auth-discord-btn');
        this.loadingContainer = document.getElementById('auth-loading');
        this.pixelCat = null; // 将在 init 中初始化
        this.keyAuth = null;
        this.authStep = 'key'; // key -> discord -> complete
        this.animationElements = {
            tetrisPieces: [],
            stars: [],
            pixelCat: null
        };
        this.init();
    }
    
    init() {
        // 获取像素小猫元素
        this.pixelCat = document.getElementById('auth-pixel-cat');
        
        // 初始化背景动画
        this.initBackgroundAnimations();
        
        // 启动像素小猫随机眨眼
        this.startCatBlink();
        
        // 初始化密钥验证
        this.initKeyAuth();
        
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
    
    // 初始化密钥验证
    initKeyAuth() {
        // 检查是否已加载 KeyAuthManager
        if (typeof KeyAuthManager !== 'undefined') {
            this.keyAuth = new KeyAuthManager();
            
            // 设置回调：密钥验证成功后进入 Discord 登录
            this.keyAuth.onSuccess = () => {
                console.log('✅ 密钥验证成功，允许 Discord 登录');
                this.authStep = 'discord';
                this.onKeyVerified();
            };
        } else {
            console.warn('⚠️ KeyAuthManager 未加载，等待...');
            // 延迟重试
            setTimeout(() => this.initKeyAuth(), 500);
        }
    }
    
    // 密钥验证成功后的处理
    onKeyVerified() {
        // 更新 UI：显示 Discord 登录，隐藏密钥部分
        const keySection = document.querySelector('.auth-key-section');
        const discordSection = document.querySelector('.auth-discord-section');
        const discordBtn = document.getElementById('auth-discord-btn');
        const subtitle = document.querySelector('.auth-subtitle');
        
        if (keySection) keySection.style.display = 'none';
        if (discordSection) discordSection.style.display = 'block';
        if (discordBtn) {
            discordBtn.style.display = 'flex';
            discordBtn.disabled = false;
        }
        
        // 更新副标题
        if (subtitle) {
            subtitle.innerHTML = '密钥验证通过 ✅<br>请使用 Discord 登录继续';
        }
    }

    // 初始化背景动画（俄罗斯方块 + 星星 + 像素小猫）
    initBackgroundAnimations() {
        if (!this.modal) return;
        
        // 创建俄罗斯方块背景容器
        const tetrisBg = document.createElement('div');
        tetrisBg.className = 'tetris-background';
        this.modal.appendChild(tetrisBg);
        
        // 创建星星背景容器
        const starBg = document.createElement('div');
        starBg.className = 'star-background';
        this.modal.appendChild(starBg);
        
        // 创建像素小猫容器
        const catContainer = document.createElement('div');
        catContainer.className = 'pixel-cat-container';
        catContainer.id = 'auth-pixel-cat';
        
        // 创建像素小猫
        const cat = this.createPixelCat();
        catContainer.appendChild(cat);
        this.modal.appendChild(catContainer);
        
        this.pixelCat = cat;
        
        // 生成俄罗斯方块
        this.generateTetrisPieces(tetrisBg);
        
        // 生成星星
        this.generateStars(starBg);
    }
    
    // 创建像素小猫
    createPixelCat() {
        const cat = document.createElement('div');
        cat.className = 'pixel-cat';
        
        // 耳朵
        const earLeft = document.createElement('div');
        earLeft.className = 'pixel-cat-ear left';
        const earRight = document.createElement('div');
        earRight.className = 'pixel-cat-ear right';
        
        // 头部
        const head = document.createElement('div');
        head.className = 'pixel-cat-head';
        
        // 眼睛 - 单个元素
        const eyes = document.createElement('div');
        eyes.className = 'pixel-cat-eye';
        
        // 身体
        
        // 身体
        const body = document.createElement('div');
        body.className = 'pixel-cat-body';
        
        // 尾巴
        const tail = document.createElement('div');
        tail.className = 'pixel-cat-tail';
        const tailLeft = document.createElement('div');
        tailLeft.className = 'pixel-cat-tail-left';
        
        head.appendChild(earLeft);
        head.appendChild(earRight);
        head.appendChild(eyes);
        
        cat.appendChild(head);
        cat.appendChild(body);
        cat.appendChild(tail);
        cat.appendChild(tailLeft);
        
        return cat;
    }
    
    // 生成俄罗斯方块
    generateTetrisPieces(container) {
        const colors = ['pink', 'lavender', 'mint', 'peach', 'sky', 'lemon', 'coral', 'periwinkle'];
        const types = ['', 'horizontal', 'vertical', 'square'];
        
        // 创建25个下落方块，实现全屏掉落效果
        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const piece = document.createElement('div');
                const color = colors[Math.floor(Math.random() * colors.length)];
                const type = types[Math.floor(Math.random() * types.length)];
                
                piece.className = `tetris-piece ${color} ${type}`;
                piece.style.left = Math.random() * 100 + '%';
                piece.style.animationDuration = (Math.random() * 10 + 8) + 's';
                piece.style.animationDelay = (Math.random() * 3) + 's';
                
                container.appendChild(piece);
                
                // 动画结束后移除并创建新的
                piece.addEventListener('animationend', () => {
                    piece.remove();
                    this.generateTetrisPieces(container);
                });
            }, i * 300);
        }
    }
    
    // 生成星星
    generateStars(container) {
        for (let i = 0; i < 30; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = (Math.random() * 3) + 's';
            star.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(star);
        }
    }

    // 启动像素小猫随机眨眼效果
    startCatBlink() {
        if (!this.pixelCat) return;
        
        // 每3-8秒随机眨眼
        const blink = () => {
            this.pixelCat.classList.add('blink');
            setTimeout(() => {
                this.pixelCat.classList.remove('blink');
            }, 150);
            
            // 下一次眨眼的随机时间
            const nextBlink = Math.random() * 5000 + 3000;
            setTimeout(blink, nextBlink);
        };
        
        // 2秒后开始第一次眨眼
        setTimeout(blink, 2000);
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
        // 双重验证检查：密钥 + Discord
        const keyVerified = this.keyAuth && this.keyAuth.isVerified();
        const discordLoggedIn = authManager && authManager.isUserLoggedIn();
        
        if (keyVerified && discordLoggedIn) {
            // 双重验证都通过，隐藏模态框
            this.hide();
            this.authStep = 'complete';
        } else if (keyVerified) {
            // 仅密钥验证通过，等待 Discord 登录
            this.show();
            this.authStep = 'discord';
            this.updateAuthStepUI();
        } else {
            // 都未验证，触发密钥验证
            this.authStep = 'key';
            if (this.keyAuth) {
                this.keyAuth.showKeyModal();
            }
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
