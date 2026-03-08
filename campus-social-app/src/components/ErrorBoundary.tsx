import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

import { DEFAULT_THEME, getThemeByName } from "../constants/themes";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  private readonly palette = getThemeByName(DEFAULT_THEME);

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
            backgroundColor: this.palette.colors.background,
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            gap: 14,
          }}
        >
          <Text style={{ color: this.palette.colors.text, fontSize: 22, fontWeight: "800" }}>
            FBLA Atlas
          </Text>
          <Text style={{ color: this.palette.colors.textSecondary, textAlign: "center" }}>
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
