/**
 * API base URL - sabhi pages yahi se API call karenge.
 * .env me VITE_API_URL set karo: localhost ya Railway dono me se koi bhi use kar sakte ho.
 */
// export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://mavie-backend-production.up.railway.app";
/**
 * Auth token get karke headers return karta hai (Bearer token)
 * @param {string} token - useAuthStore.getState().token
 */
export function getAuthHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * API request helper - auth header automatically add
 * @param {string} path - e.g. '/auth/login' or '/api/superadmin/companies'
 * @param {object} options - fetch options (method, body, headers extra)
 * @param {string} token - optional, from useAuthStore
 */
export async function apiRequest(path, options = {}, token = null) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = getAuthHeaders(token);
  if (options.headers) Object.assign(headers, options.headers);
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Token expired ya invalid — auto logout aur login page pe bhejo
    if (res.status === 401) {
      try {
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().logout();
      } catch (_) { }
      window.location.href = '/auth/login';
      return;
    }
    const err = new Error(data.message || data.error || `Request failed ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  // Backend usually sends { success: true, data: ... }. If response is raw array/object, wrap so res.data works everywhere.
  if (data != null && typeof data === 'object' && 'data' in data) return data;
  return { data };
}

export default { API_BASE_URL, getAuthHeaders, apiRequest };
