/* ========================================
   Discord 登录集成指南
   ======================================== */

/**
 * 快速开始指南
 * 
 * 1. 创建 Discord 应用程序
 *    - 访问 https://discord.com/developers/applications
 *    - 点击 "New Application"
 *    - 输入应用名称
 *    - 在左侧菜单选择 "OAuth2"
 * 
 * 2. 获取 CLIENT_ID
 *    - 在 OAuth2 页面找到 CLIENT_ID
 *    - 复制到 login.js 的 CONFIG.CLIENT_ID
 * 
 * 3. 配置重定向 URI
 *    - 在 OAuth2 页面的 "Redirects" 中添加：
 *    - http://localhost:8000/login.html （开发环境）
 *    - https://yourdomain.com/login.html （生产环境）
 * 
 * 4. 配置后端 API（推荐）
 *    - 创建一个后端端点来处理 token 交换
 *    - 参考下方的 "后端实现示例"
 * 
 * 5. 更新配置
 *    - 修改 login.js 中的 CLIENT_ID
 *    - 修改 TOKEN_ENDPOINT 指向您的后端 API
 */

/* ========================================
   后端实现示例（Node.js/Express）
   ======================================== */

/**
 * 安装依赖:
 * npm install express axios cors body-parser
 * 
 * 创建 backend/auth.js：
 */

/*
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DISCORD_CLIENT_ID = 'YOUR_CLIENT_ID';
const DISCORD_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:8000/login.html';

// 令牌交换端点
app.post('/api/auth/discord/callback', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: '缺少授权码' });
        }
        
        // 交换授权码获取 access token
        const tokenResponse = await axios.post(
            'https://discord.com/api/v10/oauth2/token',
            {
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        const { access_token, token_type } = tokenResponse.data;
        
        // 使用 access token 获取用户信息
        const userResponse = await axios.get(
            'https://discord.com/api/v10/users/@me',
            {
                headers: {
                    'Authorization': `${token_type} ${access_token}`
                }
            }
        );
        
        // 返回 token 和用户信息
        return res.json({
            access_token: access_token,
            expires_in: 604800, // 7天
            user: userResponse.data
        });
        
    } catch (error) {
        console.error('OAuth 认证失败:', error);
        return res.status(500).json({ 
            error: '认证失败',
            message: error.message 
        });
    }
});

// 验证 token 端点（可选）
app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body;
    // 实现 token 验证逻辑
    res.json({ valid: true });
});

// 登出端点（可选）
app.post('/api/auth/logout', (req, res) => {
    // 实现登出逻辑（如果需要）
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log('认证服务器运行在 http://localhost:3000');
});
*/

/* ========================================
   前端使用示例
   ======================================== */

/**
 * 检查用户是否已登录：
 */
// if (authManager.isUserLoggedIn()) {
//     const user = authManager.getCurrentUser();
//     console.log('当前用户:', user);
// }

/**
 * 获取 Auth Token：
 */
// const token = authManager.getAuthToken();
// 
// // 在 API 请求中使用
// fetch('/api/data', {
//     headers: {
//         'Authorization': `Bearer ${token}`
//     }
// })

/**
 * 执行登出：
 */
// authManager.logout();

/* ========================================
   安全最佳实践
   ======================================== */

/**
 * 1. 始终使用 HTTPS
 *    - 确保所有与 Discord 的通信都通过 HTTPS
 *    - 在生产环境中不要使用 HTTP
 * 
 * 2. 保护 CLIENT_SECRET
 *    - 从不在前端代码中暴露 CLIENT_SECRET
 *    - 所有 token 交换都应在后端完成
 * 
 * 3. 验证状态码
 *    - 登录系统自动验证状态码以防止 CSRF 攻击
 *    - 确保重定向 URI 与 Discord 应用配置匹配
 * 
 * 4. Token 管理
 *    - 定期检查 token 过期时间
 *    - 实现 token 刷新机制
 *    - 将敏感信息存储在 localStorage（使用 HTTPS）
 * 
 * 5. 错误处理
 *    - 对所有 API 调用实现适当的错误处理
 *    - 不要向用户暴露敏感的错误信息
 */

/* ========================================
   常见问题解决
   ======================================== */

/**
 * Q: 登录后无法重定向到 Discord
 * A: 检查 login.js 中的 CLIENT_ID 是否正确配置
 *    确保重定向 URI 在 Discord 应用中已注册
 * 
 * Q: 获取用户信息失败
 * A: 确保后端 /api/auth/discord/callback 端点已实现
 *    检查网络连接和 API 响应
 * 
 * Q: Token 在浏览器中显示
 * A: 这是正常的。使用 HTTPS 可以通过加密保护传输过程
 *    考虑在服务器端实现 token 验证
 * 
 * Q: 如何实现自动登出？
 * A: 在 app.js 中添加定时检查：
 */

/**
 * setInterval(() => {
 *     const expiry = localStorage.getItem('discord_token_expiry');
 *     if (expiry && Date.now() > parseInt(expiry)) {
 *         authManager.logout();
 *     }
 * }, 60000); // 每分钟检查一次
 */

/* ========================================
   文件结构
   ======================================== */

/**
 * 项目文件：
 * 
 * /
 * ├── login.html          - 登录页面
 * ├── login.css           - 登录样式（黑白灰简约 + 猫耳）
 * ├── login.js            - 登录认证管理器
 * ├── index.html          - 主应用（已集成登录检查）
 * ├── app.js              - 主应用脚本
 * ├── style.css           - 应用主样式
 * ├── moments.js          - moments 功能
 * ├── moments.css         - moments 样式
 * ├── voice-message.js    - 语音消息功能
 * ├── location-message.js - 位置消息功能
 * └── backend/
 *     └── auth.js         - 后端认证服务（可选但推荐）
 */

/* ========================================
   集成到现有应用
   ======================================== */

/**
 * 在 app.js 中添加登录状态检查：
 * 
 * // 页面加载时检查登录状态
 * if (!authManager.isUserLoggedIn()) {
 *     window.location.href = 'login.html';
 * }
 * 
 * // 获取当前用户信息并更新 UI
 * const currentUser = authManager.getCurrentUser();
 * if (currentUser) {
 *     // 更新用户名、头像等
 *     document.querySelector('.user-name').textContent = 
 *         currentUser.username || '用户';
 * }
 * 
 * // 在用户菜单中添加登出选项
 * document.getElementById('logout-btn').addEventListener('click', () => {
 *     authManager.logout();
 * });
 */

/* ========================================
   完成清单
   ======================================== */

/**
 * ✓ 创建 login.html（登录页面）
 * ✓ 创建 login.css（样式 - 黑白灰简约 + 猫耳装饰）
 * ✓ 创建 login.js（Discord OAuth 认证管理）
 * 
 * 下一步：
 * □ 在 Discord Developer Portal 创建应用
 * □ 获取 CLIENT_ID 并更新 login.js
 * □ 配置重定向 URI
 * □ 实现后端 /api/auth/discord/callback 端点
 * □ 在 app.js 中添加登录状态检查
 * □ 测试完整的登录流程
 * □ 部署到生产环境
 */
