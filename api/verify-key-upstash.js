/**
 * 密钥验证 API - 使用 Upstash Redis 存储
 * Vercel Serverless Function
 * 
 * 功能：
 * 1. 从 Upstash Redis 的 keys:valid 列表读取有效密钥
 * 2. 验证后标记为已使用
 */

import { Redis } from '@upstash/redis';

function parseRedisUrl(url) {
  if (!url) return { url: undefined, token: undefined };
  if (url.includes('rediss://')) {
    const match = url.match(/rediss:\/\/default:([^@]+)@([^:]+):\d+/);
    if (match) {
      return { url: `https://${match[2]}`, token: match[1] };
    }
  }
  return { url, token: process.env.REDIS_TOKEN };
}

function getRedisClient() {
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
    
    // 1. 检查 Redis 中是否已使用
    const isUsed = await redis.get(`key:used:${key}`);
    if (isUsed === 'true') {
      return res.status(403).json({ 
        error: '密钥已使用',
        code: 'KEY_ALREADY_USED',
        message: '该密钥已被使用，已永久失效'
      });
    }

    // 2. 从 Upstash Redis 的 keys:valid 列表检查密钥
    // keys:valid 是一个 SET，包含所有有效密钥
    const isValid = await redis.sismember('keys:valid', key);
    
    if (!isValid) {
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
    
    // 先标记已使用（永久存储）
    await redis.set(`key:used:${key}`, 'true');
    // 从有效列表中移除，防止再次使用
    await redis.srem('keys:valid', key);
    // 从pending中删除
    await redis.srem('pending_keys', key);
    // 记录使用信息（永久存储）
    await redis.set(`key:info:${key}`, JSON.stringify(useInfo));
    
    // 记录到使用日志
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

/**
 * ============ 使用说明 ============
 * 
 * 1. 登录 Upstash Data Browser 或 Console
 * 2. 创建一个 SET: keys:valid
 * 3. 添加所有密钥（逗号分隔或逐个添加）
 *    例如：SADD keys:valid "IKIOUl3pDukI" "cBpiInLeesKp" "GXO0qzdwa3K1" ...
 * 
 * 4. 测试 API：
 *    curl "https://ovo-psi.vercel.app/api/verify-key-upstash?key=IKIOUl3pDukI"
 */
