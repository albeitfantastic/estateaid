import { Linking, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { InvitationRole } from '@/types';
import { generateId, generateInviteCode } from '@/lib/id';

const APP_STORE_URL = 'https://apps.apple.com/app/estateaid';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.estateaid';

const ROLES: { value: InvitationRole; label: string; description: string }[] = [
  { value: 'guest', label: 'Guest', description: 'Can view estate info and request stays' },
  { value: 'admin', label: 'Admin', description: 'Can manage stays and tickets' },
  { value: 'owner', label: 'Owner', description: 'Full access including estate settings' },
];

function buildShareText(estateName: string, code: string, role: InvitationRole, note?: string): string {
  const noteSection = note ? `\n\n"${note}"` : '';
  return (
    `🏡 You're invited to ${estateName} on EstateAid as ${role}!${noteSection}\n\n` +
    `Your invite code: ${code}\n\n` +
    `Download the app:\n` +
    `iOS: ${APP_STORE_URL}\n` +
    `Android: ${PLAY_STORE_URL}\n\n` +
    `Enter your code after signing up.`
  );
}

export default function InviteUser() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { sendInvitation } = useInvitationStore();

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(
    estates.length === 1 ? estates[0].id : null
  );
  const [selectedRole, setSelectedRole] = useState<InvitationRole>('guest');
  const [note, setNote] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const selectedEstate = estates.find((e) => e.id === selectedEstateId);

  function createInvite() {
    if (!selectedEstateId) return;
    const code = generateInviteCode();
    sendInvitation({
      id: generateId(),
      estateId: selectedEstateId,
      ownerId: currentUser!.id,
      inviteCode: code,
      role: selectedRole,
      message: note.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    setCreatedCode(code);
  }

  function shareVia(platform: 'whatsapp' | 'telegram' | 'native') {
    if (!createdCode || !selectedEstate) return;
    const text = buildShareText(selectedEstate.name, createdCode, selectedRole, note.trim() || undefined);
    if (platform === 'whatsapp') {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else if (platform === 'telegram') {
      Linking.openURL(
        `https://t.me/share/url?url=${encodeURIComponent(APP_STORE_URL)}&text=${encodeURIComponent(text)}`
      );
    } else {
      Share.share({ message: text });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Invite User</ThemedText>
        {createdCode && (
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Done</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!createdCode ? (
          <>
            {/* Estate picker */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>Property</ThemedText>
              <View style={styles.pillRow}>
                {estates.map((e, i) => {
                  const selected = e.id === selectedEstateId;
                  const dotColor = EstateColors[i % EstateColors.length];
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: selected ? dotColor + '22' : colors.background,
                          borderColor: selected ? dotColor : colors.icon + '33',
                        },
                      ]}
                      onPress={() => { setSelectedEstateId(e.id); setCreatedCode(null); }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.dot, { backgroundColor: dotColor }]} />
                      <ThemedText style={[styles.pillText, selected && { color: dotColor, fontWeight: '600' }]}>
                        {e.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Role picker */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>Role</ThemedText>
              <View style={styles.roleList}>
                {ROLES.map((r) => {
                  const selected = r.value === selectedRole;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.roleRow,
                        {
                          backgroundColor: selected ? colors.tint + '12' : colors.background,
                          borderColor: selected ? colors.tint : colors.icon + '33',
                        },
                      ]}
                      onPress={() => setSelectedRole(r.value)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.roleText}>
                        <ThemedText style={[styles.roleLabel, selected && { color: colors.tint, fontWeight: '700' }]}>
                          {r.label}
                        </ThemedText>
                        <ThemedText style={[styles.roleDesc, { color: colors.icon }]}>{r.description}</ThemedText>
                      </View>
                      {selected && <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tint} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Note */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>Personal Note (optional)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
                placeholder="e.g. Looking forward to seeing you this summer!"
                placeholderTextColor={colors.icon}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.tint }, !selectedEstateId && styles.disabled]}
              onPress={createInvite}
              disabled={!selectedEstateId}
              activeOpacity={0.85}
            >
              <IconSymbol name="key.fill" size={18} color="#fff" />
              <ThemedText style={styles.createBtnText}>Generate Invite Code</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.codeCard, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '40' }]}>
              <ThemedText style={[styles.codeLabel, { color: colors.icon }]}>INVITE CODE</ThemedText>
              <ThemedText style={[styles.code, { color: colors.tint }]}>{createdCode}</ThemedText>
              <ThemedText style={[styles.codeHint, { color: colors.icon }]}>
                {selectedEstate?.name} · {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </ThemedText>
              <ThemedText style={[styles.codeHint, { color: colors.icon }]}>
                Share this code with your invitee. It can only be used once.
              </ThemedText>
            </View>

            <ThemedText style={[styles.label, { color: colors.icon }]}>Share via</ThemedText>

            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: '#25D366' }]}
              onPress={() => shareVia('whatsapp')}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.shareBtnText}>WhatsApp</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: '#0088CC' }]}
              onPress={() => shareVia('telegram')}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.shareBtnText}>Telegram</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.tint }]}
              onPress={() => shareVia('native')}
              activeOpacity={0.85}
            >
              <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
              <ThemedText style={styles.shareBtnText}>More options…</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, gap: 24, paddingTop: 4 },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 14 },
  roleList: { gap: 8 },
  roleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12 },
  roleText: { flex: 1, gap: 2 },
  roleLabel: { fontSize: 15 },
  roleDesc: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, height: 100, paddingTop: 12 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 18, marginTop: 4 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  codeCard: { borderRadius: 20, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 8 },
  codeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 8 },
  codeHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
