/**
 * 密钥管理 API
 * Vercel Serverless Function
 * 
 * 功能：
 * - 添加新密钥（需要管理员密码）
 * - 查看密钥使用统计
 * - 仅限管理员使用
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

// 管理员密码（从环境变量读取）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * 获取当前所有有效密钥
 */
function getValidKeys() {
  const keysEnv = process.env.VALID_KEYS || '';
  return keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

/**
 * 生成随机密钥
 */
function generateKey(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

  // 验证管理员密码
  const { password } = req.body || {};
  
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ 
      error: '管理员密码未配置',
      message: '请在 Vercel 环境变量中设置 ADMIN_PASSWORD'
    });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ 
      error: '未授权',
      message: '管理员密码错误'
    });
  }

  // 根据请求方法处理
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

/**
 * GET - 查看密钥统计
 */
async function handleGet(req, res) {
  try {
    const validKeys = getValidKeys();
    const usageLog = await redis.lrange('key:usage:log', 0, 99);
    
    // 统计已使用密钥数量
    let usedCount = 0;
    const usedKeysDetails = [];
    
    for (const key of validKeys) {
      const isUsed = await redis.get(`key:used:${key}`);
      if (isUsed === 'true') {
        usedCount++;
        const info = await redis.get(`key:info:${key}`);
        if (info) {
          usedKeysDetails.push({
            key: key.substring(0, 4) + '***',
            ...JSON.parse(info)
          });
        }
      }
    }

    return res.status(200).json({
      totalKeys: validKeys.length,
      unusedKeys: validKeys.length - usedCount,
      usedKeys: usedCount,
      usageLog: usageLog.map(JSON.parse),
      usedKeysDetails: usedKeysDetails.slice(0, 10) // 只返回最近 10 条
    });

  } catch (error) {
    console.error('获取密钥统计错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    });
  }
}

/**
 * POST - 添加新密钥
 */
async function handlePost(req, res) {
  try {
    const { action, key } = req.body;

    if (action === 'add') {
      // 添加指定密钥
      if (!key || key.length < 4) {
        return res.status(400).json({ 
          error: '无效的密钥',
          message: '密钥长度至少为 4 个字符'
        });
      }

      const validKeys = getValidKeys();
      
      if (validKeys.includes(key)) {
        return res.status(400).json({ 
          error: '密钥已存在',
          message: '该密钥已在列表中'
        });
      }

      // 新密钥需要添加到环境变量 VALID_KEYS 中
      // 注意：Vercel 环境变量需要通过 Dashboard 或 API 手动更新
      return res.status(200).json({
        success: true,
        message: '密钥已生成，请手动更新 Vercel 环境变量 VALID_KEYS',
        key: key,
        instructions: '请将此密钥添加到 Vercel Dashboard -> Settings -> Environment Variables -> VALID_KEYS'
      });

    } else if (action === 'generate') {
      // 生成新密钥
      const newKey = generateKey(12);
      const validKeys = getValidKeys();
      
      return res.status(200).json({
        success: true,
        key: newKey,
        message: '新密钥已生成',
        currentKeysCount: validKeys.length,
        instructions: '请将此密钥添加到 Vercel Dashboard -> Settings -> Environment Variables -> VALID_KEYS（用逗号分隔）'
      });

    } else if (action === 'reset_usage') {
      // 重置指定密钥的使用状态（仅用于特殊情况）
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: '缺少密钥参数' });
      }

      await redis.del(`key:used:${key}`);
      await redis.del(`key:info:${key}`);

      return res.status(200).json({
        success: true,
        message: '密钥使用状态已重置'
      });

    } else {
      return res.status(400).json({ 
        error: '无效的操作',
        message: '支持的操作: add, generate, reset_usage'
      });
    }

  } catch (error) {
    console.error('管理密钥错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    });
  }
}
