import { useEffect, useMemo, useState } from "react";
import { AuthForm } from "../features/auth/AuthForm";
import { useAuthState } from "../features/auth/useAuthState";
import { InterviewPanel } from "../features/interview/InterviewPanel";
import { subscribeOverlayUpdates } from "../features/overlay/overlay";
import { ScreenCapturePanel } from "../features/screen-capture/ScreenCapturePanel";

function OverlayView() {
  const [hint, setHint] = useState("Ready for real-time coaching.");

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    subscribeOverlayUpdates((nextHint) => setHint(nextHint))
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return (
    <main className="overlay-root">
      <section className="overlay-card">
        <p className="overlay-title">AI Coach</p>
        <p>{hint}</p>
      </section>
    </main>
  );
}

export function App() {
  const auth = useAuthState();
  const isOverlayWindow = useMemo(() => new URLSearchParams(window.location.search).get("overlay") === "1", []);

  if (isOverlayWindow) {
    return <OverlayView />;
  }

  return (
    <main className="page">
      {!auth.isAuthenticated || !auth.user || !auth.token ? (
        <AuthForm onAuthenticated={(token, user) => auth.setSession(token, user)} />
      ) : (
        <div className="stack-layout">
          <InterviewPanel accessToken={auth.token} userEmail={auth.user.email} onLogout={auth.clearSession} />
          <ScreenCapturePanel />
        </div>
      )}
    </main>
  );
}
