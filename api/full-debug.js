/**
 * 完整环境变量调试
 */

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

  // 获取所有环境变量
  const allEnv = {};
  for (const key of Object.keys(process.env)) {
    if (key.includes('VALID') || key.includes('REDIS') || key.includes('KEY')) {
      const val = process.env[key];
      allEnv[key] = val ? `${val.substring(0, 50)}...` : 'NOT_SET';
    }
  }

  // 详细检查 VALID_KEYS
  const vk = process.env.VALID_KEYS;
  
  return res.status(200).json({
    raw_VALID_KEYS: vk || 'NOT_SET',
    length: vk?.length || 0,
    type: typeof vk,
    isEmpty: vk === '',
    first_100: vk?.substring(0, 100) || 'NOT_SET',
    contains_test_key: vk?.includes('IKIOUl3pDukI'),
    all_related_envs: allEnv
  });
}
