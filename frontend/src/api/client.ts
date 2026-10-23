const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('axa_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body = options.body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, body });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { detail?: string | { msg?: string } };
      if (typeof data.detail === 'string') detail = data.detail;
      else if (data.detail?.msg) detail = data.detail.msg;
    } catch {
      // keep the default message
    }
    if (res.status === 401) {
      localStorage.removeItem('axa_token');
      localStorage.removeItem('axa_role');
      localStorage.removeItem('axa_full_name');
      localStorage.removeItem('axa_email');
      window.location.assign('/login');
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
