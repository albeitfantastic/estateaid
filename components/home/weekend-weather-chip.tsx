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
  from: string;
  to: string;
};

export function WeekendWeatherChip({ location, timeZone, from, to }: Props) {
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
      stayFrom: from,
      stayTo: to,
      signal: ac.signal,
    })
      .then((data) => {
        if (!ac.signal.aborted) setForecast(data?.stay ?? null);
      })
      .catch(() => {
        if (!ac.signal.aborted) setForecast(null);
      });
    return () => ac.abort();
  }, [location, timeZone, from, to]);

  if (!forecast) return null;

  return (
    <View style={styles.chip} pointerEvents="none">
      <IconSymbol name={forecast.icon} size={16} color={colors.tint} />
      <ThemedText style={[styles.temp, { color: colors.text }]}>
        {formatTempRangeC(forecast.minC, forecast.maxC)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  temp: { fontSize: 13, fontWeight: '600' },
});
