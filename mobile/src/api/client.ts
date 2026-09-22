// Thin fetch wrapper around the backend REST API.
// Base URL comes from EXPO_PUBLIC_API_URL (see .env.example) — Expo inlines any
// EXPO_PUBLIC_* variable into the JS bundle at build time.

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(
      `Could not reach the server at ${API_BASE_URL}. Check EXPO_PUBLIC_API_URL and your network connection.`,
      0
    );
  }

  const text = await response.text();
  const data = text.length > 0 ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string"
        ? (data as any).error
        : undefined) ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body, token }),
};
