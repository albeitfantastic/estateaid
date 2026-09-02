import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InviteShareChannelsModal } from '@/components/invite-share-channels-modal';
import { FocusInput, inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  OutlineButton,
  FilledButton,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useCan } from '@/lib/entitlements/capabilities';
import { OWNER_CAP, OWNER_INVITE_CAP } from '@/lib/entitlements/constants';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { useAuthStore } from '@/store/auth-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import type { EstateInviteRole } from '@/types';
import { generateInviteCode, generateUuidV4 } from '@/lib/id';
import {
  buildMessengerInviteShareMessage,
  buildMultiInviteShareMessage,
  inviteEmailSubject,
  inviteHttpsLink,
} from '@/lib/invite-messages';

export default function InviteGuest() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const can = useCan();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { sendInvitation } = useInvitationStore();
  const { getEstateById } = useEstateStore();
  const estate = getEstateById(estateId);
  const coverage = useEstateCoverageStore((s) => s.byId[estateId]);
  const fetchCoverage = useEstateCoverageStore((s) => s.fetchCoverage);

  const [note, setNote] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [role, setRole] = useState<EstateInviteRole>('guest');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const canInviteGuest = can('guests.invite', { estateId });
  const canInviteOwner = can('owners.invite', { estateId });
  const allowed = canInviteGuest || canInviteOwner;
  const guestsListPath = `/(app)/estates/${estateId}/guests`;
  const atCap = (coverage?.ownerCount ?? (coverage?.coOwnerCount ?? 0) + 1) >= OWNER_CAP;
  const uncovered = coverage != null && !coverage.covered;

  useEffect(() => {
    if (estateId) void fetchCoverage([estateId]);
  }, [estateId, fetchCoverage]);

  useEffect(() => {
    if (allowed) return;
    openHostCapabilityDenied(estateId, 'guests.invite', guestsListPath);
    router.replace(guestsListPath as never);
  }, [allowed, estateId, guestsListPath, router]);

  useEffect(() => {
    if (role === 'owner' && !canInviteOwner) setRole('guest');
  }, [role, canInviteOwner]);

  const openSuffix = t('ownerInvite.openInviteSuffix');
  const sharePayload = useMemo(() => {
    if (!createdCode || !estate) {
      return { shareBody: '', messengerBody: '', subject: '' };
    }
    const items = [{ estateName: estate.name, inviteCode: createdCode, role }];
    const noteOpt = note.trim() || undefined;
    const shareBody = buildMultiInviteShareMessage(items, { note: noteOpt, openInviteSuffix: openSuffix });
    const messengerBody = buildMessengerInviteShareMessage(items, { note: noteOpt, openInviteSuffix: openSuffix });
    return {
      shareBody,
      messengerBody,
      subject: inviteEmailSubject([estate.name]),
    };
  }, [createdCode, estate, note, openSuffix, role]);

  async function createInvite() {
    if (!estate) return;
    if (role === 'owner' && !canInviteOwner) {
      Alert.alert(
        t('ownerInvite.saveFailedTitle'),
        uncovered
          ? 'Host invites need an active subscription on this property.'
          : atCap
            ? `This property already has ${OWNER_CAP} hosts (including sponsor; max ${OWNER_INVITE_CAP} invited).`
            : 'Host invites are not available.'
      );
      return;
    }
    const code = generateInviteCode();
    const { error, code: errCode } = await sendInvitation({
      id: generateUuidV4(),
      estateId,
      ownerId: currentUser!.id,
      inviteCode: code,
      role,
      message: note.trim() || undefined,
      inviteeLabel: sendTo.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    if (error) {
      if (errCode === 'co_owner_cap_reached') {
        Alert.alert(
          t('ownerInvite.saveFailedTitle'),
          `Host limit reached (${OWNER_CAP} including sponsor).`
        );
        return;
      }
      Alert.alert(t('ownerInvite.saveFailedTitle'), error);
      return;
    }
    setCreatedCode(code);
    setShareModalVisible(true);
  }

  if (!allowed) {
    return (
      <ScreenShell title={t('titles.invite')} onBack={() => router.replace(guestsListPath as never)}>
        <View />
      </ScreenShell>
    );
  }

  if (!estate) {
    return (
      <ScreenShell title={t('titles.invite')}>
        <ThemedText style={{ padding: 24 }}>Estate not found.</ThemedText>
      </ScreenShell>
    );
  }

  const ownerDisabledReason = uncovered
    ? 'Needs an active subscription on this property'
    : atCap
      ? `Limit reached (${OWNER_CAP} hosts including sponsor; max ${OWNER_INVITE_CAP} invited)`
      : null;

  return (
    <ScreenShell title={t('titles.invite')}>
      <InviteShareChannelsModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        shareBody={sharePayload.shareBody}
        messengerBody={sharePayload.messengerBody}
        emailSubject={sharePayload.subject}
        shareTitle={t('ownerInvite.shareTitle')}
        previewNote={note.trim() || undefined}
        previewItems={createdCode && estate ? [{ estateName: estate.name, inviteCode: createdCode }] : []}
      />

      <ScreenScroll contentContainerStyle={styles.form} gap={16} keyboardShouldPersistTaps="handled">
        {!createdCode ? (
          <>
            <View style={[styles.infoBox, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
              <IconSymbol name="info.circle.fill" size={18} color={colors.tint} />
              <ThemedText style={[styles.infoText, { color: colors.tint }]}>{t('ownerInvite.openHint')}</ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
                {t('ownerInvite.roleLabel')}
              </ThemedText>
              <View style={styles.roleRow}>
                {(
                  [
                    { value: 'guest' as const, label: t('ownerInvite.estateRoleGuestLabel'), disabled: false },
                    {
                      value: 'owner' as const,
                      label: t('ownerInvite.estateRoleCoOwnerLabel'),
                      disabled: !canInviteOwner,
                    },
                  ]
                ).map((opt) => {
                  const selected = role === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      disabled={opt.disabled}
                      onPress={() => setRole(opt.value)}
                      style={[
                        styles.rolePill,
                        {
                          borderColor: selected ? colors.tint : colors.icon + '44',
                          backgroundColor: selected ? colors.tint + '18' : 'transparent',
                          opacity: opt.disabled ? 0.45 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: selected ? colors.tint : colors.text,
                          fontWeight: selected ? '700' : '500',
                          fontSize: 14,
                        }}
                      >
                        {opt.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {ownerDisabledReason ? (
                <ThemedText style={[styles.capHint, { color: colors.icon }]}>
                  Host: {ownerDisabledReason}
                </ThemedText>
              ) : null}
            </View>

            <FocusInput
              label={t('ownerInvite.inviteeLabel')}
              placeholder={t('ownerInvite.inviteePlaceholder')}
              value={sendTo}
              onChangeText={setSendTo}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <FocusInput
              label={t('ownerInvite.noteLabel')}
              placeholder={t('ownerInvite.notePlaceholder')}
              value={note}
              onChangeText={setNote}
            />

            <FilledButton
              label={t('ownerInvite.sendInvitation')}
              onPress={() => void createInvite()}
              style={{ marginTop: 20 }}
            />
          </>
        ) : (
          <>
            {note.trim() ? (
              <View style={[styles.noteCard, { borderColor: colors.icon + '28', backgroundColor: colors.background }]}>
                <ThemedText style={[styles.previewLabel, { color: colors.icon }]}>
                  {t('ownerInvite.sharePreviewNote')}
                </ThemedText>
                <ThemedText style={styles.noteText}>{note.trim()}</ThemedText>
              </View>
            ) : null}

            <View style={[styles.linkCard, { borderColor: colors.tint + '40', backgroundColor: colors.tint + '08' }]}>
              <ThemedText style={[styles.previewLabel, { color: colors.icon }]}>
                {t('ownerInvite.sharePreviewLink')}
              </ThemedText>
              <ThemedText style={[styles.linkText, { color: colors.tint }]} selectable>
                {inviteHttpsLink(createdCode!)}
              </ThemedText>
            </View>

            <View style={[styles.codeCard, { backgroundColor: colors.tint + '08', borderColor: colors.tint + '40' }]}>
              <ThemedText style={[styles.previewLabel, { color: colors.icon }]}>
                {t('ownerInvite.sharePreviewCode')}
              </ThemedText>
              <ThemedText style={[styles.code, { color: colors.tint }]} selectable>
                {createdCode}
              </ThemedText>
              <ThemedText style={[styles.codeHint, { color: colors.icon }]}>{t('ownerInvite.codeHint')}</ThemedText>
            </View>

            <OutlineButton
              label={t('ownerInvite.shareAgain')}
              onPress={() => setShareModalVisible(true)}
            />

            <TouchableOpacity
              onPress={() => {
                setCreatedCode(null);
                setNote('');
                setSendTo('');
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
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  field: { gap: 6 },
  roleRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  capHint: { fontSize: 12, marginTop: 4 },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  noteCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  noteText: { fontSize: 15, lineHeight: 21 },
  linkCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  linkText: { fontSize: 14, lineHeight: 20 },
  codeCard: { borderRadius: 20, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 8 },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 8 },
  codeHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
