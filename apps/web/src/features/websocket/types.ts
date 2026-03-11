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
    };

export interface SocketCallbacks {
  onMessage: (msg: IncomingMessage) => void;
  onStatus: (status: "idle" | "connecting" | "connected" | "disconnected" | "error") => void;
  onError: (error: string) => void;
}
