import { Linking, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { generateId, generateInviteCode } from '@/lib/id';

const APP_STORE_URL = 'https://apps.apple.com/app/estateaid';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.estateaid';

function buildShareText(estateName: string, code: string, note?: string): string {
  const noteSection = note ? `\n\n"${note}"` : '';
  return (
    `🏡 You're invited to ${estateName} on EstateAid!${noteSection}\n\n` +
    `Your invite code: ${code}\n\n` +
    `Download the app:\n` +
    `iOS: ${APP_STORE_URL}\n` +
    `Android: ${PLAY_STORE_URL}\n\n` +
    `Enter your code after signing up as a Guest.`
  );
}

export default function InviteGuest() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const { sendInvitation } = useInvitationStore();
  const { getEstateById } = useEstateStore();
  const estate = getEstateById(estateId);

  const [note, setNote] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  function createInvite() {
    const code = generateInviteCode();
    sendInvitation({
      id: generateId(),
      estateId,
      ownerId: currentUser!.id,
      inviteCode: code,
      message: note.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    setCreatedCode(code);
  }

  function shareVia(platform: 'whatsapp' | 'telegram' | 'native') {
    if (!createdCode || !estate) return;
    const text = buildShareText(estate.name, createdCode, note.trim() || undefined);

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
        <ThemedText type="title" style={styles.title}>Invite Guest</ThemedText>
        {createdCode && (
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Done</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!createdCode ? (
          <>
            <View style={[styles.infoBox, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
              <IconSymbol name="info.circle.fill" size={18} color={colors.tint} />
              <ThemedText style={[styles.infoText, { color: colors.tint }]}>
                A unique invite code will be generated. Share it with your guest via WhatsApp, Telegram, or any messaging app.
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>Personal Note (optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.icon + '44' }]}
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
              style={[styles.createBtn, { backgroundColor: colors.tint }]}
              onPress={createInvite}
              activeOpacity={0.85}
            >
              <IconSymbol name="key.fill" size={18} color="#fff" />
              <ThemedText style={styles.createBtnText}>Generate Invite Code</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Code display */}
            <View style={[styles.codeCard, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '40' }]}>
              <ThemedText style={[styles.codeLabel, { color: colors.icon }]}>INVITE CODE</ThemedText>
              <ThemedText style={[styles.code, { color: colors.tint }]}>{createdCode}</ThemedText>
              <ThemedText style={[styles.codeHint, { color: colors.icon }]}>
                Share this code with your guest. It can only be used once.
              </ThemedText>
            </View>

            {/* Share via */}
            <ThemedText style={[styles.shareLabel, { color: colors.icon }]}>Share via</ThemedText>

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
  form: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multiline: { height: 100, paddingTop: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  codeCard: { borderRadius: 20, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 8 },
  codeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 8 },
  codeHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  shareLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
