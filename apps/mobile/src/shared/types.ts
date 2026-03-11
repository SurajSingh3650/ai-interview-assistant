export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

export interface Session {
  id: string;
  roleFocus: string;
  levelFocus: string;
  status: string;
}

export interface CoachHint {
  hint: string;
  followupQuestion: string;
  confidenceDelta: number;
}

export interface AiHelpResponse {
  answer: string;
  bulletPoints: string[];
  speakingFormat: string;
  cached: boolean;
  model: string;
  provider?: string;
}
