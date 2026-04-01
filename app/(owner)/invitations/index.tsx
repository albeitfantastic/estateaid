import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { formatDate } from '@/lib/date-utils';

export default function OwnerInvitations() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const { getPendingInvitationsForGuest, respondToInvitation, redeemCode } = useInvitationStore();
  const { getEstateById } = useEstateStore();

  const [codeInput, setCodeInput] = useState('');
  const [redeemError, setRedeemError] = useState('');

  const invitations = getPendingInvitationsForGuest(currentUser?.id ?? '', currentUser?.email);
  const profileById = useProfileStore((s) => s.byId);
  const ownerLabels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const inv of invitations) {
      if (!m[inv.ownerId]) {
        m[inv.ownerId] = resolveUserDisplayName(inv.ownerId, profileById);
      }
    }
    return m;
  }, [invitations, profileById]);

  function accept(id: string) {
    respondToInvitation(id, 'accepted', currentUser?.id);
  }
  function decline(id: string) {
    respondToInvitation(id, 'declined');
  }

  async function handleRedeem() {
    if (!currentUser) return;
    const result = await redeemCode(codeInput, currentUser.id);
    if (result.success) {
      const estate = getEstateById(result.invitation!.estateId);
      setCodeInput('');
      setRedeemError('');
      Alert.alert(
        t('guestInvitations.accessGrantedTitle'),
        t('guestInvitations.accessGrantedBody', { name: estate?.name ?? t('guestInvitations.defaultAccessName') })
      );
    } else if (result.reason === 'fetch_error') {
      setRedeemError(t('guestInvitations.errFetch'));
    } else if (result.reason === 'update_failed') {
      setRedeemError(t('guestInvitations.errUpdate'));
    } else if (result.reason === 'wrong_invitee') {
      setRedeemError(t('guestInvitations.errWrongInvitee'));
    } else if (result.reason === 'no_session_email') {
      setRedeemError(t('guestInvitations.errNoEmail'));
    } else if (result.reason === 'invite_missing_email') {
      setRedeemError(t('guestInvitations.errOutdated'));
    } else {
      setRedeemError(t('guestInvitations.errGeneric'));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <ThemedText type="title" style={styles.title}>{t('guestInvitations.title')}</ThemedText>
        </View>

        <View style={[styles.redeemBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText style={[styles.redeemTitle, { color: colors.text }]}>{t('guestInvitations.redeemTitle')}</ThemedText>
          <ThemedText style={[styles.redeemSub, { color: colors.icon }]}>{t('guestInvitations.redeemSub')}</ThemedText>
          <View style={styles.redeemRow}>
            <TextInput
              style={[styles.codeInput, { color: colors.text, borderColor: redeemError ? colors.error : colors.icon + '44' }]}
              value={codeInput}
              onChangeText={(v) => {
                setCodeInput(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setRedeemError('');
              }}
              placeholder={t('guestInvitations.placeholder')}
              placeholderTextColor={colors.icon}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.redeemBtn, { backgroundColor: codeInput.length === 8 ? colors.tint : colors.border }]}
              onPress={() => void handleRedeem()}
              disabled={codeInput.length !== 8}
              activeOpacity={0.85}
            >
              <ThemedText style={[styles.redeemBtnText, { color: codeInput.length === 8 ? '#fff' : colors.icon }]}>
                {t('actions.redeem')}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {redeemError ? (
            <ThemedText style={[styles.redeemError, { color: colors.error }]}>{redeemError}</ThemedText>
          ) : null}
        </View>

        {invitations.length === 0 ? (
          <EmptyState
            icon="envelope.fill"
            title={t('guestInvitations.emptyTitle')}
            subtitle={t('guestInvitations.emptySubOwner')}
          />
        ) : (
          <View style={styles.list}>
            {invitations.map((inv) => {
              const estate = getEstateById(inv.estateId);
              const ownerName = ownerLabels[inv.ownerId] ?? t('guestInvitations.ownerFallback');
              return (
                <View
                  key={inv.id}
                  style={[styles.card, { borderColor: colors.tint + '44', backgroundColor: colors.surface }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: colors.tint + '18' }]}>
                    <IconSymbol name="building.2.fill" size={24} color={colors.tint} />
                  </View>
                  <View style={styles.body}>
                    <ThemedText type="defaultSemiBold" style={styles.estateName}>
                      {estate?.name ?? t('common.unknownEstate')}
                    </ThemedText>
                    <ThemedText style={[styles.meta, { color: colors.icon }]}>
                      {estate?.location} · {t('guestInvitations.fromHost', { name: ownerName })}
                    </ThemedText>
                    {inv.message && (
                      <ThemedText style={[styles.message, { color: colors.text }]} numberOfLines={3}>
                        "{inv.message}"
                      </ThemedText>
                    )}
                    <ThemedText style={[styles.date, { color: colors.icon }]}>
                      {formatDate(inv.createdAt.slice(0, 10))}
                    </ThemedText>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.tint }]}
                        onPress={() => accept(inv.id)}
                        activeOpacity={0.8}
                      >
                        <ThemedText style={styles.btnText}>{t('actions.accept')}</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, styles.btnOutline, { borderColor: colors.icon + '55' }]}
                        onPress={() => decline(inv.id)}
                        activeOpacity={0.8}
                      >
                        <ThemedText style={[styles.btnText, { color: colors.icon }]}>{t('actions.decline')}</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  redeemBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  redeemTitle: { fontSize: 16, fontWeight: '700' },
  redeemSub: { fontSize: 13, lineHeight: 18 },
  redeemRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  redeemBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemBtnText: { fontWeight: '700', fontSize: 15 },
  redeemError: { fontSize: 12, lineHeight: 16 },
  list: {},
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  estateName: { fontSize: 16 },
  meta: { fontSize: 13 },
  message: { fontSize: 13, lineHeight: 18, fontStyle: 'italic', marginVertical: 4 },
  date: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
