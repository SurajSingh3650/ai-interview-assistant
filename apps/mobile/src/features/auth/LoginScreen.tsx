import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { login, register } from "./auth.api";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../shared/http";
import { theme } from "../../shared/theme";

export function LoginScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register(email, password);
      }
      const result = await login(email, password);
      await auth.signIn(result.accessToken, result.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_EXISTS" && mode === "register") {
        setMode("login");
        setError("Email already exists. Use Login with your credentials.");
      } else {
        setError(err instanceof ApiError ? err.message : "Unable to sign in");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AI Interview Copilot</Text>
        <Text style={styles.subtitle}>Mobile coaching client</Text>

        <View style={styles.modeRow}>
          <Pressable style={mode === "login" ? styles.modeActive : styles.mode} onPress={() => setMode("login")}>
            <Text style={styles.modeText}>Login</Text>
          </Pressable>
          <Pressable style={mode === "register" ? styles.modeActive : styles.mode} onPress={() => setMode("register")}>
            <Text style={styles.modeText}>Register</Text>
          </Pressable>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={theme.subtext}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={theme.subtext}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === "login" ? "Sign In" : "Register & Sign In"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    padding: 16
  },
  card: {
    backgroundColor: theme.panel,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.text
  },
  subtitle: {
    color: theme.subtext,
    marginTop: 6,
    marginBottom: 14
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  mode: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#0f1728"
  },
  modeActive: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#1b3360"
  },
  modeText: {
    color: theme.text,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    backgroundColor: "#0f1728",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  button: {
    marginTop: 6,
    backgroundColor: theme.accent,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  error: {
    color: theme.danger,
    marginBottom: 8
  }
});
