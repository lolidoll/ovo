import { Redis } from '@upstash/redis';

// 这是修复后的正确连接方式，和你的 Bot 完全一致
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export default async function handler(req, res) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { key } = req.query;
  if (!key) {
    return res.status(400).json({
      error: '缺少密钥参数',
      code: 'MISSING_KEY'
    });
  }

  try {
    // 1. 检查是否已使用
    const isUsed = await redis.get(`key:used:${key}`);
    if (isUsed === 'true') {
      return res.status(403).json({
        error: '密钥已使用',
        code: 'KEY_ALREADY_USED',
        message: '该密钥已被使用，已永久失效'
      });
    }

    // 2. 检查是否在有效库
    const isValid = await redis.sismember('keys:valid', key);
    if (!isValid) {
      return res.status(404).json({
        error: '密钥不存在',
        code: 'INVALID_KEY',
        message: '无效的密钥，请检查是否正确'
      });
    }

    // 3. 验证成功，标记使用
    const useInfo = {
      usedAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    await redis.set(`key:used:${key}`, 'true');
    await redis.srem('keys:valid', key);
    await redis.set(`key:info:${key}`, JSON.stringify(useInfo));
    await redis.lpush('key:usage:log', JSON.stringify({
      key: key.substring(0, 4) + '***',
      usedAt: useInfo.usedAt,
      ip: useInfo.ip
    }));
    await redis.ltrim('key:usage:log', 0, 99);

    return res.status(200).json({
      success: true,
      code: 'KEY_VALID',
      message: '密钥验证成功'
    });

  } catch (error) {
    console.error('密钥验证错误:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      code: 'SERVER_ERROR',
      message: error.message
    });
  }
}
