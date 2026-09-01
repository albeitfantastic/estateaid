import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useScreenTheme } from '@/components/ui/screen-layout';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { isBlockedStay, SETUP_STEPS, type SetupStepId } from '@/lib/setup-progress';

const LABEL_KEYS: Record<SetupStepId, string> = {
  block: 'setupChecklist.block',
  invite: 'setupChecklist.invite',
  document: 'setupChecklist.document',
  contact: 'setupChecklist.contact',
};

type Props = { estateId: string; quiet?: boolean };

/** Dismissible first-run checklist above the property hub grid (§10.2). */
export function SetupChecklist({ estateId, quiet = false }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const allDocuments = useDocumentStore((s) => s.documents);
  const allContacts = useContactStore((s) => s.contacts);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allStays = useStayStore((s) => s.stays);

  const docs = useMemo(
    () => allDocuments.filter((d) => d.estateId === estateId),
    [allDocuments, estateId]
  );
  const contacts = useMemo(
    () => allContacts.filter((c) => c.estateId === estateId),
    [allContacts, estateId]
  );
  const invites = useMemo(
    () => allInvitations.filter((i) => i.estateId === estateId && i.status !== 'revoked'),
    [allInvitations, estateId]
  );
  const blocked = useMemo(
    () => allStays.filter((st) => st.estateId === estateId && isBlockedStay(st)),
    [allStays, estateId]
  );

  const [dismissed, setDismissed] = useState(false);
  const storageKey = `maison.setupChecklist.${estateId}`;

  useEffect(() => {
    void AsyncStorage.getItem(storageKey).then((v) => {
      if (v === 'dismissed') setDismissed(true);
    });
  }, [storageKey]);

  const done = useMemo(
    () => ({
      block: blocked.length > 0,
      invite: invites.length > 0,
      document: docs.length > 0,
      contact: contacts.length > 0,
    }),
    [blocked.length, invites.length, docs.length, contacts.length]
  );

  const allDone = SETUP_STEPS.every((s) => done[s.id]);

  useEffect(() => {
    if (allDone && !dismissed) {
      void AsyncStorage.setItem(storageKey, 'dismissed');
      setDismissed(true);
    }
  }, [allDone, dismissed, storageKey]);

  if (dismissed || allDone) return null;

  const next = SETUP_STEPS.find((s) => !done[s.id]);

  async function dismiss() {
    await AsyncStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  }

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.border, backgroundColor: colors.surface },
        quiet && styles.wrapQuiet,
      ]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }, quiet && styles.titleQuiet]}>
          {t('setupChecklist.title')}
        </Text>
        <Pressable onPress={() => void dismiss()}>
          <Text style={[styles.dismiss, { color: colors.textSecondary }]}>
            {t('setupChecklist.dismiss')}
          </Text>
        </Pressable>
      </View>
      {SETUP_STEPS.map((s) => {
        const isDone = done[s.id];
        const isNext = next?.id === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => router.push(s.route(estateId) as never)}
            style={[styles.row, isNext && [styles.rowNext, { backgroundColor: colors.tintMuted }]]}
          >
            <Text style={[styles.check, { color: colors.tint }]}>{isDone ? '✓' : '○'}</Text>
            <Text
              style={[
                styles.label,
                { color: colors.text },
                isDone && { color: colors.textSecondary, textDecorationLine: 'line-through' },
              ]}
            >
              {t(LABEL_KEYS[s.id])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  wrapQuiet: {
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.92,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  titleQuiet: { fontSize: 14, fontWeight: '600' },
  dismiss: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowNext: { borderRadius: 8, paddingHorizontal: 8 },
  check: { width: 20, fontWeight: '700' },
  label: { fontSize: 14 },
});
