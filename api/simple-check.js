export default async function handler(req, res) {
  res.json({
    VALID_KEYS: process.env.VALID_KEYS ? 'EXISTS' : 'MISSING',
    value_length: process.env.VALID_KEYS?.length || 0,
    value_preview: process.env.VALID_KEYS?.substring(0, 100) || 'NULL',
    type: typeof process.env.VALID_KEYS
  });
}
