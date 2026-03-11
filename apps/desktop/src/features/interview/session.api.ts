import { request } from "../../shared/http";
import type { Mode } from "../../shared/config";

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
