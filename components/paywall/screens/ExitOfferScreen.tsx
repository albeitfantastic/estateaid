import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallHeader } from '../ui/PaywallHeader';
import { ExitOfferCard } from '../ui/ExitOfferCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { LegalLinks } from '../ui/LegalLinks';
import { MC } from '../paywall-tokens';
import { EXIT_BODY, EXIT_OFFER, EXIT_TITLE } from '../paywall-mock-data';

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

  return (
    <View style={styles.root}>
      <PaywallHeader topInset={insets.top} />

      <View style={styles.body}>
        <Text style={styles.title}>{EXIT_TITLE}</Text>
        <Text style={styles.subtitle}>{EXIT_BODY}</Text>
        <PrimaryButton label="Start Free Trial" onPress={onClaimOffer} />
        
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        
        <SecondaryButton label="Skip for now" onPress={onSkip} />
        <LegalLinks />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MC.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: MC.hPad,
    justifyContent: 'center',
    gap: MC.sectionGap,
  },
  title: {
    fontSize: MC.sectionTitle,
    fontWeight: '700',
    color: MC.text,
    lineHeight: 36,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_700Bold',
  },
  subtitle: {
    fontSize: MC.body,
    color: MC.textSecondary,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
    marginTop: -MC.sectionGap + MC.titleBodyGap,
  },
  footer: {
    paddingHorizontal: MC.hPad,
    paddingTop: MC.aboveCta,
    backgroundColor: MC.bg,
    gap: 4,
  },
});
