import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { LegalLinks } from '../ui/LegalLinks';
import { PaywallHeaderSpacer } from '../ui/PaywallHeader';
import { MC } from '../paywall-tokens';
import { EXIT_BODY, EXIT_TITLE } from '../paywall-mock-data';
import { ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';

interface ExitOfferScreenProps {
  onClaimOffer: () => void;
  onContinueRegular: () => void;
  /** Soft lock escape — leave acquisition without purchasing. */
  onSkip: () => void;
}

export function ExitOfferScreen({
  onClaimOffer,
  onContinueRegular,
  onSkip,
}: ExitOfferScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useScreenTheme();

  return (
    <ScreenShell title=" " showBack={false} headerRight={<PaywallHeaderSpacer />}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{EXIT_TITLE}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{EXIT_BODY}</Text>
        <PrimaryButton label="Start Free Trial" onPress={onClaimOffer} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <SecondaryButton label="Skip for now" onPress={onSkip} />
        <LegalLinks />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    justifyContent: 'center',
    gap: Layout.sectionGap,
  },
  title: {
    fontSize: MC.sectionTitle,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_700Bold',
  },
  subtitle: {
    fontSize: MC.body,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
    marginTop: -Layout.sectionGap + MC.titleBodyGap,
  },
  footer: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: MC.aboveCta,
    gap: 4,
  },
});
