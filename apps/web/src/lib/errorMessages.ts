import axios from "axios";

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

export function getFriendlyApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the server. Check your internet connection or make sure the backend is running.";
    }

    const backendMessage = String(error.response.data?.error?.message || error.message || "");
    const normalized = normalizeMessage(backendMessage);
    if (normalized.includes("quota") || normalized.includes("insufficient_quota") || normalized.includes("429")) {
      return "AI provider quota is exhausted. Try again later or top up the provider account.";
    }

    return backendMessage || "Request failed.";
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
    return "No microphone was found. Connect a microphone or choose the correct input device in system settings.";
  }

  if (normalized.includes("notreadableerror") || normalized.includes("device in use")) {
    return "The microphone is busy or unavailable. Close other apps using it and try again.";
  }

  return "Unable to access the microphone. Check permissions and your selected input device.";
}
