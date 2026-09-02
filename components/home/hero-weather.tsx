import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { photoHeroOverlayText } from '@/components/ui/photo-hero';
import {
  fetchPropertyWeather,
  formatTempC,
  formatTempRangeC,
  type PropertyWeather,
  type WeatherIconName,
} from '@/lib/weather';

type Props = {
  location?: string;
  timeZone?: string;
  stayFrom?: string;
  stayTo?: string;
};

export function HeroWeather({ location, timeZone, stayFrom, stayTo }: Props) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<PropertyWeather | null>(null);

  useEffect(() => {
    if (!location?.trim()) {
      setWeather(null);
      return;
    }
    const ac = new AbortController();
    void fetchPropertyWeather({
      location,
      timeZone,
      stayFrom,
      stayTo,
      signal: ac.signal,
    })
      .then((data) => {
        if (!ac.signal.aborted) setWeather(data);
      })
      .catch(() => {
        if (!ac.signal.aborted) setWeather(null);
      });
    return () => ac.abort();
  }, [location, timeZone, stayFrom, stayTo]);

  if (!weather?.now && !weather?.stay) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {weather.now ? (
        <WeatherRow
          icon={weather.now.icon}
          value={formatTempC(weather.now.temperatureC)}
          label={t('heroWeather.now')}
        />
      ) : null}
      {weather.stay ? (
        <WeatherRow
          icon={weather.stay.icon}
          value={formatTempRangeC(weather.stay.minC, weather.stay.maxC)}
          label={t('heroWeather.stay')}
        />
      ) : null}
    </View>
  );
}

function WeatherRow({
  icon,
  value,
  label,
}: {
  icon: WeatherIconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.row}>
      <IconSymbol name={icon} size={16} color={photoHeroOverlayText} />
      <ThemedText style={styles.value}>{value}</ThemedText>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    gap: 4,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    color: photoHeroOverlayText,
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    color: photoHeroOverlayText,
    fontSize: 13,
    opacity: 0.85,
  },
});
