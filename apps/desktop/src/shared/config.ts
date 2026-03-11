const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082";
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8082";

export const config = {
  apiBaseUrl,
  wsBaseUrl
};

export type Mode = "interview" | "practice";
