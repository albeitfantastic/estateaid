import { Alert, Linking, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
import { isPlausibleInviteEmail, normalizeGuestEmail } from '@/lib/invite-email';
import { generateInviteCode, generateUuidV4 } from '@/lib/id';
import { APP_STORE_URL, buildFullInviteMessage, buildWhatsAppInviteMessage } from '@/lib/invite-messages';

const ROLES: { value: InvitationRole; label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'owner', label: 'Owner' },
];

interface GeneratedInvite {
  estateName: string;
  estateId: string;
  role: InvitationRole;
  code: string;
}

function shareVia(
  platform: 'whatsapp' | 'telegram' | 'native',
  estateName: string,
  code: string,
  role: InvitationRole,
  note: string | undefined,
  inviteeEmail: string
) {
  if (platform === 'whatsapp') {
    const wa = buildWhatsAppInviteMessage({
      estateName,
      inviteCode: code,
      role,
      note,
      inviteeEmail,
    });
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(wa)}`);
    return;
  }
  const text = buildFullInviteMessage({
    estateName,
    inviteCode: code,
    role,
    note,
    footerLine:
      role === 'guest' ? 'Enter your code after signing up as a Guest.' : 'Enter your code after signing up.',
    inviteeEmail,
  });
  if (platform === 'telegram') {
    Linking.openURL(
      `https://t.me/share/url?url=${encodeURIComponent(APP_STORE_URL)}&text=${encodeURIComponent(text)}`
    );
  } else {
    Share.share({ message: text });
  }
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

  // estateRoles: estateId → role (only selected estates appear here)
  const [estateRoles, setEstateRoles] = useState<Record<string, InvitationRole>>({});
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [note, setNote] = useState('');
  const [createdInvites, setCreatedInvites] = useState<GeneratedInvite[]>([]);

  function toggleEstate(estateId: string) {
    setEstateRoles((prev) => {
      if (estateId in prev) {
        const next = { ...prev };
        delete next[estateId];
        return next;
      }
      return { ...prev, [estateId]: 'guest' };
    });
  }

  function setRole(estateId: string, role: InvitationRole) {
    setEstateRoles((prev) => ({ ...prev, [estateId]: role }));
  }

  async function generateCodes() {
    const emailNorm = inviteeEmail.trim();
    if (!isPlausibleInviteEmail(emailNorm)) {
      Alert.alert(
        'Invitee email',
        'Enter a valid email for the person you are inviting. Only that account can redeem each code.'
      );
      return;
    }
    const guestEmail = normalizeGuestEmail(emailNorm);
    const now = new Date().toISOString();
    const invites: GeneratedInvite[] = [];
    for (const [estateId, role] of Object.entries(estateRoles)) {
      const code = generateInviteCode();
      const { error } = await sendInvitation({
        id: generateUuidV4(),
        estateId,
        ownerId: currentUser!.id,
        inviteCode: code,
        guestEmail,
        role,
        message: note.trim() || undefined,
        status: 'pending',
        createdAt: now,
      });
      if (error) {
        Alert.alert('Could not save invite', error);
        return;
      }
      const estate = estates.find((e) => e.id === estateId)!;
      invites.push({ estateName: estate.name, estateId, role, code });
    }
    setCreatedInvites(invites);
  }

  const selectedCount = Object.keys(estateRoles).length;
  const canGenerate = selectedCount > 0 && isPlausibleInviteEmail(inviteeEmail.trim());

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Invite User</ThemedText>
        {createdInvites.length > 0 && (
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Done</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {createdInvites.length === 0 ? (
          <>
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>Invitee email (required)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon + '44', height: 50 }]}
                placeholder="guest@example.com"
                placeholderTextColor={colors.icon}
                value={inviteeEmail}
                onChangeText={setInviteeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ThemedText style={{ fontSize: 12, color: colors.icon, lineHeight: 16 }}>
                Codes only work when that person signs in with this email.
              </ThemedText>
            </View>

            {/* Estate multi-select with per-estate role */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>
                Properties{selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
              </ThemedText>
              <View style={styles.estateList}>
                {estates.map((e, i) => {
                  const isSelected = e.id in estateRoles;
                  const dotColor = EstateColors[i % EstateColors.length];
                  const currentRole = estateRoles[e.id] ?? 'guest';
                  return (
                    <View key={e.id}>
                      <TouchableOpacity
                        style={[
                          styles.estateRow,
                          {
                            backgroundColor: isSelected ? dotColor + '12' : colors.background,
                            borderColor: isSelected ? dotColor : colors.icon + '33',
                          },
                        ]}
                        onPress={() => toggleEstate(e.id)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.estateDot, { backgroundColor: dotColor }]} />
                        <ThemedText style={[styles.estateName, isSelected && { fontWeight: '600' }]}>
                          {e.name}
                        </ThemedText>
                        <View style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected ? dotColor : 'transparent',
                            borderColor: isSelected ? dotColor : colors.icon + '55',
                          },
                        ]}>
                          {isSelected && <IconSymbol name="checkmark" size={12} color="#fff" />}
                        </View>
                      </TouchableOpacity>

                      {/* Inline role picker shown when estate is selected */}
                      {isSelected && (
                        <View style={[styles.rolePicker, { borderColor: dotColor + '44', backgroundColor: dotColor + '08' }]}>
                          <ThemedText style={[styles.rolePickerLabel, { color: colors.icon }]}>Role for {e.name}</ThemedText>
                          <View style={styles.rolePills}>
                            {ROLES.map((r) => {
                              const roleSelected = currentRole === r.value;
                              return (
                                <TouchableOpacity
                                  key={r.value}
                                  style={[
                                    styles.rolePill,
                                    {
                                      backgroundColor: roleSelected ? dotColor + '22' : colors.background,
                                      borderColor: roleSelected ? dotColor : colors.icon + '33',
                                    },
                                  ]}
                                  onPress={() => setRole(e.id, r.value)}
                                  activeOpacity={0.75}
                                >
                                  <ThemedText style={[styles.rolePillText, roleSelected && { color: dotColor, fontWeight: '700' }]}>
                                    {r.label}
                                  </ThemedText>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Note */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>Personal Note (optional)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
                placeholder="e.g. Looking forward to having you!"
                placeholderTextColor={colors.icon}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: colors.tint }, !canGenerate && styles.disabled]}
              onPress={() => void generateCodes()}
              disabled={!canGenerate}
              activeOpacity={0.85}
            >
              <IconSymbol name="key.fill" size={18} color="#fff" />
              <ThemedText style={styles.generateBtnText}>
                Generate {selectedCount > 1 ? `${selectedCount} Codes` : 'Invite Code'}
              </ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.codesHeader, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '25' }]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={[styles.codesHeaderText, { color: colors.tint }]}>
                {createdInvites.length} invite code{createdInvites.length > 1 ? 's' : ''} generated
              </ThemedText>
            </View>

            {createdInvites.map((inv) => (
              <View
                key={inv.code}
                style={[styles.codeCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
              >
                <View style={styles.codeCardHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.codeEstate}>{inv.estateName}</ThemedText>
                  <View style={[styles.roleBadge, { backgroundColor: colors.tint + '15' }]}>
                    <ThemedText style={[styles.roleBadgeText, { color: colors.tint }]}>
                      {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.code, { color: colors.tint }]}>{inv.code}</ThemedText>
                <ThemedText style={[styles.codeHint, { color: colors.icon }]}>
                  For {inviteeEmail.trim()} · single use
                </ThemedText>

                <View style={styles.shareRow}>
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: '#25D366' }]}
                    onPress={() =>
                      shareVia('whatsapp', inv.estateName, inv.code, inv.role, note || undefined, inviteeEmail.trim())
                    }
                    activeOpacity={0.85}
                  >
                    <ThemedText style={styles.shareBtnText}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: '#0088CC' }]}
                    onPress={() =>
                      shareVia('telegram', inv.estateName, inv.code, inv.role, note || undefined, inviteeEmail.trim())
                    }
                    activeOpacity={0.85}
                  >
                    <ThemedText style={styles.shareBtnText}>Telegram</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: colors.tint }]}
                    onPress={() =>
                      shareVia('native', inv.estateName, inv.code, inv.role, note || undefined, inviteeEmail.trim())
                    }
                    activeOpacity={0.85}
                  >
                    <IconSymbol name="square.and.arrow.up" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => {
                setCreatedInvites([]);
                setInviteeEmail('');
              }}
              activeOpacity={0.75}
              style={{ alignSelf: 'center', paddingVertical: 12 }}
            >
              <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>
                Create more invite codes
              </ThemedText>
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

  // Estate list
  estateList: { gap: 8 },
  estateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  estateDot: { width: 10, height: 10, borderRadius: 5 },
  estateName: { flex: 1, fontSize: 15 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Inline role picker
  rolePicker: { marginTop: -4, marginBottom: 0, padding: 12, borderRadius: 12, borderWidth: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0, gap: 8 },
  rolePickerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rolePills: { flexDirection: 'row', gap: 8 },
  rolePill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  rolePillText: { fontSize: 13 },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, height: 90, paddingTop: 12 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 18 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },

  // Generated codes
  codesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  codesHeaderText: { fontSize: 14, fontWeight: '600' },
  codeCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  codeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeEstate: { fontSize: 15 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 6 },
  codeHint: { fontSize: 12 },
  shareRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  shareBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  shareBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
