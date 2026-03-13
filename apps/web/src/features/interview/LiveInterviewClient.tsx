"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getFriendlyApiErrorMessage, getFriendlyMicErrorMessage } from "@/lib/errorMessages";
import { createInterview, createRealtimeToken, streamAiHelp } from "./api";
import { useBrowserVoiceInput } from "./useBrowserVoiceInput";
import { useInterviewSocket } from "@/features/websocket/useInterviewSocket";

interface AiResponseState {
  answer: string;
  bulletPoints: string[];
  speakingFormat: string;
  cached?: boolean;
  model?: string;
  provider?: string;
}

export function LiveInterviewClient() {
  const socket = useInterviewSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [interimSpeech, setInterimSpeech] = useState("");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState<AiResponseState | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const generatedSpeechRef = useRef("");

  useEffect(() => {
    generatedSpeechRef.current = generatedSpeech;
  }, [generatedSpeech]);

  useEffect(() => {
    if (socket.status !== "connected") {
      return;
    }

    const timer = setInterval(() => setSeconds((previous) => previous + 1), 1000);
    return () => clearInterval(timer);
  }, [socket.status]);

  useEffect(() => {
    if (!socket.lastMessage || socket.lastMessage.type !== "transcript_update") {
      return;
    }

    const update = socket.lastMessage.payload;
    setGeneratedSpeech(update.transcript || "");
    setInterimSpeech(update.isFinal ? "" : update.partialTranscript || "");
    setTranscript((update.partialTranscript || update.transcript || "").trim());
  }, [socket.lastMessage]);

  const voiceInput = useBrowserVoiceInput({
    canAutoRestart: () => socket.status === "connected",
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
      if (socket.status === "connected") {
        socket.sendAudioChunk(audioBase64);
      }
    },
    onError: (message) => {
      setMicError(getFriendlyMicErrorMessage(new Error(message)));
    }
  });

  async function startSession() {
    socket.clearError();
    setMicError(null);
    try {
      const interview = await createInterview("software-engineer", "senior");
      const realtimeToken = await createRealtimeToken();
      setSessionId(interview.id);
      setSeconds(0);
      setGeneratedSpeech("");
      setInterimSpeech("");
      setTranscript("");
      setAiResponse(null);
      setStreamingAnswer("");
      socket.connect(realtimeToken, interview.id);
    } catch (error) {
      setMicError(getFriendlyApiErrorMessage(error));
    }
  }

  function endSession() {
    voiceInput.stop();
    socket.stopRecording();
    socket.disconnect();
    setSessionId(null);
    setGeneratedSpeech("");
    setInterimSpeech("");
    setTranscript("");
    setStreamingAnswer("");
  }

  async function startListening() {
    if (socket.status !== "connected") {
      return;
    }

    try {
      setMicError(null);
      socket.startRecording();
      await voiceInput.start();
    } catch (error) {
      setMicError(getFriendlyMicErrorMessage(error));
    }
  }

  function stopListening() {
    voiceInput.stop();
    socket.stopRecording();
    setInterimSpeech("");
  }

  function clearQuestion() {
    setGeneratedSpeech("");
    setInterimSpeech("");
    setTranscript("");
    setAiResponse(null);
    setStreamingAnswer("");
    setMicError(null);
    socket.clearError();
  }

  async function sendTranscript() {
    const normalizedTranscript = transcript.trim();
    if (!normalizedTranscript) {
      return;
    }

    setLoading(true);
    setMicError(null);
    setAiResponse(null);
    setStreamingAnswer("");

    try {
      await streamAiHelp(normalizedTranscript, sessionId ?? undefined, {
        onDelta: (delta) => {
          setStreamingAnswer((previous) => `${previous}${delta}`);
        },
        onFinal: (payload) => {
          setAiResponse(payload);
        }
      });
    } catch (error) {
      setAiResponse(null);
      setStreamingAnswer("");
      setMicError(getFriendlyApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-section">
      <h1 className="text-3xl font-semibold">Live Interview Mode</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Continuous microphone capture, realtime transcript updates, and streaming AI replies.
      </p>

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
              onClick={voiceInput.listening ? stopListening : startListening}
              disabled={!voiceInput.supported || socket.status !== "connected"}
            >
              {voiceInput.listening ? "Stop Mic" : "Start Mic"}
            </button>
            <span className="ml-auto text-sm text-slate-500">Status: {socket.status}</span>
          </div>

          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Session ID: {sessionId ?? "Not started"} | Timer: {Math.floor(seconds / 60)}m {seconds % 60}s
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Mic: {!voiceInput.supported ? "Microphone capture not supported" : voiceInput.listening ? "Listening" : "Idle"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            STT Provider: browser fallback now; backend provider hooks are ready for Deepgram or AssemblyAI keys.
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-base font-semibold">Live Transcript</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {`${generatedSpeech} ${interimSpeech}`.trim() || "No speech detected yet."}
            </p>
          </div>

          <label className="mt-4 block text-sm font-medium">
            Transcript
            <textarea
              className="mt-2 h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Speak or type your interview question here..."
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
            />
          </label>

          <div className="mt-4 flex gap-3">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={clearQuestion}>
              Clear Question
            </button>
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={sendTranscript}
              disabled={loading}
            >
              {loading ? "Streaming..." : "Ask AI"}
            </button>
          </div>

          {micError ? <p className="mt-3 text-sm text-red-500">{micError}</p> : null}
          {socket.error ? <p className="mt-2 text-sm text-red-500">{socket.error}</p> : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Streaming AI Response</h2>
          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            {streamingAnswer || aiResponse ? (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">Answer:</p>
                  <p>{streamingAnswer || aiResponse?.answer}</p>
                </div>
                <div>
                  <p className="font-semibold">Key Points:</p>
                  {aiResponse?.bulletPoints?.length ? (
                    <ul className="list-disc pl-5">
                      {aiResponse.bulletPoints.map((point, index) => (
                        <li key={`${index}-${point}`}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Structured key points appear after the stream completes.</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold">Speaking Format:</p>
                  <p>{aiResponse?.speakingFormat || streamingAnswer || "Waiting for final formatting..."}</p>
                </div>
              </div>
            ) : (
              "AI response will stream here as soon as generation starts."
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
