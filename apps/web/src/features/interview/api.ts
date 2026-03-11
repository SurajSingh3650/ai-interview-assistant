import { apiClient } from "@/lib/axios";

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
