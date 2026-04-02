import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/store/auth-store';

const C = {
  bg: '#F4F4F2',
  navy: '#234536',
  gold: '#607D8B',
  text: '#1A2B28',
  muted: '#607D8B',
  border: '#DDE1E0',
  surface: '#FFFFFF',
  success: '#2D7D52',
  error: '#C0392B',
};

export default function RedeemScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { completeOnboarding, setPendingInviteCode } = useAuthStore();
  const [code, setCode] = useState('');

  function proceed(withCode?: string) {
    if (withCode) {
      const normalized = withCode.toUpperCase().trim();
      if (normalized.length !== 8 || !/^[A-Z0-9]{8}$/.test(normalized)) {
        Alert.alert(t('redeem.invalidTitle'), t('redeem.invalidBody'));
        return;
      }
      setPendingInviteCode(normalized);
    }
    completeOnboarding();
    if (withCode) {
      router.replace('/(app)/home' as never);
    } else {
      router.replace('/(auth)' as never);
    }
  }

  const isValidLength = code.replace(/\s/g, '').length === 8;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t('redeem.eyebrow')}</Text>
        <Text style={styles.title}>{t('redeem.title')}</Text>
        <Text style={styles.subtitle}>{t('redeem.subtitle')}</Text>

        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.codeInput, { borderColor: code.length > 0 ? C.navy : C.border }]}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder={t('redeem.placeholder')}
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          {isValidLength && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <Text style={styles.hint}>{t('redeem.hint')}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !isValidLength && styles.btnDisabled]}
          onPress={() => proceed(code)}
          disabled={!isValidLength}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{t('redeem.redeemCta')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => proceed()} style={styles.skipLink}>
          <Text style={styles.skipText}>{t('redeem.skip')}</Text>
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
  },
  eyebrow: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: C.text,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 40,
  },
  inputWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 6,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -12,
    fontSize: 22,
    color: C.success,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  btn: {
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: C.border },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  skipLink: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: C.muted },
});
