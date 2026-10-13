// Vercel Serverless Function — يخزّن النتيجة في Upstash Redis (من Vercel Marketplace)
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const DEFAULT = {
  a: { name: 'الأحمر', color: '#d0202e', score: 0 },
  b: { name: 'الأزرق', color: '#1538d8', score: 0 },
};

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmd),
  });
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST') {
      if (req.headers['x-password'] !== process.env.CONTROL_PASSWORD)
        return res.status(401).json({ error: 'wrong password' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await redis(['SET', 'scoreboard', JSON.stringify(body)]);
      return res.status(200).json(body);
    }
    const raw = await redis(['GET', 'scoreboard']);
    res.status(200).json(raw ? JSON.parse(raw) : DEFAULT);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
