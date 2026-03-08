import { Check, ChevronDown, Search, Square, SquareCheckBig } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleProp, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { useThemeContext } from "../../context/ThemeContext";
import { hapticTap } from "../../services/haptics";
import { GlassButton } from "./GlassButton";
import { GlassInput } from "./GlassInput";
import { GlassSurface } from "./GlassSurface";

export type GlassDropdownOption = {
  label: string;
  value: string;
  description?: string;
  section?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  swatchColor?: string;
  disabled?: boolean;
};

type GlassDropdownProps = {
  label?: string;
  placeholder?: string;
  panelTitle?: string;
  value?: string;
  values?: string[];
  options: GlassDropdownOption[];
  onValueChange?: (value: string) => void;
  onValuesChange?: (values: string[]) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  maxPanelHeight?: number;
  style?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  showSelectedCount?: boolean;
};

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function includesQuery(option: GlassDropdownOption, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    option.label,
    option.description ?? "",
    option.section ?? "",
    ...(option.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalize(query));
}

export function GlassDropdown({
  label,
  placeholder = "Select",
  panelTitle,
  value,
  values,
  options,
  onValueChange,
  onValuesChange,
  multiSelect = false,
  searchable,
  searchPlaceholder = "Search options...",
  disabled = false,
  maxPanelHeight,
  style,
  triggerStyle,
  showSelectedCount = true,
}: GlassDropdownProps) {
  const { palette } = useThemeContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedValues = useMemo(() => (multiSelect ? values ?? [] : value ? [value] : []), [multiSelect, value, values]);
  const selectedOptions = useMemo(() => {
    const set = new Set(selectedValues);
    return options.filter((option) => set.has(option.value));
  }, [options, selectedValues]);

  const shouldSearch = useMemo(() => searchable ?? options.length > 8, [options.length, searchable]);
  const filteredOptions = useMemo(() => options.filter((option) => includesQuery(option, search)), [options, search]);
  const groupedOptions = useMemo(() => {
    const map = new Map<string, GlassDropdownOption[]>();
    for (const option of filteredOptions) {
      const section = option.section ?? "Options";
      const list = map.get(section) ?? [];
      list.push(option);
      map.set(section, list);
    }
    return [...map.entries()];
  }, [filteredOptions]);

  const selectedText = useMemo(() => {
    if (!selectedOptions.length) {
      return placeholder;
    }
    if (multiSelect) {
      return showSelectedCount ? `${selectedOptions.length} selected` : selectedOptions.map((option) => option.label).join(", ");
    }
    return selectedOptions[0]?.label ?? placeholder;
  }, [multiSelect, placeholder, selectedOptions, showSelectedCount]);

  const closePanel = () => {
    setOpen(false);
    setSearch("");
  };

  const applyValue = (nextValue: string) => {
    if (multiSelect) {
      const exists = selectedValues.includes(nextValue);
      const nextValues = exists ? selectedValues.filter((entry) => entry !== nextValue) : [...selectedValues, nextValue];
      onValuesChange?.(nextValues);
      return;
    }
    onValueChange?.(nextValue);
    closePanel();
  };

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text style={{ color: palette.colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          if (disabled) {
            return;
          }
          hapticTap();
          setOpen(true);
        }}
        disabled={disabled}
        style={{ minHeight: 48 }}
      >
        {({ pressed }) => (
          <GlassSurface
            pressed={pressed}
            disabled={disabled}
            borderRadius={999}
            style={[
              {
                minHeight: 48,
                borderRadius: 999,
                backgroundColor: palette.colors.inputSurface,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              triggerStyle,
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                paddingRight: 12,
                color: selectedOptions.length ? palette.colors.text : palette.colors.placeholder,
                fontWeight: selectedOptions.length ? "700" : "500",
              }}
            >
              {selectedText}
            </Text>
            <ChevronDown size={18} color={palette.colors.textSecondary} />
          </GlassSurface>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closePanel}>
        <Pressable onPress={closePanel} style={{ flex: 1, backgroundColor: palette.colors.overlay, justifyContent: "center", padding: 12 }}>
          <Pressable onPress={() => undefined}>
            <GlassSurface
              borderRadius={12}
              style={{
                borderRadius: 12,
                backgroundColor: palette.colors.surface,
                padding: 10,
                maxHeight: maxPanelHeight ?? 420,
              }}
            >
              <Text style={{ color: palette.colors.text, fontWeight: "700", fontSize: 16, marginBottom: 8 }}>
                {panelTitle ?? label ?? "Select"}
              </Text>

              {shouldSearch ? (
                <GlassInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={searchPlaceholder}
                  leftSlot={<Search size={16} color={palette.colors.textSecondary} />}
                  inputWrapperStyle={{ minHeight: 42, borderRadius: 999 }}
                />
              ) : null}

              <ScrollView style={{ marginTop: shouldSearch ? 8 : 2 }} contentContainerStyle={{ paddingBottom: 4 }} keyboardShouldPersistTaps="handled">
                {groupedOptions.length === 0 ? (
                  <View style={{ borderWidth: 1, borderColor: palette.colors.border, borderRadius: 10, borderStyle: "dashed", paddingVertical: 16, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: palette.colors.textSecondary }}>No matching options</Text>
                  </View>
                ) : null}

                {groupedOptions.map(([section, sectionOptions], sectionIndex) => (
                  <View key={section} style={{ marginTop: sectionIndex === 0 ? 0 : 10 }}>
                    <Text style={{ color: palette.colors.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                      {section}
                    </Text>

                    <View style={{ borderRadius: 10, borderWidth: 1, borderColor: palette.colors.border, overflow: "hidden" }}>
                      {sectionOptions.map((option, optionIndex) => {
                        const selected = selectedValues.includes(option.value);
                        return (
                          <Pressable
                            key={option.value}
                            disabled={option.disabled}
                            onPress={() => {
                              if (option.disabled) {
                                return;
                              }
                              hapticTap();
                              applyValue(option.value);
                            }}
                            style={{
                              minHeight: 48,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderTopWidth: optionIndex === 0 ? 0 : 1,
                              borderTopColor: palette.colors.divider,
                              backgroundColor: selected ? palette.colors.inputSurface : palette.colors.surface,
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 8, gap: 2 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                {option.swatchColor ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: option.swatchColor, borderWidth: 1, borderColor: palette.colors.border }} /> : null}
                                {option.icon ? <View>{option.icon}</View> : null}
                                <Text style={{ color: palette.colors.text, fontWeight: selected ? "700" : "500" }}>
                                  {option.label}
                                </Text>
                              </View>
                              {option.description ? <Text style={{ color: palette.colors.textSecondary, fontSize: 12 }}>{option.description}</Text> : null}
                            </View>
                            {multiSelect ? selected ? <SquareCheckBig size={18} color={palette.colors.text} /> : <Square size={18} color={palette.colors.textSecondary} /> : selected ? <Check size={18} color={palette.colors.text} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {multiSelect ? (
                <GlassButton variant="solid" label="Done" onPress={closePanel} style={{ marginTop: 10 }} />
              ) : null}
            </GlassSurface>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
