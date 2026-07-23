import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { InviteShareChannelsModal } from '@/components/invite-share-channels-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import type { EstateInviteRole } from '@/types';
import { generateInviteCode, generateUuidV4 } from '@/lib/id';
import {
  buildMultiInviteShareMessage,
  buildWhatsAppMultiInviteMessage,
  inviteEmailSubject,
} from '@/lib/invite-messages';

interface GeneratedInvite {
  estateName: string;
  estateId: string;
  role: EstateInviteRole;
  code: string;
}

export type InviteContentLayout = 'stack' | 'embedded';

export function InviteContent({
  layout,
  showPersonalNote = true,
}: {
  layout: InviteContentLayout;
  /** When false, hides optional note field (e.g. Invitations tab Send). */
  showPersonalNote?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { sendInvitation } = useInvitationStore();

  const roleOptions = useMemo(
    () =>
      [
        { value: 'guest' as const, label: t('ownerInvite.estateRoleGuestLabel') },
        { value: 'owner' as const, label: t('ownerInvite.estateRoleCoOwnerLabel') },
      ] as const,
    [t]
  );

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );

  const [estateRoles, setEstateRoles] = useState<Record<string, EstateInviteRole>>({});
  const [note, setNote] = useState('');
  const [createdInvites, setCreatedInvites] = useState<GeneratedInvite[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const openSuffix = t('ownerInvite.openInviteSuffix');
  const sharePayload = useMemo(() => {
    const items = createdInvites.map((inv) => ({
      estateName: inv.estateName,
      inviteCode: inv.code,
      role: inv.role,
    }));
    const noteOpt = showPersonalNote ? note.trim() || undefined : undefined;
    return {
      shareBody: buildMultiInviteShareMessage(items, { note: noteOpt, openInviteSuffix: openSuffix }),
      waBody: buildWhatsAppMultiInviteMessage(items, { note: noteOpt, openInviteSuffix: openSuffix }),
      subject: inviteEmailSubject(createdInvites.map((i) => i.estateName)),
    };
  }, [createdInvites, note, openSuffix, showPersonalNote]);

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

  function setRole(estateId: string, role: EstateInviteRole) {
    setEstateRoles((prev) => ({ ...prev, [estateId]: role }));
  }

  async function sendInvitations() {
    const selectedCount = Object.keys(estateRoles).length;
    if (selectedCount === 0) {
      Alert.alert(t('ownerInvite.selectEstatesTitle'), t('ownerInvite.selectEstatesBody'));
      return;
    }
    const now = new Date().toISOString();
    const invites: GeneratedInvite[] = [];
    for (const [estateId, role] of Object.entries(estateRoles)) {
      const code = generateInviteCode();
      const { error } = await sendInvitation({
        id: generateUuidV4(),
        estateId,
        ownerId: currentUser!.id,
        inviteCode: code,
        role,
        message: showPersonalNote ? note.trim() || undefined : undefined,
        status: 'pending',
        createdAt: now,
      });
      if (error) {
        Alert.alert(t('ownerInvite.saveFailedTitle'), error);
        return;
      }
      const estate = estates.find((e) => e.id === estateId)!;
      invites.push({ estateName: estate.name, estateId, role, code });
    }
    setCreatedInvites(invites);
    setShareModalVisible(true);
  }

  const selectedCount = Object.keys(estateRoles).length;
  const canSend = selectedCount > 0;

  const body = (
    <>
      {createdInvites.length === 0 ? (
        <>
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>
              {t('ownerInvite.propertiesLabel')}
              {selectedCount > 0 ? ` ${t('ownerInvite.selectedCount', { count: selectedCount })}` : ''}
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
                      <ThemedText style={[styles.estateName, isSelected && { fontWeight: '600' }]}>{e.name}</ThemedText>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected ? dotColor : 'transparent',
                            borderColor: isSelected ? dotColor : colors.icon + '55',
                          },
                        ]}
                      >
                        {isSelected && <IconSymbol name="checkmark" size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>

                    {isSelected && (
                      <View
                        style={[
                          styles.rolePicker,
                          { borderColor: dotColor + '44', backgroundColor: dotColor + '08' },
                        ]}
                      >
                        <ThemedText style={[styles.rolePickerLabel, { color: colors.icon }]}>
                          {t('ownerInvite.roleFor', { name: e.name })}
                        </ThemedText>
                        <View style={styles.rolePills}>
                          {roleOptions.map((r) => {
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
                                <ThemedText
                                  style={[styles.rolePillText, roleSelected && { color: dotColor, fontWeight: '700' }]}
                                >
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

          {showPersonalNote ? (
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>{t('ownerInvite.noteLabel')}</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
                placeholder={t('ownerInvite.notePlaceholder')}
                placeholderTextColor={colors.icon}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <ThemedText style={{ fontSize: 12, color: colors.icon, lineHeight: 16 }}>
                {t('ownerInvite.openHint')}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.section}>
              <ThemedText style={{ fontSize: 12, color: colors.icon, lineHeight: 16 }}>
                {t('ownerInvite.openHint')}
              </ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.tint }, !canSend && styles.disabled]}
            onPress={() => void sendInvitations()}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#fff" />
            <ThemedText style={styles.sendBtnText}>
              {selectedCount > 1
                ? t('ownerInvite.sendInvitationCount', { count: selectedCount })
                : t('ownerInvite.sendInvitation')}
            </ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.codesHeader, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '25' }]}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tint} />
            <ThemedText style={[styles.codesHeaderText, { color: colors.tint }]}>
              {t('ownerInvite.codesGenerated', { count: createdInvites.length })}
            </ThemedText>
          </View>

          {createdInvites.map((inv) => (
            <View
              key={inv.code}
              style={[styles.codeCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
            >
              <View style={styles.codeCardHeader}>
                <ThemedText type="defaultSemiBold" style={styles.codeEstate}>
                  {inv.estateName}
                </ThemedText>
                <View style={[styles.roleBadge, { backgroundColor: colors.tint + '15' }]}>
                  <ThemedText style={[styles.roleBadgeText, { color: colors.tint }]}>
                    {inv.role === 'owner'
                      ? t('ownerInvite.estateRoleCoOwnerLabel')
                      : t('ownerInvite.estateRoleGuestLabel')}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.code, { color: colors.tint }]}>{inv.code}</ThemedText>
              <ThemedText style={[styles.codeHint, { color: colors.icon }]}>{t('ownerInvite.codeHint')}</ThemedText>
            </View>
          ))}

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
              setCreatedInvites([]);
              setShareModalVisible(false);
            }}
            activeOpacity={0.75}
            style={{ alignSelf: 'center', paddingVertical: 12 }}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>
              {t('ownerInvite.createMore')}
            </ThemedText>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  const modal = (
    <InviteShareChannelsModal
      visible={shareModalVisible}
      onClose={() => setShareModalVisible(false)}
      shareBody={sharePayload.shareBody}
      waBody={sharePayload.waBody}
      emailSubject={sharePayload.subject}
      shareTitle={t('ownerInvite.shareTitle')}
    />
  );

  if (layout === 'embedded') {
    return (
      <>
        {modal}
        <View style={styles.embeddedInner}>{body}</View>
      </>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {modal}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {t('titles.inviteUser')}
        </ThemedText>
        {createdInvites.length > 0 && (
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>
              {t('ownerInvite.done')}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {body}
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
  embeddedInner: { paddingHorizontal: 20, gap: 24, paddingTop: 4 },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  estateList: { gap: 8 },
  estateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  estateDot: { width: 10, height: 10, borderRadius: 5 },
  estateName: { flex: 1, fontSize: 15 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  rolePicker: {
    marginTop: -4,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    gap: 8,
  },
  rolePickerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rolePills: { flexDirection: 'row', gap: 8 },
  rolePill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  rolePillText: { fontSize: 13 },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, height: 90, paddingTop: 12 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 18 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },

  codesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  codesHeaderText: { fontSize: 14, fontWeight: '600' },
  codeCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  codeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeEstate: { fontSize: 15 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 6 },
  codeHint: { fontSize: 12 },
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },
});
