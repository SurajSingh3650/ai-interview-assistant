import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRealtimeToken, logout } from "../auth/auth.api";
import { createInterviewSession, streamAiHelp, type AiHelpResponse } from "./session.api";
import { RealtimeClient } from "../realtime/realtimeClient";
import { toggleOverlayWindow } from "../overlay/overlay";
import type { Mode } from "../../shared/config";
import { getFriendlyApiErrorMessage, getFriendlyMicErrorMessage } from "../../shared/errorMessages";
import {
  SCREEN_CAPTURE_QUESTION_DETECTED_EVENT,
  type ScreenCaptureQuestionDetectedDetail
} from "../screen-capture/screenCaptureEvents";
import { useBrowserVoiceInput } from "./useBrowserVoiceInput";

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
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const generatedSpeechRef = useRef("");

  useEffect(() => {
    generatedSpeechRef.current = generatedSpeech;
  }, [generatedSpeech]);

  const client = useMemo(
    () =>
      new RealtimeClient({
        onCoachHint: () => undefined,
        onTranscriptUpdate: (message) => {
          setGeneratedSpeech(message.transcript || "");
          setInterimSpeech(message.isFinal ? "" : message.partialTranscript || "");
          setTranscript((message.partialTranscript || message.transcript || "").trim());
        },
        onAiResponse: (message) => {
          setAiResponse(message);
          setStreamingAnswer(message.answer || "");
        },
        onStatus: (nextStatus) => setStatus(nextStatus),
        onError: (message) => setError(message)
      }),
    []
  );

  const voiceInput = useBrowserVoiceInput({
    canAutoRestart: () => status === "connected",
    onPartialTranscript: (partial) => {
      const liveTranscript = generatedSpeechRef.current ? `${generatedSpeechRef.current} ${partial}`.trim() : partial;
      setInterimSpeech(partial);
      setTranscript(liveTranscript);
    },
    onFinalTranscript: (finalChunk) => {
      setGeneratedSpeech((previous) => {
        const next = previous ? `${previous} ${finalChunk}`.trim() : finalChunk;
        setInterimSpeech("");
        setTranscript(next);
        return next;
      });
    },
    onAudioChunk: (audioBase64) => {
      if (status === "connected") {
        client.sendAudioChunk(audioBase64);
      }
    },
    onError: (message) => {
      setError(getFriendlyMicErrorMessage(new Error(message)));
    }
  });

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
      setStreamingAnswer("");
      setAiResponse(null);

      streamAiHelp(accessToken, detectedQuestion, sessionId, {
        onDelta: (delta) => {
          setStreamingAnswer((previous) => `${previous}${delta}`);
        },
        onFinal: (response) => {
          setAiResponse(response);
        }
      })
        .catch((err) => {
          setAiResponse(null);
          setStreamingAnswer("");
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

  async function startSession() {
    setError(null);
    try {
      const session = await createInterviewSession(accessToken, mode);
      const realtimeToken = await createRealtimeToken(accessToken);
      client.connect(realtimeToken, session.id);
      setSessionId(session.id);
      setGeneratedSpeech("");
      setInterimSpeech("");
      setTranscript("");
      setAiResponse(null);
      setStreamingAnswer("");
    } catch (err) {
      setError(getFriendlyApiErrorMessage(err));
    }
  }

  function stopSession() {
    voiceInput.stop();
    client.stopRecording();
    client.disconnect();
    setStatus("disconnected");
    setSessionId(null);
    setGeneratedSpeech("");
    setInterimSpeech("");
  }

  function clearQuestion() {
    setGeneratedSpeech("");
    setInterimSpeech("");
    setTranscript("");
    setAiResponse(null);
    setStreamingAnswer("");
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
    setAiResponse(null);
    setStreamingAnswer("");

    try {
      await streamAiHelp(accessToken, normalizedTranscript, sessionId ?? undefined, {
        onDelta: (delta) => {
          setStreamingAnswer((previous) => `${previous}${delta}`);
        },
        onFinal: (response) => {
          setAiResponse(response);
        }
      });
    } catch (err) {
      setAiResponse(null);
      setStreamingAnswer("");
      setError(getFriendlyApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function startMic() {
    if (status !== "connected") {
      return;
    }

    try {
      setError(null);
      client.startRecording();
      await voiceInput.start();
    } catch (err) {
      setError(getFriendlyMicErrorMessage(err));
    }
  }

  function stopMic() {
    voiceInput.stop();
    client.stopRecording();
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
        <button className="ghost" onClick={voiceInput.listening ? stopMic : startMic} disabled={!voiceInput.supported || status !== "connected"}>
          {voiceInput.listening ? "Stop Mic" : "Start Mic"}
        </button>
        <button className="ghost" onClick={() => toggleOverlayWindow()}>
          Toggle Overlay
        </button>
      </div>

      <p className="muted">Mic: {!voiceInput.supported ? "Not supported" : voiceInput.listening ? "Listening" : "Idle"}</p>
      <p className="muted">STT Provider: browser fallback active. Backend can be upgraded to Deepgram or AssemblyAI with API keys.</p>

      <section className="coach-panel">
        <h2>Live Transcript</h2>
        <p>{`${generatedSpeech} ${interimSpeech}`.trim() || "No speech detected yet."}</p>
      </section>

      <div className="actions-row compact-row">
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
            placeholder="Speak or type your interview question here..."
            rows={5}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Streaming..." : "Ask AI"}
        </button>
      </form>

      <section className="coach-panel">
        <h2>Streaming AI Hint</h2>
        {streamingAnswer || aiResponse ? (
          <>
            <p><strong>Answer:</strong></p>
            <p>{streamingAnswer || aiResponse?.answer}</p>
            <p><strong>Key Points:</strong></p>
            {aiResponse?.bulletPoints.length ? (
              <ul className="response-list">
                {aiResponse.bulletPoints.map((point, index) => (
                  <li key={`${index}-${point}`}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Structured key points appear after the stream completes.</p>
            )}
            <p><strong>Speaking Format:</strong></p>
            <p>{aiResponse?.speakingFormat || streamingAnswer || "Waiting for final formatting..."}</p>
          </>
        ) : (
          <p>AI response will stream here after you send the transcript.</p>
        )}
      </section>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
