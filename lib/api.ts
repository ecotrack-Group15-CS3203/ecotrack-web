const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

// ApiError - Custom error class for API failures with HTTP status code
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
// The apiFetch function is responsible for making HTTP requests to the backend API. 
// It takes a path, HTTP method, optional authentication token, request body, and a flag 
// indicating if the body is FormData. 
// It constructs the request headers, including the Authorization header if a token is provided, 
// and sets the Content-Type to application/json for JSON bodies. 
// The function uses fetch to send the request to the backend and processes the response. 
// If the response is not OK, it throws an ApiError with the status code and message from the backend. 
// If successful, it returns the parsed JSON data.
// apiFetch() - Makes authenticated HTTP requests to the backend with automatic Bearer token injection
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

// absoluteUrl() - Converts relative paths to absolute URLs by prepending the backend API base URL
export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
/* The API utility flow is responsible for connecting the Next.js frontend to the backend. First, API_URL gets the backend URL from NEXT_PUBLIC_API_URL, or uses http://localhost:3001 as the default. The main function, apiFetch(), receives the API path, HTTP method, authentication token, and optional body. If a token exists, it adds it to the request as Authorization: Bearer <token>, and if JSON data is being sent, it adds the Content-Type: application/json header. It then uses fetch() to send the request to ${API_URL}${path}. The response is converted to text and then parsed as JSON. If the backend returns an error status, ApiError is thrown with the HTTP status and backend error message, allowing pages to display errors using ErrorBanner. If the request succeeds, the parsed data is returned to the calling page. Finally, absoluteUrl() converts relative backend paths, such as image URLs, into complete URLs by adding the API_URL.*/