import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Estate } from '@/types';

interface EstateCardProps {
  estate: Estate;
  onPress: () => void;
  badge?: { label: string; color: string };
}

export function EstateCard({ estate, onPress, badge }: EstateCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {estate.coverImageUrl ? (
        <Image
          source={{ uri: estate.coverImageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.tint + '22' }]}>
          <IconSymbol name="building.2.fill" size={32} color={colors.tint} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.row}>
          <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
            {estate.name}
          </ThemedText>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
              <ThemedText style={[styles.badgeText, { color: badge.color }]}>{badge.label}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.locationRow}>
          <IconSymbol name="map.fill" size={13} color={colors.icon} />
          <ThemedText style={[styles.location, { color: colors.icon }]} numberOfLines={1}>
            {estate.location}
          </ThemedText>
        </View>
        {estate.description && (
          <ThemedText style={[styles.description, { color: colors.icon }]} numberOfLines={2}>
            {estate.description}
          </ThemedText>
        )}
      </View>
      <IconSymbol name="chevron.right" size={18} color={colors.icon} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 17,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    fontSize: 13,
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
