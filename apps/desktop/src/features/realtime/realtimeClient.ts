import { config } from "../../shared/config";

export interface CoachMessage {
  hint: string;
  followupQuestion: string;
  confidenceDelta: number;
}

export interface TranscriptUpdateMessage {
  transcript: string;
  partialTranscript: string;
  isFinal: boolean;
  provider?: string;
}

export interface AiResponseMessage {
  answer: string;
  bulletPoints: string[];
  speakingFormat: string;
  cached: boolean;
  model: string;
  provider?: string;
}

interface RealtimeCallbacks {
  onCoachHint: (message: CoachMessage) => void;
  onTranscriptUpdate: (message: TranscriptUpdateMessage) => void;
  onAiResponse: (message: AiResponseMessage) => void;
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
        } else if (payload.type === "transcript_update") {
          this.callbacks.onTranscriptUpdate(payload.payload as TranscriptUpdateMessage);
        } else if (payload.type === "ai_response") {
          this.callbacks.onAiResponse(payload.payload as AiResponseMessage);
        } else if (payload.type === "system.error") {
          this.callbacks.onError(String(payload.payload?.message || payload.message || "Realtime error"));
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

  startRecording() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send(JSON.stringify({ type: "start_recording", payload: {} }));
  }

  sendTranscriptChunk(transcript: string, isFinal = false) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send(
      JSON.stringify({
        type: "audio_stream",
        payload: {
          transcript,
          isFinal
        }
      })
    );
  }

  sendAudioChunk(audioBase64: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send(
      JSON.stringify({
        type: "audio_stream",
        payload: {
          audioBase64
        }
      })
    );
  }

  stopRecording() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({ type: "stop_recording", payload: {} }));
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
