import { config } from "../../shared/config";

export interface CoachMessage {
  hint: string;
  followupQuestion: string;
  confidenceDelta: number;
}

interface RealtimeCallbacks {
  onCoachHint: (message: CoachMessage) => void;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;

  constructor(private readonly callbacks: RealtimeCallbacks) {}

  connect(realtimeToken: string, sessionId: string) {
    this.disconnect();
    this.callbacks.onStatus("connecting");

    this.socket = new WebSocket(
      `${config.wsBaseUrl}/realtime?token=${encodeURIComponent(realtimeToken)}&sessionId=${encodeURIComponent(sessionId)}`
    );

    this.socket.onopen = () => this.callbacks.onStatus("connected");

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload.type === "coach.hint") {
          this.callbacks.onCoachHint(payload.payload as CoachMessage);
        }
      } catch {
        this.callbacks.onError("Invalid realtime message");
      }
    };

    this.socket.onclose = () => this.callbacks.onStatus("disconnected");
    this.socket.onerror = () => this.callbacks.onError("Realtime connection error");
  }

  sendTranscript(transcript: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send(
      JSON.stringify({
        type: "candidate.transcript",
        payload: { transcript }
      })
    );
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
