import { ApiError } from "./http";

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

export function getFriendlyApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return "Cannot reach the server. Check your internet connection or make sure the backend is running.";
    }

    const message = normalizeMessage(error.message);
    if (error.code === "REQUEST_FAILED" || error.code === "AI_PROVIDER_ERROR" || message.includes("quota") || message.includes("insufficient_quota") || message.includes("429")) {
      return "AI service quota is exhausted right now. Try again later or update the provider credits.";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
