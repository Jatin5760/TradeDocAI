'use client';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5055' : '');

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('authToken') || '';
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function storeSession(token: string, user: unknown) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('justLoggedIn', 'true');
}

export function isJustLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('justLoggedIn') === 'true';
}

export function clearJustLoggedIn() {
  localStorage.removeItem('justLoggedIn');
}

export function clearSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('chat_history');
  localStorage.removeItem('justLoggedIn');
}

export function getUser(): { name?: string; email?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isAuthenticated') === 'true' && !!localStorage.getItem('authToken');
}
