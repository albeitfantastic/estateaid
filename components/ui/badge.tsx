import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { StatusColors } from '@/constants/theme';

type BadgeVariant = keyof typeof StatusColors | 'neutral';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const NEUTRAL_COLOR = '#94a3b8';

export function Badge({ label, variant }: BadgeProps) {
  const color = variant === 'neutral' ? NEUTRAL_COLOR : StatusColors[variant] ?? NEUTRAL_COLOR;

  return (
    <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <ThemedText style={[styles.text, { color }]}>{label}</ThemedText>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  return <Badge label={capitalized} variant={status as BadgeVariant} />;
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
