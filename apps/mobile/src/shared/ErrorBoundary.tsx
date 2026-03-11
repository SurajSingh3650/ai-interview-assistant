import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "./theme";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled mobile UI error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Unexpected error</Text>
          <Text style={styles.message}>{this.state.message || "Restart app and try again."}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
    padding: 20
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700"
  },
  message: {
    color: theme.subtext,
    marginTop: 8,
    textAlign: "center"
  }
});
