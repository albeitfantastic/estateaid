import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { useAppTheme } from '@/theme/useAppTheme';
import { Estate } from '@/types';

interface EstateCardProps {
  estate: Estate;
  onPress: () => void;
  badge?: { label: string; color: string };
}

export function EstateCard({ estate, onPress, badge }: EstateCardProps) {
  const t = useAppTheme();
  const colors = t.colors;

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: colors.text,
      }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {estate.coverImageUrl ? (
        <Image
          source={{ uri: estate.coverImageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.primarySoft }]}>
          <IconSymbol name="building.2.fill" size={36} color={colors.primary} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.row}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {estate.name}
          </ThemedText>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color + '18' }]}>
              <ThemedText style={[styles.badgeText, { color: badge.color }]}>{badge.label}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.locationRow}>
          <IconSymbol name="map.fill" size={12} color={colors.icon} />
          <ThemedText style={[styles.location, { color: colors.textMuted }]} numberOfLines={1}>
            {estate.location}
          </ThemedText>
        </View>

        {estate.description && (
          <ThemedText style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
            {estate.description}
          </ThemedText>
        )}
      </View>

      <View style={[styles.chevronWrap, { backgroundColor: colors.primarySoft }]}>
        <IconSymbol name="chevron.right" size={13} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 168,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  location: {
    fontSize: 13,
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.8,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.7,
  },
  chevronWrap: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
