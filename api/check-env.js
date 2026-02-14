export default async function handler(req, res) {
  const all = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (key.includes('VALID') || key.includes('REDIS') || key.includes('KEY')) {
      all[key] = val ? 'SET' : 'UNSET';
    }
  }
  
  res.status(200).json(all);
}
