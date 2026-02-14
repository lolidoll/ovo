/**
 * 一次性密钥验证 API
 * Vercel Serverless Function
 */

import { Redis } from '@upstash/redis';

// 初始化 Upstash Redis 客户端
const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export default async function handler(req, res) {
  // 设置 CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    return res.status(400).json({ error: '缺少密钥参数' });
  }

  try {
    // 检查密钥状态
    const status = await redis.get(key);

    // 密钥不存在
    if (status === null) {
      return res.status(404).json({ error: '密钥不存在' });
    }

    // 密钥已使用
    if (status === 'true') {
      return res.status(403).json({ error: '密钥已使用' });
    }

    // 密钥有效，标记为已使用
    await redis.set(key, 'true');

    return res.status(200).json({ 
      success: true,
      message: '密钥验证成功'
    });

  } catch (error) {
    console.error('密钥验证错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    });
  }
}
