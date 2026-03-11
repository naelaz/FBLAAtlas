import { Search } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

import { Badge } from "../components/ui/badge";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassSurface } from "../components/ui/GlassSurface";
import { GlossaryTerm } from "../constants/fblaGlossary";
import { useThemeContext } from "../context/ThemeContext";
import { fetchGlossaryTerms } from "../services/glossaryService";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function GlossaryInline() {
  const { palette } = useThemeContext();
  const scrollRef = useRef<ScrollView>(null);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const jumpLockRef = useRef(false);

  useEffect(() => {
    let active = true;
    void fetchGlossaryTerms()
      .then((rows) => { if (active) setTerms(rows); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [terms, query]);

  const sections = useMemo(() => {
    const sorted = [...filtered].sort((a, b) =>
      a.term.localeCompare(b.term, undefined, { sensitivity: "base" }),
    );
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of sorted) {
      const letter = t.term[0].toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const activeLetters = useMemo(
    () => new Set(sections.map(([letter]) => letter)),
    [sections],
  );

  const jumpToLetter = useCallback((letter: string) => {
    const y = sectionPositions.current[letter];
    if (y !== undefined && scrollRef.current) {
      setActiveLetter(letter);
      jumpLockRef.current = true;
      scrollRef.current.scrollTo({ y, animated: true });
      // Re-enable scroll tracking after animation settles
      setTimeout(() => { jumpLockRef.current = false; }, 600);
    }
  }, []);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (jumpLockRef.current) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    const positions = sectionPositions.current;
    const letters = Object.entries(positions).sort(([, a], [, b]) => a - b);
    let current: string | null = null;
    for (const [letter, y] of letters) {
      if (scrollY >= y - 10) current = letter;
    }
    setActiveLetter(current);
  }, []);

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {/* Main scrollable list */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <GlassInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search terms, e.g. ROI, quorum, KPI..."
          leftSlot={<Search size={15} color={palette.colors.textSecondary} />}
          containerStyle={{ marginBottom: 8 }}
        />

        {sections.length === 0 ? (
          <Text style={{ color: palette.colors.textMuted, textAlign: "center", marginTop: 24, fontSize: 14 }}>
            {query ? `No results for "${query}"` : "Loading..."}
          </Text>
        ) : (
          sections.map(([letter, sectionTerms]) => (
            <View
              key={letter}
              onLayout={(e) => {
                sectionPositions.current[letter] = e.nativeEvent.layout.y;
              }}
            >
              {/* Section header */}
              <View
                style={{
                  height: 34,
                  backgroundColor: palette.colors.background,
                  justifyContent: "center",
                  paddingHorizontal: 2,
                }}
              >
                <Text
                  style={{
                    color: palette.colors.primary,
                    fontWeight: "900",
                    fontSize: 18,
                    letterSpacing: 1,
                  }}
                >
                  {letter}
                </Text>
              </View>

              {/* Terms */}
              {sectionTerms.map((term) => {
                const expanded = expandedId === term.id;
                return (
                  <Pressable
                    key={term.id}
                    onPress={() => setExpandedId((prev) => (prev === term.id ? null : term.id))}
                    style={{ marginBottom: 8 }}
                  >
                    {({ pressed }) => (
                      <GlassSurface
                        pressed={pressed}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: expanded ? palette.colors.primary : palette.colors.border,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <Text style={{ color: palette.colors.text, fontWeight: "700", flex: 1, fontSize: 14 }}>
                            {term.term}
                          </Text>
                          <Badge size="sm" variant="gray-subtle" capitalize={false}>
                            {term.category}
                          </Badge>
                        </View>
                        <Text
                          style={{ color: palette.colors.textSecondary, marginTop: 5, fontSize: 13, lineHeight: 19 }}
                          numberOfLines={expanded ? undefined : 2}
                        >
                          {term.definition}
                        </Text>
                        {expanded && term.related.length > 0 ? (
                          <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {term.related.slice(0, 4).map((r) => (
                              <Badge key={`${term.id}_${r}`} size="sm" variant="blue-subtle" capitalize={false}>
                                {r}
                              </Badge>
                            ))}
                          </View>
                        ) : null}
                      </GlassSurface>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Alphabet sidebar */}
      <View
        style={{
          width: 22,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
          gap: 1,
        }}
      >
        {ALPHABET.map((letter) => {
          const hasTerms = activeLetters.has(letter);
          const isCurrent = activeLetter === letter;
          return (
            <Pressable
              key={letter}
              onPress={() => hasTerms && jumpToLetter(letter)}
              hitSlop={6}
              style={{ paddingVertical: 2, paddingHorizontal: 4 }}
            >
              <Text
                style={{
                  fontSize: isCurrent ? 13 : 11,
                  fontWeight: isCurrent ? "900" : hasTerms ? "600" : "400",
                  color: isCurrent
                    ? palette.colors.primary
                    : hasTerms
                    ? palette.colors.textMuted
                    : palette.colors.border,
                }}
              >
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
