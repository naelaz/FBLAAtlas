import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenShell } from "../components/ScreenShell";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { useThemeContext } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/types";
import { fetchGlossaryTerms } from "../services/glossaryService";
import { GlossaryTerm } from "../constants/fblaGlossary";

type Props = NativeStackScreenProps<RootStackParamList, "Glossary">;

export function GlossaryScreen({ navigation }: Props) {
  const { palette } = useThemeContext();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchGlossaryTerms()
      .then((rows) => {
        if (active) {
          setTerms(rows);
        }
      })
      .catch((error) => {
        console.warn("Glossary load failed:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return terms;
    }
    return terms.filter(
      (term) =>
        term.term.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q),
    );
  }, [terms, query]);

  return (
    <ScreenShell
      title="FBLA Glossary"
      subtitle="Core terms and concepts for events and leadership."
      showBackButton
      onBackPress={() => navigation.goBack()}
      fillContent={
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState title="No glossary match" message="Try another keyword." />}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            return (
              <Pressable onPress={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}>
                <GlassSurface
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: palette.colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <Text style={{ color: palette.colors.text, fontWeight: "700", flex: 1 }}>
                      {item.term}
                    </Text>
                    <Badge size="sm" variant="gray-subtle" capitalize={false}>
                      {item.category}
                    </Badge>
                  </View>
                  <Text style={{ color: palette.colors.textSecondary, marginTop: 6 }} numberOfLines={expanded ? undefined : 2}>
                    {item.definition}
                  </Text>
                  {expanded && item.related.length > 0 ? (
                    <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {item.related.map((related) => (
                        <Badge key={`${item.id}_${related}`} size="sm" variant="blue-subtle" capitalize={false}>
                          {related}
                        </Badge>
                      ))}
                    </View>
                  ) : null}
                </GlassSurface>
              </Pressable>
            );
          }}
        />
      }
    >
      <GlassInput
        value={query}
        onChangeText={setQuery}
        label="Search Terms"
        placeholder="Type a term like quorum, KPI, ROI..."
      />
    </ScreenShell>
  );
}

