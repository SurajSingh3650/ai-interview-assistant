import { apiClient } from "@/lib/axios";
import { sanitizeInput } from "@/lib/sanitize";
import type { ApiEnvelope, LoginResponse } from "./types";

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>("/v1/auth/login", {
    email: sanitizeInput(email.toLowerCase()),
    password: sanitizeInput(password)
  });
  return response.data.data;
}

export async function registerUser(email: string, password: string): Promise<void> {
  await apiClient.post("/v1/auth/register", {
    email: sanitizeInput(email.toLowerCase()),
    password: sanitizeInput(password)
  });
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/v1/auth/logout", {});
}
