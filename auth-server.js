/**
 * Discord OAuth2 后端认证服务
 * Node.js / Express 实现
 * 
 * 安装依赖:
 * npm install express axios cors body-parser dotenv
 * 
 * 使用:
 * node auth-server.js
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
    origin: ['http://localhost:8000', 'https://yourdomain.com'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Discord OAuth2 配置
const DISCORD_CONFIG = {
    CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID',
    CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
    REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'http://localhost:8000/login.html',
    API_ENDPOINT: 'https://discord.com/api/v10'
};

// 验证配置
function validateConfig() {
    if (DISCORD_CONFIG.CLIENT_ID === 'YOUR_CLIENT_ID' || 
        DISCORD_CONFIG.CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
        console.warn('⚠️  警告: Discord 配置不完整');
        console.warn('请设置环境变量或在此文件中配置:');
        console.warn('  DISCORD_CLIENT_ID');
        console.warn('  DISCORD_CLIENT_SECRET');
        console.warn('  DISCORD_REDIRECT_URI');
    }
}

/**
 * 健康检查端点
 */
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Discord OAuth2 Token 交换端点
 * POST /api/auth/discord/callback
 * 
 * 请求体:
 * {
 *   "code": "授权码"
 * }
 * 
 * 响应:
 * {
 *   "access_token": "...",
 *   "token_type": "Bearer",
 *   "expires_in": 604800,
 *   "refresh_token": "...",
 *   "user": {
 *     "id": "...",
 *     "username": "...",
 *     "email": "...",
 *     "avatar": "..."
 *   }
 * }
 */
app.post('/api/auth/discord/callback', async (req, res) => {
    try {
        const { code } = req.body;
        
        // 验证请求
        if (!code) {
            return res.status(400).json({
                error: '缺少授权码',
                code: 'MISSING_CODE'
            });
        }
        
        console.log('📝 接收到授权码，正在交换...');
        
        // 步骤 1: 交换授权码获取 Access Token
        let tokenData;
        try {
            const tokenResponse = await axios.post(
                `${DISCORD_CONFIG.API_ENDPOINT}/oauth2/token`,
                {
                    client_id: DISCORD_CONFIG.CLIENT_ID,
                    client_secret: DISCORD_CONFIG.CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: DISCORD_CONFIG.REDIRECT_URI
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            tokenData = tokenResponse.data;
            console.log('✅ 成功获取 Access Token');
            
        } catch (tokenError) {
            console.error('❌ Token 交换失败:', tokenError.response?.data || tokenError.message);
            return res.status(401).json({
                error: 'Token 交换失败',
                details: tokenError.response?.data?.error || tokenError.message,
                code: 'TOKEN_EXCHANGE_FAILED'
            });
        }
        
        // 步骤 2: 使用 Access Token 获取用户信息
        let userData;
        try {
            const userResponse = await axios.get(
                `${DISCORD_CONFIG.API_ENDPOINT}/users/@me`,
                {
                    headers: {
                        'Authorization': `${tokenData.token_type} ${tokenData.access_token}`,
                        'User-Agent': 'DiscordOAuth/1.0'
                    }
                }
            );
            
            userData = userResponse.data;
            console.log('✅ 成功获取用户信息:', userData.username);
            
        } catch (userError) {
            console.error('❌ 获取用户信息失败:', userError.response?.data || userError.message);
            return res.status(401).json({
                error: '获取用户信息失败',
                details: userError.response?.data?.message || userError.message,
                code: 'USER_INFO_FAILED'
            });
        }
        
        // 步骤 3: 获取用户邮箱（如果请求了权限）
        let userEmail = userData.email || null;
        
        // 步骤 4: 返回完整的认证响应
        const response = {
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            expires_in: tokenData.expires_in || 604800, // 默认 7 天
            refresh_token: tokenData.refresh_token || null,
            scope: tokenData.scope || '',
            user: {
                id: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                email: userEmail,
                verified: userData.verified,
                avatar: userData.avatar,
                avatar_decoration: userData.avatar_decoration || null,
                banner: userData.banner || null,
                accent_color: userData.accent_color || null,
                locale: userData.locale,
                mfa_enabled: userData.mfa_enabled,
                premium_type: userData.premium_type || 0,
                public_flags: userData.public_flags || 0
            }
        };
        
        console.log('🎉 认证成功，返回响应');
        res.json(response);
        
    } catch (error) {
        console.error('❌ 认证服务错误:', error);
        res.status(500).json({
            error: '服务器错误',
            message: process.env.NODE_ENV === 'development' ? error.message : '认证失败',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * Token 验证端点（可选）
 * POST /api/auth/verify
 * 
 * 请求体:
 * {
 *   "token": "access_token"
 * }
 * 
 * 响应:
 * {
 *   "valid": true,
 *   "user": { ... }
 * }
 */
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                error: 'Token 缺失',
                valid: false
            });
        }
        
        const userResponse = await axios.get(
            `${DISCORD_CONFIG.API_ENDPOINT}/users/@me`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': 'DiscordOAuth/1.0'
                }
            }
        );
        
        res.json({
            valid: true,
            user: userResponse.data
        });
        
    } catch (error) {
        console.error('❌ Token 验证失败:', error.message);
        res.status(401).json({
            error: 'Token 无效或已过期',
            valid: false,
            code: 'INVALID_TOKEN'
        });
    }
});

