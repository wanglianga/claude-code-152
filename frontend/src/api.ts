const TOKEN_KEY = 'furn_token';
const USER_KEY = 'furn_user';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  phone?: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      data?.message
        ? Array.isArray(data.message)
          ? data.message.join('；')
          : data.message
        : `请求失败 (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
