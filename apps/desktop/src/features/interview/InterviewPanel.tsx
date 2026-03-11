import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRealtimeToken, logout } from "../auth/auth.api";
import { createInterviewSession, requestAiHelp, type AiHelpResponse } from "./session.api";
import { RealtimeClient } from "../realtime/realtimeClient";
import { toggleOverlayWindow } from "../overlay/overlay";
import type { Mode } from "../../shared/config";
import { getFriendlyApiErrorMessage, getFriendlyMicErrorMessage } from "../../shared/errorMessages";
import {
  SCREEN_CAPTURE_QUESTION_DETECTED_EVENT,
  type ScreenCaptureQuestionDetectedDetail
} from "../screen-capture/screenCaptureEvents";

interface InterviewPanelProps {
  accessToken: string;
  userEmail: string;
  onLogout: () => void;
}

export function InterviewPanel({ accessToken, userEmail, onLogout }: InterviewPanelProps) {
  const [mode, setMode] = useState<Mode>("interview");
  const [status, setStatus] = useState("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [interimSpeech, setInterimSpeech] = useState("");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState<AiHelpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const statusRef = useRef(status);
  const generatedSpeechRef = useRef("");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    generatedSpeechRef.current = generatedSpeech;
  }, [generatedSpeech]);

  useEffect(() => {
    function handleDetectedQuestion(event: Event) {
      const detail = (event as CustomEvent<ScreenCaptureQuestionDetectedDetail>).detail;
      const detectedQuestion = String(detail?.question || "").trim();
      if (!detectedQuestion) {
        return;
      }

      setTranscript(detectedQuestion);
      setError(null);

      if (!sessionId) {
        setError("Start a session before using screen capture AI assistance.");
        return;
      }

      setLoading(true);
      requestAiHelp(accessToken, detectedQuestion, sessionId)
        .then((response) => {
          setAiResponse(response);
        })
        .catch((err) => {
          setAiResponse(null);
          setError(getFriendlyApiErrorMessage(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }

    window.addEventListener(SCREEN_CAPTURE_QUESTION_DETECTED_EVENT, handleDetectedQuestion as EventListener);
    return () => {
      window.removeEventListener(SCREEN_CAPTURE_QUESTION_DETECTED_EVENT, handleDetectedQuestion as EventListener);
    };
  }, [accessToken, sessionId]);

  const client = useMemo(
    () =>
      new RealtimeClient({
        onCoachHint: () => undefined,
        onStatus: (nextStatus) => setStatus(nextStatus),
        onError: (message) => setError(message)
      }),
    []
  );

  useEffect(() => {
    const win = window as Window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };

    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    setMicSupported(Boolean(SpeechRecognitionCtor));

    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = String(event.results[i][0]?.transcript || "").trim();
        if (!text) continue;
        if (event.results[i].isFinal) {
          finalChunk += `${text} `;
        } else {
          interimChunk += `${text} `;
        }
      }

      const normalizedFinal = finalChunk.trim();
      const normalizedInterim = interimChunk.trim();

      if (normalizedFinal) {
        setGeneratedSpeech((prev) => {
          const next = (prev ? `${prev} ${normalizedFinal}` : normalizedFinal).trim();
          const liveTranscript = normalizedInterim ? `${next} ${normalizedInterim}`.trim() : next;
          setTranscript(liveTranscript);
          return next;
        });
      } else if (normalizedInterim) {
        const liveTranscript = generatedSpeechRef.current
          ? `${generatedSpeechRef.current} ${normalizedInterim}`.trim()
          : normalizedInterim;
        setTranscript(liveTranscript);
      }

      setInterimSpeech(normalizedInterim);
    };

    recognition.onerror = (event: any) => {
      setMicError(`Microphone error: ${event.error || "unknown"}`);
      setIsListening(false);
      setInterimSpeech("");
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimSpeech("");
      if (!shouldListenRef.current || statusRef.current !== "connected") return;
      recognition.start();
      setIsListening(true);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  async function startSession() {
    setError(null);
    try {
      const session = await createInterviewSession(accessToken, mode);
      const realtimeToken = await createRealtimeToken(accessToken);
      client.connect(realtimeToken, session.id);
      setSessionId(session.id);
    } catch (err) {
      setError(getFriendlyApiErrorMessage(err));
    }
  }

  function stopSession() {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setIsListening(false);
    setInterimSpeech("");
    client.disconnect();
    setStatus("disconnected");
    setSessionId(null);
  }

  function pasteTranscript() {
    const liveTranscript = `${generatedSpeech} ${interimSpeech}`.trim();
    if (!liveTranscript) {
      setError("No speech text available to paste.");
      return;
    }

    setError(null);
    setTranscript(liveTranscript);
  }

  function clearQuestion() {
    setGeneratedSpeech("");
    setInterimSpeech("");
    setTranscript("");
    setAiResponse(null);
    setError(null);
  }

  async function sendTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTranscript = transcript.trim();
    if (!normalizedTranscript) {
      setError("Transcript is empty.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await requestAiHelp(accessToken, normalizedTranscript, sessionId ?? undefined);
      setAiResponse(response);
    } catch (err) {
      setAiResponse(null);
      setError(getFriendlyApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function startMic() {
    if (!micSupported || !recognitionRef.current || status !== "connected") {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = stream;
      setMicError(null);
      shouldListenRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      setMicError(getFriendlyMicErrorMessage(err));
      shouldListenRef.current = false;
    }
  }

  function stopMic() {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setIsListening(false);
    setInterimSpeech("");
  }

  async function handleLogout() {
    try {
      await logout(accessToken);
    } catch {
      // Local sign-out should proceed even if network logout fails.
    } finally {
      stopSession();
      onLogout();
    }
  }

  return (
    <section className="card">
      <header className="header-row">
        <div>
          <h1>Desktop Copilot Console</h1>
          <p className="muted">{userEmail}</p>
        </div>
        <button className="ghost" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="mode-row">
        <button className={mode === "interview" ? "mode active" : "mode"} onClick={() => setMode("interview")}>
          Interview
        </button>
        <button className={mode === "practice" ? "mode active" : "mode"} onClick={() => setMode("practice")}>
          Practice
        </button>
      </div>

      <div className="status-row">
        <span>Session: {sessionId ?? "not-started"}</span>
        <span>Status: {status}</span>
      </div>

      <div className="actions-row">
        <button onClick={startSession}>Start Session</button>
        <button className="ghost" onClick={stopSession}>
          Stop
        </button>
        <button className="ghost" onClick={isListening ? stopMic : startMic} disabled={!micSupported || status !== "connected"}>
          {isListening ? "Stop Mic" : "Start Mic"}
        </button>
        <button className="ghost" onClick={() => toggleOverlayWindow()}>
          Toggle Overlay
        </button>
      </div>

      <p className="muted">Mic: {!micSupported ? "Not supported" : isListening ? "Listening" : "Idle"}</p>

      <section className="coach-panel">
        <h2>Generated Speech Text</h2>
        <p>{`${generatedSpeech} ${interimSpeech}`.trim() || "No speech detected yet."}</p>
      </section>

      <div className="actions-row compact-row">
        <button className="ghost" onClick={pasteTranscript}>
          Paste Transcript
        </button>
        <button className="ghost" onClick={clearQuestion}>
          Clear Question
        </button>
      </div>

      <form onSubmit={sendTranscript}>
        <label>
          Transcript
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="What is Java?"
            rows={5}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Send Transcript"}
        </button>
      </form>

      <section className="coach-panel">
        <h2>Realtime AI Hint</h2>
        {aiResponse ? (
          <>
            <p><strong>Answer:</strong></p>
            <p>{aiResponse.answer}</p>
            <p><strong>Key Points:</strong></p>
            {aiResponse.bulletPoints.length > 0 ? (
              <ul className="response-list">
                {aiResponse.bulletPoints.map((point, index) => (
                  <li key={`${index}-${point}`}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No key points returned.</p>
            )}
            <p><strong>Speaking Format:</strong></p>
            <p>{aiResponse.speakingFormat}</p>
          </>
        ) : (
          <p>AI response will appear here after you send the transcript.</p>
        )}
      </section>

      {micError ? <p className="error">Microphone: {micError}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
