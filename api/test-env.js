/**
 * 环境变量测试 API
 * 用于诊断 VALID_KEYS 是否正确加载
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

  // 获取 VALID_KEYS 并返回信息
  const keysEnv = process.env.VALID_KEYS || '';
  const validKeys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  return res.status(200).json({
    VALID_KEYS_exists: !!process.env.VALID_KEYS,
    VALID_KEYS_length: keysEnv.length,
    validKeys_count: validKeys.length,
    first_10_keys: validKeys.slice(0, 10),
    test_key_exists: validKeys.includes('IKIOUl3pDukI')
  });
}
