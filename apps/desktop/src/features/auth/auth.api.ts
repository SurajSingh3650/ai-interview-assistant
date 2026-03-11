import { request } from "../../shared/http";
import type { LoginResult } from "./types";

interface ApiEnvelope<T> {
  data: T;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await request<ApiEnvelope<LoginResult>>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return response.data;
}

export async function createRealtimeToken(accessToken: string): Promise<string> {
  const response = await request<ApiEnvelope<{ token: string }>>(
    "/v1/auth/realtime/token",
    { method: "POST", body: JSON.stringify({}) },
    accessToken
  );
  return response.data.token;
}

export async function logout(accessToken: string): Promise<void> {
  await request<ApiEnvelope<{ success: boolean }>>(
    "/v1/auth/logout",
    { method: "POST", body: JSON.stringify({}) },
    accessToken
  );
}
