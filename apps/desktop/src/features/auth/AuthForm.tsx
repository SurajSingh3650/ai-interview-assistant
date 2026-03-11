import { FormEvent, useState } from "react";
import { login } from "./auth.api";
import { ApiError } from "../../shared/http";
import type { AuthUser } from "./types";

interface AuthFormProps {
  onAuthenticated: (token: string, user: AuthUser) => void;
}

export function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      onAuthenticated(result.accessToken, result.user);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to login";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card auth-card">
      <h1>AI Interview Copilot</h1>
      <p className="muted">Desktop coaching client aligned with real-time backend architecture.</p>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
