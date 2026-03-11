import { useEffect, useRef, useState } from "react";
import { config } from "../../shared/config";
import type { CoachHint } from "../../shared/types";

interface RealtimeState {
  status: "idle" | "connecting" | "connected" | "disconnected" | "error";
  hints: CoachHint[];
  lastError: string | null;
}

export function useRealtimeInterview() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionRef = useRef<{ token: string; sessionId: string } | null>(null);

  const [state, setState] = useState<RealtimeState>({
    status: "idle",
    hints: [],
    lastError: null
  });

  function setStatus(status: RealtimeState["status"]) {
    setState((prev) => ({ ...prev, status }));
  }

  function connect(token: string, sessionId: string) {
    sessionRef.current = { token, sessionId };
    setStatus("connecting");

    const ws = new WebSocket(
      `${config.wsBaseUrl}/realtime?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setState((prev) => ({ ...prev, status: "connected", lastError: null }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "coach.hint") {
          setState((prev) => ({ ...prev, hints: [data.payload as CoachHint, ...prev.hints].slice(0, 30) }));
        }
      } catch {
        setState((prev) => ({ ...prev, lastError: "Invalid realtime message format" }));
      }
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", lastError: "WebSocket error" }));
    };

    ws.onclose = () => {
      setStatus("disconnected");
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (!sessionRef.current) {
      return;
    }
    if (reconnectAttemptsRef.current >= 4) {
      setState((prev) => ({ ...prev, status: "error", lastError: "Realtime reconnect attempts exhausted" }));
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delayMs = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
    reconnectRef.current = setTimeout(() => {
      if (sessionRef.current) {
        connect(sessionRef.current.token, sessionRef.current.sessionId);
      }
    }, delayMs);
  }

  function disconnect() {
    sessionRef.current = null;
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }

  function sendTranscript(transcript: string) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error("Realtime channel is not connected");
    }
    wsRef.current.send(
      JSON.stringify({
        type: "candidate.transcript",
        payload: { transcript }
      })
    );
  }

  useEffect(() => {
    return () => disconnect();
  }, []);

  return {
    state,
    connect,
    disconnect,
    sendTranscript
  };
}
