const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LOG_PATH = path.join(__dirname, "..", "verificationLogs.json");

function randomToken(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function readLogs() {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

async function appendVerificationLog(input) {
  const verificationId = `VER-${randomToken(10)}`;
  const entry = {
    verificationId,
    blockchainId: String(input?.blockchainId || "UNKNOWN"),
    timestamp: String(input?.timestamp || new Date().toISOString()),
    ipAddress: String(input?.ipAddress || "unknown"),
    signatureValid: Boolean(input?.signatureValid),
    blockchainMatched: Boolean(input?.blockchainMatched),
    finalStatus: input?.finalStatus === "VALID" ? "VALID" : "INVALID"
  };

  try {
    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);
  } catch {}

  return verificationId;
}

module.exports = {
  appendVerificationLog
};
