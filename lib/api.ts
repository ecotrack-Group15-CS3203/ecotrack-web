// Same-origin BFF proxy (app/api/proxy/[...path]/route.ts). The browser's
// HttpOnly session cookie rides along automatically because this is same
// origin; the proxy attaches the real Authorization header server-side.
const API_URL = '/api/proxy';

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
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
