export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}
