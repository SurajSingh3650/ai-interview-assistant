import { request } from "../../shared/http";
import { config, type Mode } from "../../shared/config";

interface ApiEnvelope<T> {
  data: T;
}

export interface AiHelpResponse {
  answer: string;
  bulletPoints: string[];
  speakingFormat: string;
  cached: boolean;
  model: string;
  provider?: string;
}

export interface InterviewSession {
  id: string;
  roleFocus: string;
  levelFocus: string;
  status: string;
}

export async function createInterviewSession(accessToken: string, mode: Mode): Promise<InterviewSession> {
  const payload =
    mode === "interview"
      ? { roleFocus: "software-engineer", levelFocus: "senior" }
      : { roleFocus: "software-engineer", levelFocus: "practice" };

  const response = await request<ApiEnvelope<InterviewSession>>(
    "/v1/interviews",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );

  return response.data;
}

export async function requestAiHelp(accessToken: string, transcript: string, sessionId?: string): Promise<AiHelpResponse> {
  const response = await request<ApiEnvelope<AiHelpResponse>>(
    "/v1/ai-help",
    {
      method: "POST",
      body: JSON.stringify({
        transcript,
        context: sessionId ? { sessionId } : undefined
      })
    },
    accessToken
  );

  return response.data;
}

export async function streamAiHelp(
  accessToken: string,
  transcript: string,
  sessionId: string | undefined,
  callbacks: {
    onDelta?: (delta: string) => void;
    onFinal?: (payload: AiHelpResponse) => void;
  }
) {
  const response = await fetch(`${config.apiBaseUrl}/v1/ai-help/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
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