/**
 * 刷新 Token 端点（可选）
 * POST /api/auth/refresh
 * 
 * 请求体:
 * {
 *   "refresh_token": "refresh_token"
 * }
 */
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return res.status(400).json({
                error: 'Refresh token 缺失'
            });
        }
        
        const tokenResponse = await axios.post(
            `${DISCORD_CONFIG.API_ENDPOINT}/oauth2/token`,
            {
                client_id: DISCORD_CONFIG.CLIENT_ID,
                client_secret: DISCORD_CONFIG.CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }
        );
        
        res.json(tokenResponse.data);
        
    } catch (error) {
        console.error('❌ Token 刷新失败:', error.message);
        res.status(401).json({
            error: 'Token 刷新失败',
            code: 'REFRESH_FAILED'
        });
    }
});

/**
 * 登出端点（可选）
 * POST /api/auth/logout
 * 
 * 请求体:
 * {
 *   "token": "access_token"
 * }
 */
app.post('/api/auth/logout', async (req, res) => {
    try {
        // Discord 不支持直接撤销 token，
        // 但我们可以在服务器端维护黑名单
        // 或清除会话数据
        
        res.json({
            success: true,
            message: '已登出'
        });
        
    } catch (error) {
        console.error('❌ 登出失败:', error.message);
        res.status(500).json({
            error: '登出失败',
            code: 'LOGOUT_FAILED'
        });
    }
});

/**
 * 错误处理中间件
 */
app.use((error, req, res, next) => {
    console.error('❌ 未处理的错误:', error);
    res.status(500).json({
        error: '服务器错误',
        message: process.env.NODE_ENV === 'development' ? error.message : '服务器发生错误'
    });
});

/**
 * 404 处理
 */
app.use((req, res) => {
    res.status(404).json({
        error: '未找到',
        message: '请求的端点不存在'
    });
});

/**
 * 启动服务器
 */
validateConfig();

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Discord OAuth2 认证服务');
    console.log('================================');
    console.log(`📍 服务器运行在: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 可用端点:');
    console.log('  GET  /health');
    console.log('  POST /api/auth/discord/callback');
    console.log('  POST /api/auth/verify');
    console.log('  POST /api/auth/refresh');
    console.log('  POST /api/auth/logout');
    console.log('');
    console.log('⚙️  配置:');
    console.log(`  Client ID: ${DISCORD_CONFIG.CLIENT_ID}`);
    console.log(`  Redirect URI: ${DISCORD_CONFIG.REDIRECT_URI}`);
    console.log('');
    console.log('💡 提示: 按 Ctrl+C 停止服务器');
    console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n⛔ 服务器关闭中...');
    process.exit(0);
});

module.exports = app;
