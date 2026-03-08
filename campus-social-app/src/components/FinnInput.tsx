import { ArrowRight } from "lucide-react-native";
import React from "react";

import { useThemeContext } from "../context/ThemeContext";
import { GlassInput } from "./ui/GlassInput";

type FinnInputProps = {
  placeholders: string[];
  disabled?: boolean;
  onChangeText?: (text: string) => void;
  onSubmit: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function FinnInput({
  placeholders,
  disabled = false,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
}: FinnInputProps) {
  const { palette } = useThemeContext();

  return (
    <GlassInput
      variant="vanish"
      placeholders={placeholders}
      disabled={disabled}
      onChangeText={onChangeText}
      onVanishSubmit={onSubmit}
      onFocus={onFocus}
      onBlur={onBlur}
      returnKeyType="send"
      accessibilityLabel="Ask Finn"
      rightSlot={<ArrowRight size={16} color={palette.colors.onPrimary} />}
      inputWrapperStyle={{ minHeight: 56 }}
      accentColor={palette.colors.primary}
    />
  );
}

