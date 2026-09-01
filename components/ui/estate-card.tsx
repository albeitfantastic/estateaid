import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { PhotoHero, photoHeroOverlayText } from '@/components/ui/photo-hero';
import { Radius } from '@/constants/theme';
import { Estate } from '@/types';

interface EstateCardProps {
  estate: Estate;
  onPress: () => void;
  badge?: { label: string; color: string };
}

export function EstateCard({ estate, onPress, badge }: EstateCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={estate.name}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <PhotoHero imageUrl={estate.coverImageUrl} height={240}>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <ThemedText style={styles.badgeText}>{badge.label}</ThemedText>
          </View>
        ) : null}
        <ThemedText type="display" style={styles.name} numberOfLines={2}>
          {estate.name}
        </ThemedText>
        <View style={styles.locationRow}>
          <IconSymbol name="map.fill" size={13} color={photoHeroOverlayText} />
          <ThemedText style={styles.location} numberOfLines={1}>
            {estate.location}
          </ThemedText>
        </View>
      </PhotoHero>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: photoHeroOverlayText,
    fontFamily: 'Manrope_600SemiBold',
  },
  name: {
    color: photoHeroOverlayText,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  location: {
    fontSize: 14,
    flex: 1,
    color: photoHeroOverlayText,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.92,
  },
});
