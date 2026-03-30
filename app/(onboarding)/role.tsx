import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types';

const C = {
  bg: '#FAFAF8',
  navy: '#1C3D5A',
  gold: '#C9A96E',
  text: '#0E1C2D',
  muted: '#6B7A8D',
  border: '#E5E7EA',
  surface: '#FFFFFF',
  brown: '#5C3D2E',
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

const ROLES: RoleCard[] = [
  {
    role: 'owner',
    emoji: '🏡',
    title: "I'm a Property Owner",
    desc: 'Manage estates, invite guests, approve stays and keep everything in one place.',
    tag: 'From €5/week',
    tagColor: C.navy,
    tagTextColor: '#FFFFFF',
  },
  {
    role: 'admin',
    emoji: '🗝️',
    title: "I'm an Estate Manager",
    desc: 'Help manage properties on behalf of an owner — approve stays, handle guests and more.',
    tag: 'Invite only',
    tagColor: C.brown + '22',
    tagTextColor: C.brown,
  },
  {
    role: 'guest',
    emoji: '🛎️',
    title: "I'm a Guest",
    desc: 'View properties you\'ve been invited to, request stays and raise any issues.',
    tag: 'Always free',
    tagColor: C.gold + '30',
    tagTextColor: C.navy,
  },
];

export default function RoleScreen() {
  const router = useRouter();
  const { currentUser, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  async function chooseRole(role: UserRole) {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', currentUser.id);
      if (error) {
        Alert.alert('Error', 'Could not save your role. Please try again.');
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
        <Text style={styles.eyebrow}>Almost there</Text>
        <Text style={styles.title}>How will you use{'\n'}EstateAid?</Text>
        <Text style={styles.subtitle}>
          Choose your role. You can always switch later.
        </Text>

        <View style={styles.cards}>
          {ROLES.map((item) => (
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
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
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
