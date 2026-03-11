import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getSessionReport } from "../interview/interview.api";
import { theme } from "../../shared/theme";

interface Summary {
  totalEvents: number;
  transcriptEvents: number;
  coachEvents: number;
}

export function AnalyticsScreen() {
  const { token } = useAuth();
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qualityScore = useMemo(() => {
    if (!summary) {
      return null;
    }
    if (summary.transcriptEvents === 0) {
      return 0;
    }
    return Math.min(100, Math.round((summary.coachEvents / summary.transcriptEvents) * 100));
  }, [summary]);

  async function loadAnalytics() {
    if (!token || !sessionId) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const report = await getSessionReport(token, sessionId);
      setSummary(report.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analytics Dashboard</Text>
      <Text style={styles.subtitle}>Track session activity and coaching density</Text>

      <TextInput
        value={sessionId}
        onChangeText={setSessionId}
        placeholder="Enter session ID"
        placeholderTextColor={theme.subtext}
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={loadAnalytics} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Loading..." : "Load Analytics"}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        <MetricCard label="Total Events" value={summary?.totalEvents ?? "-"} />
        <MetricCard label="Transcript Events" value={summary?.transcriptEvents ?? "-"} />
        <MetricCard label="Coach Events" value={summary?.coachEvents ?? "-"} />
        <MetricCard label="Quality Score" value={qualityScore === null ? "-" : `${qualityScore}%`} />
      </View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 14 },
  title: { color: theme.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: theme.subtext, marginTop: 4, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#0f1728",
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  button: {
    marginTop: 10,
    backgroundColor: theme.accent,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11
  },
  buttonText: { color: theme.text, fontWeight: "700" },
  error: { color: theme.danger, marginTop: 10 },
  grid: { marginTop: 14, gap: 8 },
  card: {
    backgroundColor: theme.panel,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12
  },
  cardLabel: { color: theme.subtext, marginBottom: 6 },
  cardValue: { color: theme.text, fontSize: 24, fontWeight: "700" }
});
