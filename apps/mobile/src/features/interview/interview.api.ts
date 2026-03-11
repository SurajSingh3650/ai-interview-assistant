import { request } from "../../shared/http";
import type { AiHelpResponse, ApiEnvelope, Session } from "../../shared/types";

export async function createSession(accessToken: string, mode: "interview" | "practice") {
  const payload =
    mode === "interview"
      ? { roleFocus: "software-engineer", levelFocus: "senior" }
      : { roleFocus: "software-engineer", levelFocus: "practice" };

  const response = await request<ApiEnvelope<Session>>(
    "/v1/interviews",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );

  return response.data;
}

export async function getSessionReport(accessToken: string, sessionId: string) {
  const response = await request<ApiEnvelope<{ summary: { totalEvents: number; transcriptEvents: number; coachEvents: number } }>>(
    `/v1/interviews/${sessionId}/report`,
    {
      method: "GET"
    },
    accessToken
  );
  return response.data;
}

export async function requestAiHelp(accessToken: string, transcript: string, sessionId?: string) {
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
