module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'not allowed' });
  
  try {
    return res.status(200).json({
      ok: true,
      method: req.method,
      bodyType: typeof req.body,
      body: req.body,
      hasKey: !!process.env.FAST2SMS_KEY
    });
  } catch(e) {
    return res.status(500).json({ crashed: e.message });
  }
};