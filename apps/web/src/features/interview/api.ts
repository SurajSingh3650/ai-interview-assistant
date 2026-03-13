import { apiClient } from "@/lib/axios";
import { APP_CONFIG } from "@/lib/config";
import { getCookie } from "@/lib/cookies";

export async function createInterview(roleFocus: string, levelFocus: string) {
  const response = await apiClient.post<{ data: { id: string; roleFocus: string; levelFocus: string; status: string } }>(
    "/v1/interviews",
    { roleFocus, levelFocus }
  );
  return response.data.data;
}

export async function createRealtimeToken() {
  const response = await apiClient.post<{ data: { token: string } }>("/v1/auth/realtime/token", {});
  return response.data.data.token;
}

export async function getInterviewReport(sessionId: string) {
  const response = await apiClient.get<{
    data: {
      sessionId: string;
      summary: { totalEvents: number; transcriptEvents: number; coachEvents: number };
    };
  }>(`/v1/interviews/${sessionId}/report`);
  return response.data.data;
}

export async function requestAiHelp(transcript: string, sessionId?: string) {
  const response = await apiClient.post<{
    data: {
      answer: string;
      bulletPoints: string[];
      speakingFormat: string;
      cached: boolean;
      model: string;
      provider?: string;
    };
  }>("/v1/ai-help", {
    transcript,
    context: sessionId ? { sessionId } : undefined
  });

  return response.data.data;
}

export interface AiHelpStreamCallbacks {
  onDelta?: (delta: string) => void;
  onFinal?: (payload: {
    answer: string;
    bulletPoints: string[];
    speakingFormat: string;
    cached: boolean;
    model: string;
    provider?: string;
  }) => void;
}

export async function streamAiHelp(
  transcript: string,
  sessionId: string | undefined,
  callbacks: AiHelpStreamCallbacks
) {
  const token = getCookie("auth_token");
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/v1/ai-help/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      transcript,
      context: sessionId ? { sessionId } : undefined
    })
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "Unable to stream AI response");
    throw new Error(message || "Unable to stream AI response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event.split("\n").filter(Boolean);
      const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
      const rawData = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");

      if (!eventName || !rawData) {
        continue;
      }

      const data = JSON.parse(rawData);

      if (eventName === "delta" && data.delta) {
        callbacks.onDelta?.(String(data.delta));
      } else if (eventName === "final") {
        callbacks.onFinal?.(data);
      } else if (eventName === "error") {
        throw new Error(String(data.message || "Unable to stream AI response"));
      }
    }
  }
}
