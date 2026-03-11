import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getRealtimeToken } from "../auth/auth.api";
import { createSession, requestAiHelp } from "./interview.api";
import { useRealtimeInterview } from "./useRealtimeInterview";
import { theme } from "../../shared/theme";
import { useSpeechToText } from "./useSpeechToText";
import type { AiHelpResponse } from "../../shared/types";
import { getFriendlyApiErrorMessage } from "../../shared/errorMessages";

export function InterviewScreen() {
  const { token } = useAuth();
  const realtime = useRealtimeInterview();
  const [mode, setMode] = useState<"interview" | "practice">("interview");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capturedSpeech, setCapturedSpeech] = useState("");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState<AiHelpResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechToText({
    onFinalTranscript: (text: string) => {
      setCapturedSpeech((prev) => {
        const next = (prev ? `${prev} ${text}` : text).trim();
        setTranscript(next);
        return next;
      });
    },
    onPartialTranscript: (text: string) => {
      const normalizedPartial = text.trim();
      const liveTranscript = normalizedPartial
        ? (capturedSpeech ? `${capturedSpeech} ${normalizedPartial}` : normalizedPartial).trim()
        : capturedSpeech;
      setTranscript(liveTranscript);
    }
  });

  const statusLabel = useMemo(() => realtime.state.status.toUpperCase(), [realtime.state.status]);
  const liveSpeech = useMemo(() => {
    const interim = speech.interimText.trim();
    if (capturedSpeech && interim) {
      return `${capturedSpeech} ${interim}`.trim();
    }
    return capturedSpeech || interim;
  }, [capturedSpeech, speech.interimText]);

  async function startSession() {
    if (!token) {
      return;
    }

    setError(null);
    try {
      const session = await createSession(token, mode);
      const realtimeToken = await getRealtimeToken(token);
      setSessionId(session.id);
      realtime.connect(realtimeToken, session.id);
    } catch (err) {
      setError(getFriendlyApiErrorMessage(err));
    }
  }

  function stopSession() {
    speech.stopListening();
    realtime.disconnect();
  }

  function pasteTranscript() {
    if (!liveSpeech.trim()) {
      setError("No speech text available to paste.");
      return;
    }

    setError(null);
    setTranscript(liveSpeech.trim());
  }

  async function sendTranscript() {
    if (!token) {
      return;
    }

    const normalizedTranscript = transcript.trim();
    if (!normalizedTranscript) {
      setError("Transcript is empty.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const response = await requestAiHelp(token, normalizedTranscript, sessionId ?? undefined);
      setAiResponse(response);
    } catch (err) {
      setAiResponse(null);
      setError(getFriendlyApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function clearQuestion() {
    setTranscript("");
    setCapturedSpeech("");
    setAiResponse(null);
    setError(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable style={mode === "interview" ? styles.modeActive : styles.mode} onPress={() => setMode("interview")}>
          <Text style={styles.modeText}>Interview</Text>
        </Pressable>
        <Pressable style={mode === "practice" ? styles.modeActive : styles.mode} onPress={() => setMode("practice")}>
          <Text style={styles.modeText}>Practice</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.meta}>Session: {sessionId ?? "not-started"}</Text>
        <Text style={styles.meta}>Status: {statusLabel}</Text>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.action} onPress={startSession}>
          <Text style={styles.actionText}>Start Session</Text>
        </Pressable>
        <Pressable style={styles.actionSecondary} onPress={stopSession}>
          <Text style={styles.actionText}>Stop</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Pressable
          style={styles.action}
          onPress={speech.listening ? speech.stopListening : speech.startListening}
          disabled={!speech.supported || realtime.state.status !== "connected"}
        >
          <Text style={styles.actionText}>{speech.listening ? "Stop Mic" : "Start Mic"}</Text>
        </Pressable>
      </View>

      <Text style={styles.meta}>
        Mic: {!speech.supported ? "Not supported on this device" : speech.listening ? "Listening" : "Idle"}
      </Text>
      {speech.prerequisiteMessage ? <Text style={styles.warning}>{speech.prerequisiteMessage}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Generated Speech Text</Text>
        <Text style={styles.generatedText}>{liveSpeech || "No speech detected yet."}</Text>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.actionSecondary} onPress={pasteTranscript}>
          <Text style={styles.actionText}>Paste Transcript</Text>
        </Pressable>
        <Pressable style={styles.actionSecondary} onPress={clearQuestion}>
          <Text style={styles.actionText}>Clear Question</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Transcript</Text>
      <TextInput
        value={transcript}
        onChangeText={setTranscript}
        multiline
        style={styles.input}
        placeholder="What is Java?"
        placeholderTextColor={theme.subtext}
      />

      <Pressable style={styles.action} onPress={sendTranscript} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Send Transcript</Text>}
      </Pressable>

      {error || speech.error || realtime.state.lastError ? (
        <Text style={styles.error}>{error ?? speech.error ?? realtime.state.lastError}</Text>
      ) : null}

      <Text style={styles.heading}>Realtime AI Hint</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.hintCard}>
          {aiResponse ? (
            <>
              <Text style={styles.sectionLabel}>Answer:</Text>
              <Text style={styles.hint}>{aiResponse.answer}</Text>

              <Text style={styles.sectionLabel}>Key Points:</Text>
              {aiResponse.bulletPoints.length > 0 ? (
                aiResponse.bulletPoints.map((point, index) => (
                  <Text key={`${index}-${point}`} style={styles.bulletPoint}>
                    - {point}
                  </Text>
                ))
              ) : (
                <Text style={styles.subtle}>No key points returned.</Text>
              )}

              <Text style={styles.sectionLabel}>Speaking Format:</Text>
              <Text style={styles.hint}>{aiResponse.speakingFormat}</Text>
            </>
          ) : (
            <Text style={styles.hint}>AI response will appear here after you send the transcript.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 14 },
  row: { flexDirection: "row", gap: 8, marginBottom: 10 },
  panel: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  meta: { color: theme.subtext, fontSize: 13 },
  mode: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    backgroundColor: theme.panel
  },
  modeActive: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accent,
    alignItems: "center",
    backgroundColor: "#1b3360"
  },
  modeText: { color: theme.text, fontWeight: "600" },
  label: { color: theme.text, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#0f1728",
    color: theme.text,
    borderRadius: 10,
    minHeight: 110,
    textAlignVertical: "top",
    padding: 10,
    marginBottom: 10
  },
  action: {
    flex: 1,
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center"
  },
  actionSecondary: {
    flex: 1,
    borderColor: theme.border,
    borderWidth: 1,
    backgroundColor: theme.panel,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center"
  },
  actionText: { color: theme.text, fontWeight: "700" },
  sectionTitle: { color: theme.text, fontWeight: "700", marginBottom: 6 },
  generatedText: { color: theme.text, minHeight: 36, lineHeight: 20 },
  heading: { color: theme.text, fontSize: 17, fontWeight: "700", marginVertical: 10 },
  hintCard: {
    backgroundColor: theme.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    minHeight: 120
  },
  sectionLabel: { color: theme.text, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  hint: { color: theme.text, fontWeight: "600", lineHeight: 22 },
  bulletPoint: { color: theme.text, lineHeight: 20, marginBottom: 2 },
  subtle: { color: theme.subtext },
  warning: { color: "#f59e0b", marginBottom: 8, fontSize: 12 },
  error: { color: theme.danger, marginVertical: 8 }
});
