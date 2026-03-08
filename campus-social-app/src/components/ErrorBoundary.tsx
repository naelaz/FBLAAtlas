import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Global error boundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#090A1A",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            gap: 14,
          }}
        >
          <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>FBLA Atlas</Text>
          <Text style={{ color: "#CBD5E1", textAlign: "center" }}>
            Something went wrong, but your app is still alive.
          </Text>
          <Button mode="contained" onPress={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

