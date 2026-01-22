/**
 * 登录系统集成助手
 * 
 * 本脚本提供了登录系统与应用集成所需的代码片段
 * 您可以选择将这些代码片段添加到 app.js 或其他相关文件中
 */

/* ========================================
   在 app.js 的最开始添加以下代码
   ======================================== */

/**
 * ✅ 1. 页面加载时检查登录状态
 * 
 * 将此代码添加到 app.js 的最前面，在任何 UI 初始化之前
 */

/*
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户是否已登录
    // authManager 在 login.js 中定义
    if (typeof authManager !== 'undefined' && !authManager.isUserLoggedIn()) {
        // 用户未登录，重定向到登录页面
        window.location.href = 'login.html';
        return;
    }
    
    // 用户已登录，继续初始化应用
    initializeApp();
});

function initializeApp() {
    // 您的应用初始化代码
    console.log('应用初始化...');
    
    // 获取当前用户信息
    const currentUser = authManager.getCurrentUser();
    if (currentUser) {
        console.log('当前用户:', currentUser);
        updateUserUI(currentUser);
    }
}

function updateUserUI(user) {
    // 更新 UI 显示用户信息
    const userName = document.querySelector('.user-name');
    if (userName) {
        userName.textContent = user.username || '用户';
    }
    
    // 如果需要，更新用户头像
    // 注意：Discord 头像 URL 格式：
    // https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
}
*/

/* ========================================
   2. 添加登出功能
   
   在您的用户菜单或设置页面中添加
   ======================================== */

/*
// 添加登出按钮事件监听
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('确定要退出登录吗？')) {
            authManager.logout();
        }
    });
}

// 或者在菜单中直接调用
function handleLogout() {
    authManager.logout();
}
*/

/* ========================================
   3. 在 API 请求中使用 Token
   ======================================== */

/*
// 示例：带 Token 的 Fetch 请求
async function makeAuthenticatedRequest(url, options = {}) {
    const token = authManager.getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    return response.json();
}

// 使用示例
makeAuthenticatedRequest('/api/user/profile')
    .then(data => console.log('用户资料:', data))
    .catch(error => console.error('错误:', error));
*/

/* ========================================
   4. 监听 Token 过期并自动刷新
   ======================================== */

/*
// 定期检查 Token 过期时间
setInterval(() => {
    const expiry = localStorage.getItem('discord_token_expiry');
    
    if (expiry && Date.now() > parseInt(expiry)) {
        console.warn('Token 已过期，请重新登录');
        authManager.logout();
    }
}, 60000); // 每分钟检查一次
*/

/* ========================================
   5. 显示用户头像
   ======================================== */

/*
function getUserAvatarUrl(user) {
    if (!user.avatar) {
        // 使用默认头像
        const defaultAvatarNum = parseInt(user.discriminator) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
    }
    
    // 构建 Discord CDN 头像 URL
    const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}`;
}

// 使用示例
const user = authManager.getCurrentUser();
if (user) {
    const avatarUrl = getUserAvatarUrl(user);
    const avatarImg = document.querySelector('.user-avatar');
    if (avatarImg) {
        avatarImg.src = avatarUrl;
    }
}
*/

/* ========================================
   6. 为导航栏添加用户信息
   ======================================== */

/*
// 在应用初始化中调用此函数
function updateTopNavWithUserInfo() {
    const user = authManager.getCurrentUser();
    if (!user) return;
    
    // 更新用户名
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) {
        userNameEl.textContent = user.username;
    }
    
    // 更新用户头像
    const userAvatarEl = document.querySelector('.user-avatar-display');
    if (userAvatarEl) {
        const avatarUrl = getUserAvatarUrl(user);
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = user.username;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        userAvatarEl.textContent = ''; // 清除文本
        userAvatarEl.appendChild(img);
    }
}
*/

/* ========================================
   7. 数据持久化与同步
   
   如果需要在服务器上保存用户数据
   ======================================== */

/*
// 服务器同步用户信息
async function syncUserDataToServer() {
    const user = authManager.getCurrentUser();
    const token = authManager.getAuthToken();
    
    try {
        const response = await fetch('/api/user/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                discordId: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                lastSyncTime: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('用户数据已同步到服务器');
        }
    } catch (error) {
        console.error('同步失败:', error);
    }
}
*/

/* ========================================
   8. 自定义登录检查函数
   
   用于在应用的其他地方需要验证身份时使用
   ======================================== */

/*
// 严格的登录验证（包括 Token 有效性检查）
async function requireLogin() {
    if (!authManager.isUserLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    
    // 可选：验证 Token 是否仍然有效
    const token = authManager.getAuthToken();
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        if (response.ok) {
            return true;
        } else {
            // Token 无效，清除并重新登录
            authManager.logout();
            return false;
        }
    } catch (error) {
        console.error('Token 验证失败:', error);
        return true; // 如果验证服务不可用，仍然允许访问
    }
}
*/

/* ========================================
   9. 页面可见性变化时重新验证
   
   当用户切换标签页或应用后台转前台时
   ======================================== */

/*
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 应用从后台恢复到前台
        console.log('应用已恢复到前台');
        
        // 重新检查登录状态
        if (!authManager.isUserLoggedIn()) {
            window.location.href = 'login.html';
        }
    }
});
*/

/* ========================================
   10. 处理不同的错误场景
   ======================================== */

/*
async function handleAuthError(error) {
    if (error.response?.status === 401) {
        // Token 过期或无效
        console.warn('认证失败，重新登录...');
        authManager.logout();
    } else if (error.response?.status === 403) {
        // 禁止访问
        console.error('您没有权限访问此资源');
        showErrorMessage('您没有权限访问此资源');
    } else if (error.response?.status === 500) {
        // 服务器错误
        console.error('服务器错误，请稍后重试');
        showErrorMessage('服务器错误，请稍后重试');
    }
}

function showErrorMessage(message) {
    // 显示错误提示
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
*/

/* ========================================
   完整集成示例
   ======================================== */

/*
// 在应用启动时立即执行
(function initAuthSystem() {
    // 检查是否在登录页面
    if (window.location.pathname.includes('login.html')) {
        return; // 不重复检查
    }
    
    // 等待 authManager 加载完成
    if (typeof authManager === 'undefined') {
        setTimeout(initAuthSystem, 100);
        return;
    }
    
    // 检查登录状态
    if (!authManager.isUserLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // 用户已登录
    const user = authManager.getCurrentUser();
    console.log('✅ 用户已登录:', user.username);
    
    // 更新 UI
    document.querySelector('.user-name').textContent = user.username;
    
    // 继续初始化应用
    initializeMainApp();
})();

function initializeMainApp() {
    // 您的应用主初始化代码
    console.log('应用初始化中...');
}
*/

// ========================================
// 导出供其他模块使用
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        requireLogin,
        handleAuthError,
        updateUserUI,
        syncUserDataToServer
    };
}
