import { getMockResponse, handleMockMutation, MockHttpError } from './mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

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
  if (USE_MOCK_API) {
    if (method === 'GET') {
      const mock = getMockResponse(path);
      if (mock !== undefined) return mock as T;
    } else {
      try {
        const mock = handleMockMutation(path, method, body);
        if (mock !== undefined) return mock as T;
      } catch (err) {
        if (err instanceof MockHttpError) throw new ApiError(err.status, err.message);
        throw err;
      }
    }
  }

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && (data.message instanceof Array ? data.message.join(', ') : data.message)) ||
      response.statusText;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
