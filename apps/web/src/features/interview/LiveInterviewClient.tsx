"use client";

import { useEffect, useRef, useState } from "react";
import { useInterviewSocket } from "@/features/websocket/useInterviewSocket";
import { createInterview, createRealtimeToken, requestAiHelp } from "./api";
import { Card } from "@/components/ui/Card";
import { getFriendlyApiErrorMessage, getFriendlyMicErrorMessage } from "@/lib/errorMessages";

interface SpeechRecognitionResultAlternativeShape {
  transcript?: string;
}

interface SpeechRecognitionResultShape {
  isFinal: boolean;
  0?: SpeechRecognitionResultAlternativeShape;
}

interface SpeechRecognitionEventShape {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultShape>;
}

interface SpeechRecognitionErrorEventShape {
  error?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventShape) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventShape) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export function LiveInterviewClient() {
  const socket = useInterviewSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [interimSpeech, setInterimSpeech] = useState("");
  const [aiResponse, setAiResponse] = useState<null | {
    answer: string;
    bulletPoints: string[];
    speakingFormat: string;
  }>(null);
  const [seconds, setSeconds] = useState(0);
  const [micSupported, setMicSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const socketStatusRef = useRef(socket.status);
  const generatedSpeechRef = useRef("");

  useEffect(() => {
    socketStatusRef.current = socket.status;
  }, [socket.status]);

  useEffect(() => {
    generatedSpeechRef.current = generatedSpeech;
  }, [generatedSpeech]);

  useEffect(() => {
    if (socket.status !== "connected") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [socket.status]);

  useEffect(() => {
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
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

    recognition.onresult = (event: SpeechRecognitionEventShape) => {
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

    recognition.onerror = (event: SpeechRecognitionErrorEventShape) => {
      setMicError(`Microphone error: ${event.error || "unknown"}`);
      setIsListening(false);
      setInterimSpeech("");
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimSpeech("");
      if (!shouldListenRef.current || socketStatusRef.current !== "connected") return;
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
    socket.clearError();
    try {
      const interview = await createInterview("software-engineer", "senior");
      const realtimeToken = await createRealtimeToken();
      setSessionId(interview.id);
      setSeconds(0);
      socket.connect(realtimeToken, interview.id);
    } catch (err) {
      setMicError(getFriendlyApiErrorMessage(err));
    }
  }

  function endSession() {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setIsListening(false);
    socket.disconnect();
    setSessionId(null);
    setGeneratedSpeech("");
    setInterimSpeech("");
  }

  async function startListening() {
    if (!micSupported || !recognitionRef.current || socket.status !== "connected") return;
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

  function stopListening() {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    setIsListening(false);
    setInterimSpeech("");
  }

  function pasteTranscript() {
    const liveTranscript = `${generatedSpeech} ${interimSpeech}`.trim();
    if (!liveTranscript) return;
    setTranscript(liveTranscript);
  }

  function clearQuestion() {
    setGeneratedSpeech("");
    setInterimSpeech("");
    setTranscript("");
    setAiResponse(null);
    setMicError(null);
    socket.clearError();
  }

  async function sendTranscript() {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const response = await requestAiHelp(transcript.trim(), sessionId ?? undefined);
      setAiResponse(response);
    } catch (err) {
      setAiResponse(null);
      setMicError(getFriendlyApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-section">
      <h1 className="text-3xl font-semibold">Live Interview Mode</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Same transcript-to-hint flow as mobile, now on web.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" onClick={startSession}>
              Start Session
            </button>
            <button className="rounded-lg border border-red-500 px-4 py-2 text-sm text-red-500" onClick={endSession}>
              Stop
            </button>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700 disabled:opacity-50"
              onClick={isListening ? stopListening : startListening}
              disabled={!micSupported || socket.status !== "connected"}
            >
              {isListening ? "Stop Mic" : "Start Mic"}
            </button>
            <span className="ml-auto text-sm text-slate-500">Status: {socket.status}</span>
          </div>
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Session ID: {sessionId ?? "Not started"} | Timer: {Math.floor(seconds / 60)}m {seconds % 60}s
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Mic: {!micSupported ? "Not supported in this browser" : isListening ? "Listening" : "Idle"}
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-base font-semibold">Generated Speech Text</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{`${generatedSpeech} ${interimSpeech}`.trim() || "No speech detected yet."}</p>
          </div>

          <div className="mt-4 flex gap-3">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={pasteTranscript}>
              Paste Transcript
            </button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={clearQuestion}>
              Clear Question
            </button>
          </div>

          <label className="mt-4 block text-sm font-medium">
            Transcript
            <textarea
              className="mt-2 h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              placeholder="What is Java?"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </label>
          <button
            className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={sendTranscript}
            disabled={loading}
          >
            {loading ? "Generating..." : "Send Transcript"}
          </button>
          {micError ? <p className="mt-2 text-sm text-red-500">{micError}</p> : null}
          {socket.error ? <p className="mt-2 text-sm text-red-500">{socket.error}</p> : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Realtime AI Hint</h2>
          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            {aiResponse ? (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">Answer:</p>
                  <p>{aiResponse.answer}</p>
                </div>
                <div>
                  <p className="font-semibold">Key Points:</p>
                  {aiResponse.bulletPoints.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {aiResponse.bulletPoints.map((point, index) => (
                        <li key={`${index}-${point}`}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">No key points returned.</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold">Speaking Format:</p>
                  <p>{aiResponse.speakingFormat}</p>
                </div>
              </div>
            ) : (
              "AI response will appear here after you send the transcript."
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
