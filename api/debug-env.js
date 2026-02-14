/**
 * 调试端点 - 检查环境变量配置
 */
export default async function handler(req, res) {
  const env = {
    REDIS_URL: process.env.REDIS_URL ? '已配置' : '未配置',
    REDIS_TOKEN: process.env.REDIS_TOKEN ? '已配置' : '未配置',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? '已配置（前4位:' + process.env.DISCORD_CLIENT_SECRET.substring(0, 4) + '...）' : '未配置',
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({
    environment: env,
    timestamp: new Date().toISOString()
  });
}
