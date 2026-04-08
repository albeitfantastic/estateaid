import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, StatusColors } from '@/constants/theme';

type BadgeVariant = keyof typeof StatusColors | 'neutral';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const NEUTRAL_COLOR = '#94a3b8';

export function Badge({ label, variant }: BadgeProps) {
  const color = variant === 'neutral' ? NEUTRAL_COLOR : StatusColors[variant] ?? NEUTRAL_COLOR;

  return (
    <View style={[styles.pill, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <ThemedText style={[styles.text, { color }]}>{label}</ThemedText>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status === 'closed' ? 'resolved' : status;
  const label = normalized.replace(/_/g, ' ');
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  const variant: BadgeVariant =
    normalized in StatusColors ? (normalized as BadgeVariant) : 'neutral';
  return <Badge label={capitalized} variant={variant} />;
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.label,
    textTransform: 'capitalize',
    letterSpacing: 0.1,
  },
});
