import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FocusInput } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Layout } from '@/constants/theme';
import {
  beginPlaceSearchSession,
  endPlaceSearchSession,
  searchPlaces,
  type PlaceSuggestion,
} from '@/lib/place-search';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function LocationSearchField({ label, value, onChangeText, placeholder }: Props) {
  const t = useAppTheme();
  const colors = t.colors;
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const skipSearchRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    beginPlaceSearchSession();
    return () => endPlaceSearchSession();
  }, []);

  useEffect(() => {
    if (!searching) return;
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      setLoading(true);
      void searchPlaces(q, controller.signal)
        .then((rows) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(rows);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
          if (__DEV__) console.warn('[place-search]', err);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, searching]);

  function pick(row: PlaceSuggestion) {
    skipSearchRef.current = true;
    endPlaceSearchSession();
    beginPlaceSearchSession();
    onChangeText(row.label);
    setSuggestions([]);
    setLoading(false);
    Keyboard.dismiss();
  }

  return (
    <View style={styles.wrap}>
      <FocusInput
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => {
          setSearching(true);
          onChangeText(text);
        }}
        onFocus={() => setSearching(true)}
        autoCorrect={false}
        autoComplete="off"
        textContentType="addressCity"
        returnKeyType="search"
      />
      {loading && suggestions.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <View
          style={[
            styles.list,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {suggestions.map((row, i) => (
            <Pressable
              key={row.id}
              onPress={() => pick(row)}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              style={({ pressed }) => [
                styles.row,
                i < suggestions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                pressed && { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <IconSymbol name="map.fill" size={18} color={colors.tint} />
              <View style={styles.rowText}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {row.title}
                </Text>
                {row.detail ? (
                  <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {row.detail}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  loadingRow: {
    minHeight: Layout.touchMin,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  list: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    minHeight: Layout.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  detail: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
});
