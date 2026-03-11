import { useEffect, useState } from "react";

type SpeechLib = typeof import("expo-speech-recognition");
let cachedSpeechLib: SpeechLib | null | undefined;

function loadSpeechLib(): SpeechLib | null {
  if (cachedSpeechLib !== undefined) {
    return cachedSpeechLib;
  }

  try {
    cachedSpeechLib = require("expo-speech-recognition") as SpeechLib;
  } catch {
    cachedSpeechLib = null;
  }

  return cachedSpeechLib;
}

interface UseSpeechToTextOptions {
  onFinalTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
}

type PrerequisiteStatus =
  | "ok"
  | "module_unavailable"
  | "service_unavailable"
  | "permission_denied"
  | "permission_blocked"
  | "runtime_error";

export function useSpeechToText({ onFinalTranscript, onPartialTranscript }: UseSpeechToTextOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prerequisiteStatus, setPrerequisiteStatus] = useState<PrerequisiteStatus>("ok");
  const [prerequisiteMessage, setPrerequisiteMessage] = useState<string | null>(null);

  function setPrerequisite(status: PrerequisiteStatus, message: string | null) {
    setPrerequisiteStatus(status);
    setPrerequisiteMessage(message);
  }

  useEffect(() => {
    const speechLib = loadSpeechLib();
    if (!speechLib) {
      setSupported(false);
      setPrerequisite(
        "module_unavailable",
        "Speech module is unavailable (likely Expo Go). Use a dev build for microphone STT."
      );
      return;
    }

    const recognitionAvailable = speechLib.isRecognitionAvailable();
    setSupported(recognitionAvailable);
    if (!recognitionAvailable) {
      setPrerequisite(
        "service_unavailable",
        "Speech recognition service is not available on this device. Enable voice services and microphone access."
      );
    } else {
      setPrerequisite("ok", null);
    }

    const startSub = speechLib.addSpeechRecognitionListener("start", () => {
      setListening(true);
      setError(null);
      setPrerequisite("ok", null);
    });

    const endSub = speechLib.addSpeechRecognitionListener("end", () => {
      setListening(false);
      setInterimText("");
    });

    const errorSub = speechLib.addSpeechRecognitionListener("error", (event) => {
      setListening(false);
      const runtimeMessage = String(event.message || event.error || "Speech recognition failed");
      const normalized = runtimeMessage.toLowerCase();
      const friendlyMessage = normalized.includes("permission")
        ? "Microphone permission was denied. Allow microphone and speech access in device settings."
        : normalized.includes("network")
          ? "Speech recognition could not reach the service. Check your internet connection and try again."
          : "Speech recognition failed. Check microphone access and device speech services.";
      setError(friendlyMessage);
      setPrerequisite("runtime_error", friendlyMessage);
    });

    const resultSub = speechLib.addSpeechRecognitionListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript?.trim();
      if (!transcript) {
        return;
      }

      if (event.isFinal) {
        setInterimText("");
        onFinalTranscript(transcript);
      } else {
        setInterimText(transcript);
        onPartialTranscript?.(transcript);
      }
    });

    return () => {
      startSub.remove();
      endSub.remove();
      errorSub.remove();
      resultSub.remove();
    };
  }, [onFinalTranscript, onPartialTranscript]);

  async function startListening() {
    const speechLib = loadSpeechLib();
    if (!speechLib) {
      const message = "Speech recognition is unavailable in Expo Go. Use a dev build for microphone STT.";
      setError(message);
      setPrerequisite("module_unavailable", message);
      setSupported(false);
      return;
    }

    if (!speechLib.isRecognitionAvailable()) {
      const message =
        "Speech recognition service unavailable. Check device speech services, internet, and microphone permission.";
      setError(message);
      setPrerequisite("service_unavailable", message);
      setSupported(false);
      return;
    }

    const permission = await speechLib.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      const blocked = permission.canAskAgain === false;
      const message = blocked
        ? "Microphone/speech permission is blocked. Enable it in App Settings."
        : "Microphone/speech permission denied. Please allow permission and try again.";
      setError(message);
      setPrerequisite(blocked ? "permission_blocked" : "permission_denied", message);
      return;
    }

    setSupported(true);
    setPrerequisite("ok", null);
    speechLib.ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      maxAlternatives: 1
    });
  }

  function stopListening() {
    const speechLib = loadSpeechLib();
    if (!speechLib) {
      return;
    }
    speechLib.ExpoSpeechRecognitionModule.stop();
  }

  return {
    supported,
    listening,
    interimText,
    error,
    prerequisiteStatus,
    prerequisiteMessage,
    startListening,
    stopListening
  };
}
