export default async function handler(req, res) {
  const { id } = req.query;
  const RAILWAY_URL =
    process.env.VITE_API_URL ||
    "https://tourist-safety-system-production.up.railway.app";

  try {
    const response = await fetch(`${RAILWAY_URL}/api/verify/${id}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Unable to reach server" });
  }
}
