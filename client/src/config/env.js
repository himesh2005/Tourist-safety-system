export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://tourist-safety-system-backend.onrender.com";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x69CF417682ADA3b9caa92637B7C0a877D43dbcF9";

export function toApiUrl(path = "") {
  if (!path) return API_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}
