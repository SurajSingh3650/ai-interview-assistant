import { request } from "../../shared/http";
import type { ApiEnvelope, LoginResponse, RegisterResponse } from "../../shared/types";

export async function login(email: string, password: string) {
  const response = await request<ApiEnvelope<LoginResponse>>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return response.data;
}

export async function register(email: string, password: string) {
  const response = await request<ApiEnvelope<RegisterResponse>>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return response.data;
}

export async function getRealtimeToken(accessToken: string) {
  const response = await request<ApiEnvelope<{ token: string }>>(
    "/v1/auth/realtime/token",
    { method: "POST", body: JSON.stringify({}) },
    accessToken
  );
  return response.data.token;
}

export async function logout(accessToken: string) {
  await request<ApiEnvelope<{ success: boolean }>>(
    "/v1/auth/logout",
    { method: "POST", body: JSON.stringify({}) },
    accessToken
  );
}
