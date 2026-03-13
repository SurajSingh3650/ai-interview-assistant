import { useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultAlternativeShape {
  transcript?: string;
}

interface SpeechRecognitionResultShape {
  isFinal: boolean;
  0?: SpeechRecognitionResultAlternativeShape;
}

interface SpeechRecognitionEventShape {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultShape>;
}

interface SpeechRecognitionErrorEventShape {
  error?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventShape) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventShape) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface VoiceInputOptions {
  language?: string;
  canAutoRestart?: () => boolean;
  onPartialTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onAudioChunk?: (audioBase64: string) => void;
  onError?: (message: string) => void;
}

export function useBrowserVoiceInput(options: VoiceInputOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const autoRestartRef = useRef(options.canAutoRestart);
  const partialHandlerRef = useRef(options.onPartialTranscript);
  const finalHandlerRef = useRef(options.onFinalTranscript);
  const audioHandlerRef = useRef(options.onAudioChunk);
  const errorHandlerRef = useRef(options.onError);

  useEffect(() => {
    autoRestartRef.current = options.canAutoRestart;
    partialHandlerRef.current = options.onPartialTranscript;
    finalHandlerRef.current = options.onFinalTranscript;
    audioHandlerRef.current = options.onAudioChunk;
    errorHandlerRef.current = options.onError;
  }, [options]);

  useEffect(() => {
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognitionCtor) || typeof MediaRecorder !== "undefined");

    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.language || "en-US";

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = String(event.results[i][0]?.transcript || "").trim();
        if (!text) {
          continue;
        }

        if (event.results[i].isFinal) {
          finalChunk += `${text} `;
        } else {
          interimChunk += `${text} `;
        }
      }

      const normalizedFinal = finalChunk.trim();
      const normalizedInterim = interimChunk.trim();

      if (normalizedInterim) {
        partialHandlerRef.current?.(normalizedInterim);
      }

      if (normalizedFinal) {
        finalHandlerRef.current?.(normalizedFinal);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      shouldListenRef.current = false;
      errorHandlerRef.current?.(`Microphone error: ${event.error || "unknown"}`);
    };

    recognition.onend = () => {
      setListening(false);
      if (!shouldListenRef.current || autoRestartRef.current?.() === false) {
        return;
      }

      recognition.start();
      setListening(true);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.stop();
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recognitionRef.current = null;
    };
  }, [options.language]);

  async function start() {
    if (!recognitionRef.current && typeof MediaRecorder === "undefined") {
      throw new Error("Speech recognition is not supported in this environment.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = stream;
    shouldListenRef.current = true;

    if (typeof MediaRecorder !== "undefined") {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0 || !audioHandlerRef.current) {
          return;
        }

        const buffer = await event.data.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioHandlerRef.current(btoa(binary));
      };
      recorder.start(250);
      recorderRef.current = recorder;
    }

    recognitionRef.current?.start();
    setListening(true);
  }

  function stop() {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setListening(false);
  }

  return {
    supported,
    listening,
    start,
    stop
  };
}
