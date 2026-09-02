import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = {
  sponsoredUsed: number;
  sponsoredTotal: number;
  invitedCount: number;
};

export function PropertyUsageBar({ sponsoredUsed, sponsoredTotal, invitedCount }: Props) {
  const { t } = useTranslation();
  const { colors, borderHairline } = useScreenTheme();
  const sponsoredValue = t('guestsList.roleUsage', { used: sponsoredUsed, total: sponsoredTotal });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: borderHairline,
        },
      ]}
    >
      <RoleStat
        label={t('estatesList.roleSponsored')}
        value={sponsoredValue}
        labelColor={colors.textSecondary}
        valueColor={colors.text}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <RoleStat
        label={t('estatesList.roleInvited')}
        value={String(invitedCount)}
        labelColor={colors.textSecondary}
        valueColor={colors.text}
      />
    </View>
  );
}

function RoleStat({
  label,
  value,
  valueColor,
  labelColor,
}: {
  label: string;
  value: string;
  valueColor: string;
  labelColor: string;
}) {
  const { typography } = useAppTheme();
  return (
    <View style={styles.stat} accessibilityRole="text" accessibilityLabel={`${label}, ${value}`}>
      <ThemedText
        style={[
          styles.label,
          { color: labelColor, fontFamily: typography.fontFamily.bold, fontWeight: '700' },
        ]}
      >
        {label}
      </ThemedText>
      <ThemedText type="statValue" style={[styles.value, { color: valueColor }]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  label: { fontSize: 14, textAlign: 'center' },
  value: { fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
});
