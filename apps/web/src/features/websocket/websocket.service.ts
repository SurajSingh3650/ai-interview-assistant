import { APP_CONFIG } from "@/lib/config";
import type { IncomingMessage, SocketCallbacks } from "./types";

export class InterviewWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxReconnectAttempts = 5;
  private session: { token: string; sessionId: string } | null = null;

  constructor(private callbacks: SocketCallbacks) {}

  connect(token: string, sessionId: string) {
    this.session = { token, sessionId };
    this.callbacks.onStatus("connecting");

    const wsUrl = `${APP_CONFIG.wsBaseUrl}/realtime?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(
      sessionId
    )}`;

    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.callbacks.onStatus("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as IncomingMessage;
        this.callbacks.onMessage(data);
      } catch {
        this.callbacks.onError("Failed to parse WebSocket message");
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onStatus("error");
      this.callbacks.onError("Realtime connection error");
    };

    this.ws.onclose = () => {
      this.callbacks.onStatus("disconnected");
      this.tryReconnect();
    };
  }

  private tryReconnect() {
    if (!this.session) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onStatus("error");
      this.callbacks.onError("Reconnect retries exhausted");
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectTimer = setTimeout(() => {
      if (this.session) {
        this.connect(this.session.token, this.session.sessionId);
      }
    }, delay);
  }

  sendTranscript(transcript: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(
      JSON.stringify({
        type: "candidate.transcript",
        payload: { transcript }
      })
    );
  }

  disconnect() {
    this.session = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.onStatus("disconnected");
  }
}
