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
 * 密钥验证端点
 * GET /api/keys?key=xxx
 *
 * 验证一次性密钥（基于内存存储，仅用于开发测试）
 * 生产环境建议使用 Redis 或数据库
 */
app.get('/api/keys', (req, res) => {
    try {
        const { key } = req.query;

        if (!key) {
            return res.status(400).json({
                error: '缺少密钥参数'
            });
        }

        // 简单的内存存储（仅用于开发测试）
        if (!global.keyStore) {
            global.keyStore = new Map();
        }

        const status = global.keyStore.get(key);

        // 密钥不存在
        if (status === undefined) {
            return res.status(404).json({
                error: '密钥不存在'
            });
        }

        // 密钥已使用
        if (status === 'used') {
            return res.status(403).json({
                error: '密钥已使用'
            });
        }

        // 密钥有效，标记为已使用
        global.keyStore.set(key, 'used');

        console.log(`✅ 密钥验证成功: ${key}`);
        res.status(200).json({
            success: true,
            message: '密钥验证成功'
        });

    } catch (error) {
        console.error('❌ 密钥验证失败:', error.message);
        res.status(500).json({
            error: '服务器内部错误',
            message: error.message
        });
    }
});

/**
 * 添加测试密钥（仅用于开发测试）
 * POST /api/keys/add
 *
 * 请求体:
 * {
 *   "key": "test_key_123",
 *   "note": "测试备注"
 * }
 */
app.post('/api/keys/add', (req, res) => {
    try {
        const { key, note } = req.body;

        if (!key) {
            return res.status(400).json({
                error: '缺少密钥参数'
            });
        }

        // 初始化密钥存储
        if (!global.keyStore) {
            global.keyStore = new Map();
        }

        // 检查密钥是否已存在
        if (global.keyStore.has(key)) {
            return res.status(409).json({
                error: '密钥已存在'
            });
        }

        // 添加密钥（初始状态为 'available'）
        global.keyStore.set(key, 'available');

        console.log(`✅ 密钥已添加: ${key} ${note ? `(${note})` : ''}`);
        res.status(200).json({
            success: true,
            message: '密钥已添加',
            key: key,
            note: note || ''
        });

    } catch (error) {
        console.error('❌ 添加密钥失败:', error.message);
        res.status(500).json({
            error: '服务器内部错误',
            message: error.message
        });
    }
});

/**
 * 列出所有密钥（仅用于开发测试）
 * GET /api/keys/list
 */
app.get('/api/keys/list', (req, res) => {
    try {
        if (!global.keyStore) {
            global.keyStore = new Map();
        }

        const keys = Array.from(global.keyStore.entries()).map(([key, status]) => ({
            key,
            status
        }));

        res.status(200).json({
            success: true,
            count: keys.length,
            keys: keys
        });

    } catch (error) {
        console.error('❌ 获取密钥列表失败:', error.message);
        res.status(500).json({
            error: '服务器内部错误',
            message: error.message
        });
    }
});

/**
 * API 代理端点 - 解决CORS跨域问题
 * POST /api/proxy
 *
 * 请求体:
 * {
 *   "url": "https://api.example.com/v1",
 *   "apiKey": "your-api-key",
 *   "model": "gpt-3.5-turbo",
 *   "messages": [...]
 * }
 */
app.post('/api/proxy', async (req, res) => {
    try {
        const { url, apiKey, model, messages, temperature, max_tokens } = req.body;
        
        if (!url || !apiKey) {
            return res.status(400).json({
                error: '缺少必要参数',
                code: 'MISSING_PARAMS'
            });
        }
        
        console.log('🔄 代理API请求到:', url);
        
        // 构建请求体
        const requestBody = {
            model: model || 'gpt-3.5-turbo',
            messages: messages || [],
            temperature: temperature || 0.8
        };
        
        if (max_tokens !== undefined) {
            requestBody.max_tokens = max_tokens;
        }
        
        // 转发请求到目标API
        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 30000 // 30秒超时
        });
        
        console.log('✅ API代理请求成功');
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ API代理请求失败:', error.message);
        
        if (error.response) {
            // 目标服务器返回了错误
            return res.status(error.response.status).json({
                error: 'API请求失败',
                details: error.response.data,
                code: 'API_ERROR'
            });
        } else if (error.request) {
            // 请求已发送但没有收到响应
            return res.status(503).json({
                error: 'API服务器无响应',
                code: 'API_UNAVAILABLE'
            });
        } else {
            // 其他错误
            return res.status(500).json({
                error: '代理服务器错误',
                message: error.message,
                code: 'PROXY_ERROR'
            });
        }
    }
});

/**
 * 音乐图片代理端点 - 解决GD API图片CORS问题
 * GET /api/music/pic?pic_id=xxx&source=netease&size=300
 */
app.get('/api/music/pic', async (req, res) => {
    try {
        const { pic_id } = req.query;
        const sourceRaw = (req.query.source || 'netease').toString().toLowerCase();
        const sizeRaw = parseInt(req.query.size, 10);
        const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : 300;
        const source = ['netease', 'kuwo', 'joox'].includes(sourceRaw) ? sourceRaw : 'netease';
        
        if (!pic_id) {
            return res.status(400).json({ error: '缺少 pic_id 参数' });
        }
        
        console.log(`🎵 获取音乐图片: source=${source}, pic_id=${pic_id}, size=${size}`);
        
        // 先调用 GD API 获取真实图片 URL
        const gdPicApi = `https://music-api.gdstudio.xyz/api.php?types=pic&source=${encodeURIComponent(source)}&id=${encodeURIComponent(pic_id)}&size=${size}`;
        const gdResponse = await axios.get(gdPicApi, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const realPicUrl = gdResponse?.data?.url;
        if (!realPicUrl || typeof realPicUrl !== 'string') {
            console.error('❌ GD图片接口返回异常:', gdResponse?.data);
            return res.status(502).json({ error: 'GD图片接口返回异常' });
        }
        
        // 再回源真实图片并转发给前端
        const imageResponse = await axios.get(realPicUrl, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            responseType: 'arraybuffer'
        });
        
        // 设置响应头允许跨域和缓存
        res.set({
            'Content-Type': imageResponse.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
        });
        
        res.send(imageResponse.data);
        
    } catch (error) {
        console.error('❌ 图片代理失败:', error.message);
        res.status(500).json({ error: '图片获取失败', message: error.message });
    }
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
    console.log('  GET  /api/keys?key=xxx');
    console.log('  POST /api/keys/add');
    console.log('  GET  /api/keys/list');
    console.log('  POST /api/auth/discord/callback');
    console.log('  POST /api/auth/verify');
    console.log('  POST /api/auth/refresh');
    console.log('  POST /api/auth/logout');
    console.log('  POST /api/proxy');
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
