import { Alert, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { buildFullInviteMessage } from '@/lib/invite-messages';

export default function GuestsList() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getInvitationsByEstate, revokeInvitation } = useInvitationStore();
  const { getEstateById } = useEstateStore();
  const estate = getEstateById(estateId);
  const invitations = getInvitationsByEstate(estateId).filter((i) => i.status !== 'revoked');

  function confirmRevoke(id: string, label: string) {
    Alert.alert('Revoke Invitation', `Remove access for "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeInvitation(id) },
    ]);
  }

  function shareCode(code: string, note?: string) {
    if (!estate) return;
    Share.share({
      message: buildFullInviteMessage({
        estateName: estate.name,
        inviteCode: code,
        note,
        footerLine: 'Enter your code after signing up as a Guest.',
      }),
    });
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.guests')}</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push(`/(app)/estates/${estateId}/guests/invite` as never)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {invitations.length === 0 ? (
        <EmptyState
          icon="person.2.fill"
          title="No guests yet"
          subtitle="Invite guests to give them access to this estate."
          actionLabel="Invite Guest"
          onAction={() => router.push(`/(app)/estates/${estateId}/guests/invite` as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}>
          <SectionHeader title={`${invitations.length} invitation${invitations.length !== 1 ? 's' : ''}`} />
          {invitations.map((inv) => {
            const displayLabel = inv.guestEmail ?? inv.inviteCode;
            return (
              <TouchableOpacity
                key={inv.id}
                style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface ?? colors.background }]}
                onLongPress={() => confirmRevoke(inv.id, displayLabel)}
                activeOpacity={0.85}
              >
                <View style={[styles.keyIcon, { backgroundColor: colors.tint + '15' }]}>
                  <IconSymbol name="key.fill" size={20} color={colors.tint} />
                </View>
                <View style={styles.info}>
                  <View style={styles.codeRow}>
                    <ThemedText type="defaultSemiBold" style={styles.codeText}>
                      {inv.inviteCode}
                    </ThemedText>
                    <Badge label={inv.status} variant={inv.status as never} />
                  </View>
                  {inv.guestEmail ? (
                    <ThemedText style={[styles.sub, { color: colors.icon }]} numberOfLines={1}>
                      {inv.guestEmail}
                    </ThemedText>
                  ) : inv.message ? (
                    <ThemedText style={[styles.sub, { color: colors.icon }]} numberOfLines={1}>
                      {inv.message}
                    </ThemedText>
                  ) : null}
                </View>
                {inv.status === 'pending' && (
                  <TouchableOpacity
                    onPress={() => shareCode(inv.inviteCode, inv.message)}
                    style={[styles.shareBtn, { backgroundColor: colors.tint + '15' }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="square.and.arrow.up" size={16} color={colors.tint} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  keyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: { fontSize: 16, letterSpacing: 2, fontFamily: 'monospace' },
  sub: { fontSize: 12 },
  shareBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
