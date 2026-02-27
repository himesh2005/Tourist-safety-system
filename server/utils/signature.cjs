const { ethers } = require("ethers");

function normalizeAddress(value) {
  try {
    return ethers.getAddress(String(value || "").trim());
  } catch {
    return "";
  }
}

function stableCopy(value) {
  if (Array.isArray(value)) {
    return value.map(stableCopy);
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const current = value[key];
      if (typeof current === "undefined") continue;
      out[key] = stableCopy(current);
    }
    return out;
  }

  return value;
}

function canonicalizeProfile(profileObject) {
  return JSON.stringify(stableCopy(profileObject || {}));
}

function hashCanonicalProfile(profileObject) {
  const canonical = canonicalizeProfile(profileObject);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

async function signProfile(profileObject, wallet) {
  try {
    if (!wallet) throw new Error("Missing signing wallet");
    const hash = hashCanonicalProfile(profileObject);
    return await wallet.signMessage(ethers.getBytes(hash));
  } catch (err) {
    throw new Error(`signProfile failed: ${String(err?.message || err)}`);
  }
}

async function verifyProfile(profileObject, signature, publicKey) {
  try {
    if (!profileObject || !signature || !publicKey) return false;
    const hash = hashCanonicalProfile(profileObject);
    const recovered = ethers.verifyMessage(ethers.getBytes(hash), signature);
    const recoveredAddress = normalizeAddress(recovered);
    const expectedAddress = normalizeAddress(publicKey);
    if (!recoveredAddress || !expectedAddress) return false;
    return recoveredAddress === expectedAddress;
  } catch {
    return false;
  }
}

module.exports = {
  signProfile,
  verifyProfile
};
