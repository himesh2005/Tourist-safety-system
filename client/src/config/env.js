export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS || ""
).trim();

export function toApiUrl(path = "") {
  if (!path) return API_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}
