import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthStore, OwnerTier } from '@/store/auth-store';

const C = {
  bg: '#FAFAF8',
  navy: '#1C3D5A',
  gold: '#C9A96E',
  text: '#0E1C2D',
  muted: '#6B7A8D',
  border: '#E5E7EA',
  surface: '#FFFFFF',
  success: '#2D7D52',
};

const TIERS: {
  id: OwnerTier;
  name: string;
  tagline: string;
  limit: string;
  weekly: string;
  annual: string;
  annualMonthly: string;
  badge?: string;
}[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Perfect for a single home or a small portfolio.',
    limit: 'Up to 3 properties',
    weekly: '€5',
    annual: '€150',
    annualMonthly: '€12.50/mo',
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'For those who manage multiple estates.',
    limit: 'Unlimited properties',
    weekly: '€7',
    annual: '€200',
    annualMonthly: '€16.67/mo',
    badge: 'Best value',
  },
];

export default function Paywall() {
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [selectedTier, setSelectedTier] = useState<OwnerTier>('starter');
  const [billing, setBilling] = useState<'weekly' | 'annual'>('annual');

  function proceed() {
    completeOnboarding(selectedTier);
    router.replace('/(auth)' as never);
  }

  function skipAsGuest() {
    completeOnboarding();
    router.replace('/(auth)' as never);
  }

  const tier = TIERS.find((t) => t.id === selectedTier)!;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>EstateAid</Text>
          <Text style={styles.title}>Unlock Pro Access</Text>
          <Text style={styles.subtitle}>
            Everything you need to manage your properties, your guests, and your time.
          </Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.toggleWrap}>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'weekly' && styles.toggleBtnActive]}
            onPress={() => setBilling('weekly')}
          >
            <Text style={[styles.toggleText, billing === 'weekly' && styles.toggleTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'annual' && styles.toggleBtnActive]}
            onPress={() => setBilling('annual')}
          >
            <Text style={[styles.toggleText, billing === 'annual' && styles.toggleTextActive]}>
              Annual
            </Text>
            <View style={styles.savePill}>
              <Text style={styles.saveText}>Save ~60%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tier cards */}
        <View style={styles.tiersWrap}>
          {TIERS.map((t) => {
            const active = selectedTier === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tierCard, active && styles.tierCardActive]}
                onPress={() => setSelectedTier(t.id)}
                activeOpacity={0.85}
              >
                {t.badge && (
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>{t.badge}</Text>
                  </View>
                )}
                <View style={styles.tierHeader}>
                  <Text style={[styles.tierName, active && styles.tierNameActive]}>{t.name}</Text>
                  <View style={[styles.radioSmall, active && styles.radioSmallActive]}>
                    {active && <View style={styles.radioSmallInner} />}
                  </View>
                </View>
                <Text style={styles.tierLimit}>{t.limit}</Text>
                <Text style={styles.tierTagline}>{t.tagline}</Text>
                <View style={styles.tierPriceRow}>
                  <Text style={[styles.tierPrice, active && styles.tierPriceActive]}>
                    {billing === 'weekly' ? t.weekly : t.annual}
                  </Text>
                  <Text style={styles.tierPricePer}>
                    {billing === 'weekly' ? ' / week' : ' / year'}
                  </Text>
                </View>
                {billing === 'annual' && (
                  <Text style={styles.tierMonthly}>≈ {t.annualMonthly}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            'Unlimited stay requests & approvals',
            'Guest invitations & access control',
            'Integrated calendar with conflict detection',
            'FAQ, document vault & contacts per estate',
            'Issue ticketing with threaded conversations',
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={proceed} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            Start with {tier.name} —{' '}
            {billing === 'weekly' ? `${tier.weekly}/week` : `${tier.annual}/year`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={skipAsGuest} style={styles.guestLink}>
          <Text style={styles.guestLinkText}>I'm a guest, sign in free →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, gap: 32 },
  header: { gap: 8 },
  logo: {
    fontSize: 13,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5, lineHeight: 38 },
  subtitle: { fontSize: 15, color: C.muted, lineHeight: 22 },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: C.navy },
  toggleText: { fontSize: 14, fontWeight: '600', color: C.muted },
  toggleTextActive: { color: '#FFFFFF' },
  savePill: {
    backgroundColor: C.gold + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveText: { fontSize: 10, fontWeight: '700', color: C.gold },
  tiersWrap: { gap: 12 },
  tierCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    gap: 6,
  },
  tierCardActive: { borderColor: C.navy, backgroundColor: '#F0F4F8' },
  bestValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  bestValueText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierName: { fontSize: 18, fontWeight: '700', color: C.text },
  tierNameActive: { color: C.navy },
  radioSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSmallActive: { borderColor: C.navy },
  radioSmallInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.navy },
  tierLimit: { fontSize: 13, color: C.gold, fontWeight: '600' },
  tierTagline: { fontSize: 13, color: C.muted, lineHeight: 18 },
  tierPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  tierPrice: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1 },
  tierPriceActive: { color: C.navy },
  tierPricePer: { fontSize: 14, color: C.muted, marginLeft: 2 },
  tierMonthly: { fontSize: 12, color: C.muted },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureCheck: { fontSize: 14, color: C.success, fontWeight: '700', marginTop: 1 },
  featureText: { flex: 1, fontSize: 14, color: C.muted, lineHeight: 20 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
    backgroundColor: C.bg,
  },
  cta: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  guestLink: { alignItems: 'center', paddingVertical: 4 },
  guestLinkText: { fontSize: 14, color: C.muted, fontWeight: '500' },
});
