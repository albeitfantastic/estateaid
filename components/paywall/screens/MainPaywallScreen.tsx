import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallHeader } from '../ui/PaywallHeader';
import { BenefitRow } from '../ui/BenefitRow';
import { PlanCard } from '../ui/PlanCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { LegalLinks } from '../ui/LegalLinks';
import { MC } from '../paywall-tokens';
import {
  BENEFITS,
  DEFAULT_PLAN_ID,
  PAYWALL_SUBTITLE,
  PAYWALL_TITLE,
  PLANS,
  TRUST_LINE,
} from '../paywall-mock-data';
import type { Plan } from '../paywall-types';

interface MainPaywallScreenProps {
  onContinue: (planId: Plan['id']) => void;
  onClose: () => void;
}

export function MainPaywallScreen({ onContinue, onClose }: MainPaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<Plan['id']>(DEFAULT_PLAN_ID);

  return (
    <View style={styles.root}>
      <PaywallHeader onClose={onClose} topInset={insets.top} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{PAYWALL_TITLE}</Text>
        <Text style={styles.subtitle}>{PAYWALL_SUBTITLE}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <BenefitRow key={i} label={b.label} />
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedId === plan.id}
              onSelect={() => setSelectedId(plan.id)}
            />
          ))}
        </View>

        {/* No-payment reassurance */}
        <Text style={styles.trustLine}>{TRUST_LINE}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton
          label="Start free trial"
          onPress={() => onContinue(selectedId)}
        />
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: MC.hPad,
    paddingTop: 8,
    paddingBottom: 16,
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
  benefits: {
    gap: 14,
  },
  plans: {
    flexDirection: 'row',
    gap: MC.cardGap,
  },
  trustLine: {
    fontSize: 13,
    color: MC.textSecondary,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: -MC.sectionGap + 8,
  },
  footer: {
    paddingHorizontal: MC.hPad,
    paddingTop: MC.aboveCta,
    backgroundColor: MC.bg,
    gap: 8,
  },
});
