import { config } from "./config";
import type { ApiErrorResponse } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", `Cannot reach backend at ${config.apiBaseUrl}`);
  }

  const raw = await response.text();
  let body: (T & ApiErrorResponse) | null = null;
  try {
    body = raw ? (JSON.parse(raw) as T & ApiErrorResponse) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? "REQUEST_FAILED", body?.error?.message ?? "Request failed");
  }

  return body as T;
}
