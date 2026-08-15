export const getApiBase = () => import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

/**
 * Fetch with optional retries (helps when the hosted API cold-starts).
 */
export async function apiFetch(path, options = {}, { retries = 2 } = {}) {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.status === 401) {
        onUnauthorized?.();
        return res;
      }

      if (res.status >= 500 && attempt < retries) {
        await sleep(800 * (attempt + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(800 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
