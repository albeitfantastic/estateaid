import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { PaywallCloseButton } from '../ui/PaywallHeader';
import { MC } from '../paywall-tokens';
import { OUTCOME_BODY, OUTCOME_TITLE } from '../paywall-mock-data';
import { ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';

interface OutcomeScreenProps {
  onStartTrial: () => void;
  /** User taps "Maybe later" — triggers exit offer */
  onMaybeLater: () => void;
  onClose: () => void;
}

export function OutcomeScreen({ onStartTrial, onMaybeLater, onClose }: OutcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useScreenTheme();

  return (
    <ScreenShell title=" " showBack={false} headerRight={<PaywallCloseButton onPress={onClose} />}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{OUTCOME_TITLE}</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{OUTCOME_BODY}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Start free trial" onPress={onStartTrial} />
        <SecondaryButton label="Maybe later" onPress={onMaybeLater} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    justifyContent: 'center',
    gap: MC.titleBodyGap + 4,
  },
  title: {
    fontSize: MC.largeTitle,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.5,
    fontFamily: 'Manrope_700Bold',
  },
  paragraph: {
    fontSize: MC.body,
    lineHeight: 28,
    fontFamily: 'Manrope_400Regular',
  },
  footer: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: MC.aboveCta,
    gap: 4,
  },
});
