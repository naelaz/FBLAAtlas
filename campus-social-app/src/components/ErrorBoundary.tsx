import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { DEFAULT_THEME, getThemeByName } from "../constants/themes";
import { GlassButton } from "./ui/GlassButton";

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
          <Text style={{ fontSize: 26, fontWeight: "800", color: this.palette.colors.text }}>
            FBLA{" "}
            <Text style={{ color: this.palette.colors.primary }}>Atlas</Text>
          </Text>
          <Text style={{ color: this.palette.colors.textSecondary, textAlign: "center" }}>
            Something went wrong, but your app is still alive.
          </Text>
          <GlassButton
            variant="solid"
            label="Try Again"
            onPress={() => this.setState({ hasError: false })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
