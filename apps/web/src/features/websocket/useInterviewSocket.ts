"use client";

import { useMemo, useState } from "react";
import { InterviewWebSocketService } from "./websocket.service";
import type { IncomingMessage } from "./types";

export function useInterviewSocket() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(
    () =>
      new InterviewWebSocketService({
        onMessage: (msg) => setMessages((prev) => [msg, ...prev].slice(0, 40)),
        onStatus: (next) => setStatus(next),
        onError: (msg) => setError(msg)
      }),
    []
  );

  return {
    status,
    messages,
    error,
    connect: (token: string, sessionId: string) => service.connect(token, sessionId),
    sendTranscript: (transcript: string) => service.sendTranscript(transcript),
    disconnect: () => service.disconnect(),
    clearError: () => setError(null)
  };
}
