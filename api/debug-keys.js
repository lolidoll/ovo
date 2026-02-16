import { Redis } from '@upstash/redis';

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;
  if (url && token) return new Redis({ url, token });
  const rawUrl = process.env.REDIS_URL;
  if (rawUrl && rawUrl.includes('rediss://')) {
    const match = rawUrl.match(/rediss:\/\/default:([^@]+)@([^:]+):\d+/);
    if (match) return new Redis({ url: `https://${match[2]}`, token: match[1] });
  }
  return new Redis({ url: rawUrl, token: process.env.REDIS_TOKEN });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { pwd, key } = req.query;
  if (pwd !== 'debug2026') {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const redis = getRedisClient();
    const validKeys = await redis.smembers('keys:valid');
    const issuedKeys = await redis.smembers('keys:issued');

    let keyDetail = null;
    if (key) {
      const inValid = await redis.sismember('keys:valid', key);
      const inIssued = await redis.sismember('keys:issued', key);
      const isUsed = await redis.get(`key:used:${key}`);
      keyDetail = {
        key,
        inValid: `${inValid} (${typeof inValid})`,
        inIssued: `${inIssued} (${typeof inIssued})`,
        isUsed: `${isUsed} (${typeof isUsed})`
      };
    }

    return res.status(200).json({
      envUsed: process.env.UPSTASH_REDIS_REST_URL ? 'UPSTASH_REDIS_REST_URL' : (process.env.UPSTASH_REDIS_URL ? 'UPSTASH_REDIS_URL' : 'REDIS_URL'),
      validCount: validKeys.length,
      validKeys,
      issuedCount: issuedKeys.length,
      issuedKeys,
      keyDetail
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
