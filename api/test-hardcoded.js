/**
 * 硬编码密钥测试 API
 * 临时用于测试，确认代码逻辑是否正确
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

// 硬编码的测试密钥列表
const TEST_KEYS = [
  'IKIOUl3pDukI',
  'cBpiInLeesKp',
  'GXO0qzdwa3K1',
  'vyEEDn9AvcEW',
  'xgUokRqcdlky'
];

export default async function handler(req, res) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: '缺少密钥参数' });

  const redis = getRedisClient();

  try {
    // 检查是否已使用
    const isUsed = await redis.get(`key:used:${key}`);
    if (isUsed === 'true') {
      return res.status(403).json({ error: '密钥已使用', code: 'KEY_ALREADY_USED' });
    }

    // 检查是否在硬编码列表中
    if (!TEST_KEYS.includes(key)) {
      return res.status(404).json({ 
        error: '密钥不存在',
        code: 'INVALID_KEY',
        note: '此API使用硬编码测试密钥',
        test_keys: TEST_KEYS
      });
    }

    // 标记为已使用
    await redis.set(`key:used:${key}`, 'true');
    
    return res.status(200).json({ 
      success: true,
      code: 'KEY_VALID',
      message: '密钥验证成功',
      note: '此API使用硬编码测试密钥'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: '服务器内部错误',
      code: 'SERVER_ERROR',
      message: error.message 
    });
  }
}
