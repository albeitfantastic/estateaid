import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { InviteShareChannelsModal } from '@/components/invite-share-channels-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { generateInviteCode, generateUuidV4 } from '@/lib/id';
import {
  buildMultiInviteShareMessage,
  buildWhatsAppMultiInviteMessage,
  inviteEmailSubject,
} from '@/lib/invite-messages';

export default function InviteGuest() {
  const { t } = useTranslation();
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
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const openSuffix = t('ownerInvite.openInviteSuffix');
  const sharePayload = useMemo(() => {
    if (!createdCode || !estate) {
      return { shareBody: '', waBody: '', subject: '' };
    }
    const items = [{ estateName: estate.name, inviteCode: createdCode, role: 'guest' as const }];
    const noteOpt = note.trim() || undefined;
    return {
      shareBody: buildMultiInviteShareMessage(items, { note: noteOpt, openInviteSuffix: openSuffix }),
      waBody: buildWhatsAppMultiInviteMessage(items, { note: noteOpt, openInviteSuffix: openSuffix }),
      subject: inviteEmailSubject([estate.name]),
    };
  }, [createdCode, estate, note, openSuffix]);

  async function createInvite() {
    if (!estate) return;
    const code = generateInviteCode();
    const { error } = await sendInvitation({
      id: generateUuidV4(),
      estateId,
      ownerId: currentUser!.id,
      inviteCode: code,
      role: 'guest',
      message: note.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    if (error) {
      Alert.alert(t('ownerInvite.saveFailedTitle'), error);
      return;
    }
    setCreatedCode(code);
    setShareModalVisible(true);
  }

  if (!estate) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            {t('titles.invite')}
          </ThemedText>
        </View>
        <ThemedText style={{ padding: 24 }}>Estate not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <InviteShareChannelsModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        shareBody={sharePayload.shareBody}
        waBody={sharePayload.waBody}
        emailSubject={sharePayload.subject}
        shareTitle={t('ownerInvite.shareTitle')}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {t('titles.invite')}
        </ThemedText>
        {createdCode && (
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>
              {t('ownerInvite.done')}
            </ThemedText>
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
              <ThemedText style={[styles.infoText, { color: colors.tint }]}>{t('ownerInvite.openHint')}</ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>{t('ownerInvite.noteLabel')}</ThemedText>
              <TextInput
                style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.icon + '44' }]}
                placeholder={t('ownerInvite.notePlaceholder')}
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
              onPress={() => void createInvite()}
              activeOpacity={0.85}
            >
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              <ThemedText style={styles.createBtnText}>{t('ownerInvite.sendInvitation')}</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.codeCard, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '40' }]}>
              <ThemedText style={[styles.codeLabel, { color: colors.icon }]}>INVITE CODE</ThemedText>
              <ThemedText style={[styles.code, { color: colors.tint }]}>{createdCode}</ThemedText>
              <ThemedText style={[styles.codeHint, { color: colors.icon }]}>{t('ownerInvite.codeHint')}</ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.tint }]}
              onPress={() => setShareModalVisible(true)}
              activeOpacity={0.85}
            >
              <ThemedText style={[styles.secondaryBtnText, { color: colors.tint }]}>
                {t('ownerInvite.shareAgain')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setCreatedCode(null);
                setNote('');
                setShareModalVisible(false);
              }}
              activeOpacity={0.75}
              style={{ alignSelf: 'center', paddingVertical: 8 }}
            >
              <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>
                {t('ownerInvite.createMore')}
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
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },
});
