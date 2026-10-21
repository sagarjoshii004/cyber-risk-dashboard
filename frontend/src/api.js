const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const readToken = () => localStorage.getItem('crd_token');

export async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Request failed');
  return payload;
}

export async function signIn(email, password) {
  const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem('crd_token', data.token);
  localStorage.setItem('crd_user', JSON.stringify(data.user));
  return data.user;
}
export async function signUp(name, email, password) {
  const data = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  localStorage.setItem('crd_token', data.token);
  localStorage.setItem('crd_user', JSON.stringify(data.user));
  return data.user;
}
export function clearSession() {
  localStorage.removeItem('crd_token');
  localStorage.removeItem('crd_user');
}
