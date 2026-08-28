const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  token?: string | null;
  body?: unknown;
  isFormData?: boolean;
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', token, body, isFormData }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        response.status,
        response.ok ? 'The backend returned an invalid response.' : `Backend request failed (${response.status}).`,
      );
    }
  }

  if (!response.ok) {
    const errorBody = data && typeof data === 'object' ? (data as { message?: string | string[] }) : null;
    const message =
      (errorBody?.message instanceof Array ? errorBody.message.join(', ') : errorBody?.message) ||
      response.statusText;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
