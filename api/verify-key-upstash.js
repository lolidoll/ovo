import { Redis } from '@upstash/redis';

/**
 * 解析 Upstash Redis 连接 URL
 * 支持 rediss:// 和 https:// 格式
 */
function parseRedisUrl(url) {
  if (!url) return { url: undefined, token: undefined };

  // rediss://default:TOKEN@HOST:6379 格式
  if (url.includes('rediss://')) {
    const match = url.match(/rediss:\/\/default:([^@]+)@([^:]+):\d+/);
    if (match) {
      return { url: `https://${match[2]}`, token: match[1] };
    }
  }

  // https:// 格式，token 可能在 URL 中或单独配置
  return { url, token: process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_TOKEN };
}

/**
 * 延迟初始化 Upstash Redis 客户端
 * 优先使用 UPSTASH_REDIS_URL/TOKEN，回退到 REDIS_URL（兼容 rediss:// 格式）
 */
function getRedisClient() {
  // 优先使用专用的 UPSTASH 环境变量
  if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }
  // 回退到 REDIS_URL（支持 rediss:// 格式）
  const { url, token } = parseRedisUrl(process.env.REDIS_URL);
  return new Redis({ url, token });
}

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
    const redis = getRedisClient();

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
