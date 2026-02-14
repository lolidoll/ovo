/**
 * 密钥验证 API
 * Vercel Serverless Function
 * 
 * 功能：
 * 1. 从环境变量读取有效密钥列表
 * 2. 使用 Upstash Redis 记录已使用密钥
 * 3. 密钥只能用一次
 */

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
  return { url, token: process.env.REDIS_TOKEN };
}

/**
 * 初始化 Upstash Redis 客户端（延迟初始化）
 */
function getRedisClient() {
  const { url, token } = parseRedisUrl(process.env.REDIS_URL);
  return new Redis({ url, token });
}

/**
 * 从环境变量获取有效密钥列表
 * 环境变量格式：VALID_KEYS=key1,key2,key3,key4
 */
function getValidKeys() {
  const keysEnv = process.env.VALID_KEYS || '';
  return keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

/**
 * 验证密钥是否在有效列表中
 */
function isValidKey(key, validKeys) {
  return validKeys.includes(key);
}

export default async function handler(req, res) {
  // 设置 CORS 头
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

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 从 query 参数获取 key
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ 
      error: '缺少密钥参数',
      code: 'MISSING_KEY'
    });
  }

  try {
    // 延迟初始化 Redis 客户端
    const redis = getRedisClient();
    
    // 1. 检查 Redis 中是否已使用
    const isUsed = await redis.get(`key:used:${key}`);
    
    if (isUsed === 'true') {
      return res.status(403).json({ 
        error: '密钥已使用',
        code: 'KEY_ALREADY_USED',
        message: '该密钥已被使用，已永久失效'
      });
    }

    // 2. 检查密钥是否在有效列表中
    const validKeys = getValidKeys();
    
    if (!isValidKey(key, validKeys)) {
      return res.status(404).json({ 
        error: '密钥不存在',
        code: 'INVALID_KEY',
        message: '无效的密钥，请检查是否正确'
      });
    }

    // 3. 密钥有效，标记为已使用
    const useInfo = {
      usedAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    await redis.set(`key:used:${key}`, 'true');
    await redis.set(`key:info:${key}`, JSON.stringify(useInfo));
    
    // 记录到使用日志列表
    await redis.lpush('key:usage:log', JSON.stringify({
      key: key.substring(0, 4) + '***', // 部分隐藏
      usedAt: useInfo.usedAt,
      ip: useInfo.ip
    }));
    
    // 只保留最近 500 条日志
    await redis.ltrim('key:usage:log', 0, 499);

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

/**
 * ============ 你需要做的操作 ============
 * 
 * 1. 在 Vercel 项目中配置环境变量：
 *    - REDIS_URL: 你的 Upstash Redis URL
 *    - REDIS_TOKEN: 你的 Upstash Redis Token
 *    - VALID_KEYS: 逗号分隔的有效密钥，例如：abc123,xyz789,testkey,secret007
 * 
 * 2. 部署到 Vercel：
 *    git add .
 *    git commit -m "Add key verification API"
 *    git push
 *    Vercel 会自动部署
 * 
 * 3. 环境变量配置路径：
 *    Vercel Dashboard → 你的项目 → Settings → Environment Variables
 *    添加以下变量：
 *    - Name: VALID_KEYS, Value: abc123,xyz789,testkey（用逗号分隔）
 *    - Name: REDIS_URL, Value: https://xxx.upstash.io
 *    - Name: REDIS_TOKEN, Value: AXXxxx...
 * 
 * 4. 验证 API：
 *    访问 https://ovo-psi.vercel.app/api/verify-key?key=你的密钥
 */
