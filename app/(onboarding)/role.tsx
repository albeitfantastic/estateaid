import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types';

const C = {
  bg: '#F4F4F2',
  navy: '#2C554E',
  gold: '#607D8B',
  text: '#1A2B28',
  muted: '#607D8B',
  border: '#DDE1E0',
  surface: '#FFFFFF',
  brown: '#2C554E',
};

interface RoleCard {
  role: UserRole;
  emoji: string;
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  tagTextColor: string;
}

export default function RoleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentUser, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const roles = useMemo<RoleCard[]>(
    () => [
      {
        role: 'owner',
        emoji: '🏡',
        title: t('role.ownerTitle'),
        desc: t('role.ownerDesc'),
        tag: t('role.ownerTag'),
        tagColor: C.navy,
        tagTextColor: '#FFFFFF',
      },
      {
        role: 'guest',
        emoji: '🛎️',
        title: t('role.guestTitle'),
        desc: t('role.guestDesc'),
        tag: t('role.guestTag'),
        tagColor: C.gold + '30',
        tagTextColor: C.navy,
      },
    ],
    [t]
  );

  async function chooseRole(role: UserRole) {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', currentUser.id);
      if (error) {
        Alert.alert(t('role.saveErrorTitle'), t('role.saveErrorBody'));
        return;
      }
      setUser({ ...currentUser, role });
      if (role === 'guest') {
        router.push({ pathname: '/(onboarding)/rating', params: { role } } as never);
      } else {
        router.push({ pathname: '/(onboarding)/rating', params: { role } } as never);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t('role.eyebrow')}</Text>
        <Text style={styles.title}>{t('role.title')}</Text>
        <Text style={styles.subtitle}>{t('role.subtitle')}</Text>

        <View style={styles.cards}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item.role}
              style={styles.card}
              onPress={() => chooseRole(item.role)}
              disabled={saving}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.tagColor + (item.role === 'owner' ? '15' : '') }]}>
                <Text style={styles.iconEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: item.tagColor }]}>
                <Text style={[styles.tagText, { color: item.tagTextColor }]}>{item.tag}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {saving && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={C.navy} size="large" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  eyebrow: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: C.text,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    lineHeight: 24,
    marginBottom: 40,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.navy + '15',
  },
  iconEmoji: {
    fontSize: 28,
  },
  cardBody: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  cardDesc: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
