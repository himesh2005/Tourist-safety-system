module.exports = async (req, res) => {
  const { id } = req.query;
  const RAILWAY_URL =
    process.env.VITE_API_URL ||
    "https://tourist-safety-system-production.up.railway.app";
  const https = require("https");
  const url = `${RAILWAY_URL}/api/verify/${id}`;

  return new Promise((resolve) => {
    https
      .get(url, (response) => {
        let data = "";
        response.on("data", (c) => (data += c));
        response.on("end", () => {
          try {
            res.status(200).json(JSON.parse(data));
          } catch (e) {
            res.status(500).json({ error: "Parse error", raw: data });
          }
          resolve();
        });
      })
      .on("error", (e) => {
        res.status(500).json({ error: e.message });
        resolve();
      });
  });
};
