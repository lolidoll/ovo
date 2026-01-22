/**
 * Discord OAuth Token Exchange Handler
 * Vercel Serverless Function
 */

export default async function handler(req, res) {
    // ⚠️ 必须在最前面设置 CORS 头 - 这是关键！
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
    };
    
    // 为所有响应设置 CORS 头
    Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    
    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { code, client_id } = req.body;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI = 'https://lolidoll.github.io/ovo/index.html';

    if (!code || !client_id || !CLIENT_SECRET) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        // 交换授权码获取 access token
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: client_id,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            console.error('Discord token error:', error);
            return res.status(tokenResponse.status).json(error);
        }

        const tokenData = await tokenResponse.json();

        // 获取用户信息
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userResponse.ok) {
            const error = await userResponse.json();
            console.error('Discord user error:', error);
            return res.status(userResponse.status).json(error);
        }

        const userData = await userResponse.json();

        // 返回 token 和用户信息
        return res.status(200).json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            user: userData,
        });

    } catch (error) {
        console.error('Token exchange error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
