module.exports = (req, res) => {
  res
    .status(200)
    .json({ ok: true, key: process.env.FAST2SMS_KEY ? "set" : "missing" });
};
