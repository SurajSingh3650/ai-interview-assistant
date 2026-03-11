import axios from "axios";
import { APP_CONFIG } from "./config";
import { getCookie } from "./cookies";

export const apiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getCookie("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
