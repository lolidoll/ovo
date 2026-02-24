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
  // 兼容多种环境变量命名：UPSTASH_REDIS_REST_URL 或 UPSTASH_REDIS_URL
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

  if (url && token) {
    console.log(`Redis连接: 使用 UPSTASH url=${url.substring(0, 30)}...`);
    return new Redis({ url, token });
  }
  // 回退到 REDIS_URL（支持 rediss:// 格式）
  const parsed = parseRedisUrl(process.env.REDIS_URL);
  console.log(`Redis连接: 回退到 REDIS_URL, 解析后 url=${parsed.url?.substring(0, 30)}...`);
  return new Redis({ url: parsed.url, token: parsed.token });
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

  // 支持 GET 和 POST 方法
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 从 query 或 body 获取参数
  const { key, discord_id } = req.method === 'GET' ? req.query : req.body;
  
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
    console.log(`密钥使用检查: key=${key}, isUsed=${isUsed}(${typeof isUsed})`);
    if (isUsed === 'true' || isUsed === true || isUsed === 1) {
      return res.status(403).json({
        error: '密钥已使用',
        code: 'KEY_ALREADY_USED',
        message: '该密钥已被使用，已永久失效'
      });
    }

    // 2. 检查密钥是否有效
    const inValidRaw = await redis.sismember('keys:valid', key);
    const inIssuedRaw = await redis.sismember('keys:issued', key);
    
    const inValid = inValidRaw === 1 || inValidRaw === true || inValidRaw === '1';
    const inIssued = inIssuedRaw === 1 || inIssuedRaw === true || inIssuedRaw === '1';
    
    console.log(`密钥检查: key=${key}, inValid=${inValid}, inIssued=${inIssued}`);
    
    if (!inValid && !inIssued) {
      return res.status(404).json({
        error: '密钥不存在',
        code: 'INVALID_KEY',
        message: '无效的密钥，请检查是否正确'
      });
    }

    // 3. ✅ 新增：检查Discord账号绑定验证
    // 获取密钥的owner信息
    const ownerData = await redis.get(`key:owner:${key}`);
    if (ownerData) {
      try {
        const owner = typeof ownerData === 'string' ? JSON.parse(ownerData) : ownerData;
        const ownerDiscordId = owner.discordId || owner.uid;
        
        // 如果前端传了discord_id，进行绑定验证
        if (discord_id && discord_id !== ownerDiscordId) {
          console.error(`❌ Discord账号不匹配: 密钥owner=${ownerDiscordId}, 验证用户=${discord_id}`);
          return res.status(403).json({
            error: '密钥绑定的Discord账号不匹配',
            code: 'DISCORD_MISMATCH',
            message: `此密钥仅限于Discord账号 ${ownerDiscordId.substring(0, 8)}... 使用`,
            discord_error: true
          });
        }
        
        // 记录owner信息用于后续使用日志
        console.log(`✅ Discord账号验证通过: owner=${ownerDiscordId}`);
      } catch (e) {
        console.error('owner数据解析错误:', e);
      }
    }

    // 4. 验证成功，标记使用
    const useInfo = {
      usedAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      discordId: discord_id  // 记录验证时的Discord ID
    };

    await redis.set(`key:used:${key}`, 'true');
    await redis.srem('keys:valid', key);
    await redis.srem('keys:issued', key);
    await redis.set(`key:info:${key}`, JSON.stringify(useInfo));
    await redis.lpush('key:usage:log', JSON.stringify({
      key: key.substring(0, 4) + '***',
      usedAt: useInfo.usedAt,
      ip: useInfo.ip,
      discordId: discord_id
    }));
    await redis.ltrim('key:usage:log', 0, 99);

    return res.status(200).json({
      valid: true,
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
