export type IncomingMessage =
  | {
      type: "coach.hint";
      payload: {
        hint: string;
        followupQuestion: string;
        confidenceDelta: number;
      };
    }
  | {
      type: "system.heartbeat";
      ts: string;
    }
  | {
      type: "system.error" | "system.warning";
      message: string;
    }
  | {
      type: "heartbeat";
      payload: {
        ts: string;
      };
    }
  | {
      type: "transcript_update";
      payload: {
        transcript: string;
        partialTranscript: string;
        isFinal: boolean;
        provider?: string;
      };
    }
  | {
      type: "ai_response";
      payload: {
        answer: string;
        bulletPoints: string[];
        speakingFormat: string;
        cached: boolean;
        model: string;
        provider?: string;
      };
    };

export interface SocketCallbacks {
  onMessage: (msg: IncomingMessage) => void;
  onStatus: (status: "idle" | "connecting" | "connected" | "disconnected" | "error") => void;
  onError: (error: string) => void;
}
