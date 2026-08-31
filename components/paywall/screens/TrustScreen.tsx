import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { SlotPackPicker } from '@/components/paywall/slot-pack-picker';
import type { SlotPackId } from '@/lib/subscription-config';
import { APP_TRIAL_DAYS } from '@/lib/subscription-config';
import { PrimaryButton } from '../ui/PrimaryButton';
import { PaywallCloseButton, PaywallHeaderSpacer } from '../ui/PaywallHeader';
import { MC } from '../paywall-tokens';
import { BENEFITS, TRUST_BODY, TRUST_TITLE } from '../paywall-mock-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';

interface TrustScreenProps {
  onContinue: () => void;
  onClose?: () => void;
}

export function TrustScreen({ onContinue, onClose }: TrustScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useScreenTheme();
  const [pack, setPack] = useState<SlotPackId>('family');
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');

  return (
    <ScreenShell
      title=" "
      showBack={false}
      headerRight={onClose ? <PaywallCloseButton onPress={onClose} /> : <PaywallHeaderSpacer />}
    >
      <ScreenScroll contentContainerStyle={styles.content} gap={Layout.sectionGap}>
        <Text style={[styles.title, { color: colors.text }]}>{TRUST_TITLE}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{TRUST_BODY}</Text>

        <SlotPackPicker
          selected={pack}
          billing={billing}
          onSelectPack={setPack}
          onSelectBilling={setBilling}
        />

        <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
          No payment during the {APP_TRIAL_DAYS}-day trial. Nothing renews until you choose a plan.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.label} style={styles.benefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={17} color={colors.tint} />
              <Text style={[styles.benefitLabel, { color: colors.text }]}>{benefit.label}</Text>
            </View>
          ))}
        </View>
      </ScreenScroll>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Choose a plan" onPress={onContinue} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: MC.sectionTitle,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_700Bold',
  },
  body: {
    fontSize: MC.body,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
    marginTop: -Layout.sectionGap + MC.titleBodyGap,
  },
  trialNote: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Manrope_400Regular',
  },
  benefits: { gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitLabel: {
    flex: 1,
    fontSize: MC.body,
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
  },
  footer: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: MC.aboveCta,
  },
});
