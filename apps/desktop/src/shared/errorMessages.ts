import { ApiError } from "./http";

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

export function getFriendlyApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return "Cannot reach the server. Check your internet connection or confirm the backend is running.";
    }

    const message = normalizeMessage(error.message);
    if (message.includes("quota") || message.includes("insufficient_quota") || message.includes("429")) {
      return "AI provider quota is exhausted. Try again later or top up the provider account.";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function getFriendlyMicErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  const normalized = normalizeMessage(raw);

  if (normalized.includes("notallowederror") || normalized.includes("permission denied") || normalized.includes("denied")) {
    return "Microphone permission was denied. Allow microphone access and try again.";
  }

  if (normalized.includes("notfounderror") || normalized.includes("no audio")) {
    return "No microphone was found. Connect a microphone or select the correct input device in system settings.";
  }

  if (normalized.includes("notreadableerror") || normalized.includes("device in use")) {
    return "The microphone is busy or unavailable. Close other apps using it and try again.";
  }

  return "Unable to access the microphone. Check permissions and your selected input device.";
}

export function getFriendlyScreenCaptureErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  const normalized = normalizeMessage(raw);

  if (normalized.includes("notallowederror") || normalized.includes("permission denied") || normalized.includes("denied")) {
    return "Screen capture permission was denied. Allow screen sharing and try again.";
  }

  if (normalized.includes("aborterror")) {
    return "Screen capture was cancelled before it started.";
  }

  return "Unable to start screen capture. Check permissions and try again.";
}
