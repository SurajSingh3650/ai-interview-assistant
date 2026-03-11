export interface User {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ApiEnvelope<T> {
  data: T;
}
