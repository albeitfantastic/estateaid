import { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const C = {
  bg: '#FAFAF8',
  navy: '#1C3D5A',
  gold: '#C9A96E',
  text: '#0E1C2D',
  muted: '#6B7A8D',
  border: '#E5E7EA',
  surface: '#FFFFFF',
};

const APP_STORE_URL = 'https://apps.apple.com/app/estateaid';

export default function RatingScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  function proceed() {
    router.push('/(onboarding)/paywall' as never);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Quick favour</Text>
        <Text style={styles.title}>Enjoying EstateAid{'\n'}so far?</Text>
        <Text style={styles.subtitle}>
          Your rating helps others discover the app and helps us keep improving it.
        </Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setSelected(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Text style={[styles.star, star <= (selected ?? 0) && styles.starFilled]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected !== null && (
          <Text style={styles.ratingLabel}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][selected]}
          </Text>
        )}

        {/* Rate on App Store */}
        {selected !== null && selected >= 4 && (
          <TouchableOpacity
            style={styles.appStoreBtn}
            onPress={() => {
              Linking.openURL(APP_STORE_URL);
              proceed();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.appStoreBtnText}>⭐ Rate on the App Store</Text>
          </TouchableOpacity>
        )}

        {selected !== null && selected < 4 && (
          <View style={styles.feedbackNote}>
            <Text style={styles.feedbackNoteText}>
              Thanks for the honest feedback — we're working on making it better.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, selected === null && styles.btnDisabled]}
          onPress={proceed}
          disabled={selected === null}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {selected !== null && selected >= 4 ? 'Continue' : 'Continue anyway'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={proceed} style={styles.skipLink}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: C.text,
    lineHeight: 38,
    letterSpacing: -0.5,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    alignSelf: 'flex-start',
    marginBottom: 48,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  starBtn: { padding: 4 },
  star: {
    fontSize: 52,
    color: C.border,
  },
  starFilled: {
    color: C.gold,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: C.navy,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  appStoreBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  appStoreBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackNote: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    maxWidth: 300,
  },
  feedbackNoteText: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  btn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: C.border },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  skipLink: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: C.muted },
});
