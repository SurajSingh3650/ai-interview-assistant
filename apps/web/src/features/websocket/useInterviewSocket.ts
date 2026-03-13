"use client";

import { useMemo, useState } from "react";
import { InterviewWebSocketService } from "./websocket.service";
import type { IncomingMessage } from "./types";

export function useInterviewSocket() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<IncomingMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(
    () =>
      new InterviewWebSocketService({
        onMessage: (msg) => {
          setLastMessage(msg);
          setMessages((prev) => [msg, ...prev].slice(0, 40));
        },
        onStatus: (next) => setStatus(next),
        onError: (msg) => setError(msg)
      }),
    []
  );

  return {
    status,
    messages,
    lastMessage,
    error,
    connect: (token: string, sessionId: string) => service.connect(token, sessionId),
    sendTranscript: (transcript: string) => service.sendTranscript(transcript),
    startRecording: () => service.startRecording(),
    sendTranscriptChunk: (transcriptChunk: string, isFinal?: boolean) => service.sendTranscriptChunk(transcriptChunk, isFinal),
    sendAudioChunk: (audioBase64: string) => service.sendAudioChunk(audioBase64),
    stopRecording: () => service.stopRecording(),
    disconnect: () => service.disconnect(),
    clearError: () => setError(null)
  };
}
