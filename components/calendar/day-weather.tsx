import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useScreenTheme } from '@/components/ui/screen-layout';
import {
  fetchPropertyWeather,
  formatTempRangeC,
  type WeatherStayForecast,
} from '@/lib/weather';

type Props = {
  location?: string;
  timeZone?: string;
  date: string;
};

export function CalendarDayWeather({ location, timeZone, date }: Props) {
  const { colors } = useScreenTheme();
  const [forecast, setForecast] = useState<WeatherStayForecast | null>(null);

  useEffect(() => {
    if (!location?.trim()) {
      setForecast(null);
      return;
    }
    const ac = new AbortController();
    void fetchPropertyWeather({
      location,
      timeZone,
      stayFrom: date,
      stayTo: date,
      signal: ac.signal,
    })
      .then((data) => {
        if (!ac.signal.aborted) setForecast(data?.daily[date] ?? null);
      })
      .catch(() => {
        if (!ac.signal.aborted) setForecast(null);
      });
    return () => ac.abort();
  }, [location, timeZone, date]);

  if (!forecast) return null;

  const range = formatTempRangeC(forecast.minC, forecast.maxC);

  return (
    <View
      style={styles.row}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={range}
    >
      <IconSymbol name={forecast.icon} size={16} color={colors.tint} />
      <ThemedText style={[styles.temp, { color: colors.text }]}>{range}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  temp: { fontSize: 13, fontWeight: '600' },
});
