import { config } from "./config";

export interface ApiErrorShape {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export async function request<TResponse>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", `Cannot reach backend at ${config.apiBaseUrl}`);
  }

  const raw = await response.text();
  const body = raw ? (JSON.parse(raw) as TResponse & ApiErrorShape) : ({} as TResponse & ApiErrorShape);
  if (!response.ok) {
    throw new ApiError(body.error?.code ?? "REQUEST_FAILED", body.error?.message ?? "Request failed");
  }

  return body;
}
