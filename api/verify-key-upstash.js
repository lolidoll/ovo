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
    console.log(`密钥使用检查: key=${key}, isUsed=${isUsed}(${typeof isUsed})`);
    if (isUsed === 'true' || isUsed === true || isUsed === 1) {
      return res.status(403).json({
        error: '密钥已使用',
        code: 'KEY_ALREADY_USED',
        message: '该密钥已被使用，已永久失效'
      });
    }

    // 2. 检查密钥是否有效
    //    密钥可能在 keys:valid（未被领取）或 keys:issued（已被Bot发出但未使用）
    const inValidRaw = await redis.sismember('keys:valid', key);
    const inIssuedRaw = await redis.sismember('keys:issued', key);
    
    // sismember 可能返回 0/1(数字)、true/false(布尔)、"0"/"1"(字符串)，统一处理
    const inValid = inValidRaw === 1 || inValidRaw === true || inValidRaw === '1';
    const inIssued = inIssuedRaw === 1 || inIssuedRaw === true || inIssuedRaw === '1';
    
    console.log(`密钥检查: key=${key}, inValidRaw=${inValidRaw}(${typeof inValidRaw}), inIssuedRaw=${inIssuedRaw}(${typeof inIssuedRaw}), inValid=${inValid}, inIssued=${inIssued}`);
    
    if (!inValid && !inIssued) {
      return res.status(404).json({
        error: '密钥不存在',
        code: 'INVALID_KEY',
        message: '无效的密钥，请检查是否正确'
      });
    }

    // 3. 验证成功，标记使用
    const rawUA = req.headers['user-agent'] || 'unknown';
    
    // 解析 User-Agent 为详细设备信息
    const parseUA = (ua) => {
      let os = 'unknown', browser = 'unknown', device = 'unknown';
      
      // 操作系统
      if (/iPhone/.test(ua)) { os = 'iOS ' + (ua.match(/iPhone OS (\d+[_\.]\d+)/)?.[1]?.replace('_', '.') || ''); device = 'iPhone'; }
      else if (/iPad/.test(ua)) { os = 'iPadOS ' + (ua.match(/CPU OS (\d+[_\.]\d+)/)?.[1]?.replace('_', '.') || ''); device = 'iPad'; }
      else if (/Android/.test(ua)) { os = 'Android ' + (ua.match(/Android (\d+[\.\d]*)/)?.[1] || ''); device = ua.match(/;\s*([^;)]+)\s*Build/)?.[1]?.trim() || 'Android Device'; }
      else if (/Windows NT/.test(ua)) { const v = ua.match(/Windows NT (\d+\.\d+)/)?.[1]; os = v === '10.0' ? 'Windows 10/11' : 'Windows ' + (v || ''); device = 'PC'; }
      else if (/Mac OS X/.test(ua)) { os = 'macOS ' + (ua.match(/Mac OS X (\d+[_\.]\d+)/)?.[1]?.replace(/_/g, '.') || ''); device = 'Mac'; }
      else if (/Linux/.test(ua)) { os = 'Linux'; device = 'PC'; }
      
      // 浏览器
      if (/MicroMessenger/.test(ua)) browser = '微信 ' + (ua.match(/MicroMessenger\/([\d.]+)/)?.[1] || '');
      else if (/QQ\//.test(ua)) browser = 'QQ浏览器';
      else if (/Edg\//.test(ua)) browser = 'Edge ' + (ua.match(/Edg\/([\d.]+)/)?.[1] || '');
      else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)?.[1] || '');
      else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari ' + (ua.match(/Version\/([\d.]+)/)?.[1] || '');
      else if (/Firefox\//.test(ua)) browser = 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)?.[1] || '');
      
      return { os: os.trim(), browser: browser.trim(), device: device.trim() };
    };
    
    const parsed = parseUA(rawUA);
    const useInfo = {
      usedAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      userAgent: rawUA,
      os: parsed.os,
      browser: parsed.browser,
      device: parsed.device
    };

    await redis.set(`key:used:${key}`, 'true');
    await redis.srem('keys:valid', key);
    await redis.srem('keys:issued', key);
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
