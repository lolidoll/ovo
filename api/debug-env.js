/**
 * 调试所有环境变量
 */

export default async function handler(req, res) {
  // 设置 CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // 列出所有包含 KEY 或 VALID 的环境变量
  const envVars = Object.keys(process.env)
    .filter(key => key.includes('KEY') || key.includes('VALID') || key.includes('REDIS'))
    .reduce((acc, key) => {
      acc[key] = process.env[key] ? '***SET***' : 'NOT_SET';
      return acc;
    }, {});

  return res.status(200).json({
    all_env_keys: envVars,
    VALID_KEYS_raw_length: process.env.VALID_KEYS?.length || 0,
    VALID_KEYS_first_50: process.env.VALID_KEYS?.substring(0, 50) || 'NOT_SET'
  });
}
