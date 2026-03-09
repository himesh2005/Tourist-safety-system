const env = import.meta.env ?? {};

function clean(value) {
  return String(value ?? "").trim();
}

function cleanUrl(value) {
  return clean(value).replace(/\/+$/, "");
}

const API_BASE_URL = cleanUrl(
  env.NEXT_PUBLIC_API_URL || env.VITE_API_URL || ""
);

const CONTRACT_ADDRESS = clean(
  env.NEXT_PUBLIC_CONTRACT_ADDRESS || env.VITE_CONTRACT_ADDRESS || ""
);

function toApiUrl(path = "") {
  const rawPath = clean(path);
  if (!rawPath) return API_BASE_URL;

  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  if (!API_BASE_URL) return rawPath;

  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export { API_BASE_URL, CONTRACT_ADDRESS, toApiUrl };
