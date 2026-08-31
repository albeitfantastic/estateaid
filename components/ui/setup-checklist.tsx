import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDocumentStore } from '@/store/document-store';
import { useContactStore } from '@/store/contact-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { MC } from '@/components/paywall/paywall-tokens';

type StepId = 'block' | 'invite' | 'document' | 'contact';

const STEPS: { id: StepId; label: string; route: (estateId: string) => string }[] = [
  {
    id: 'block',
    label: 'Block your first dates',
    route: (id) => `/(app)/stays/block?estateId=${id}`,
  },
  {
    id: 'invite',
    label: 'Invite someone',
    route: (id) => `/(app)/estates/${id}/guests/invite`,
  },
  {
    id: 'document',
    label: 'Add a document',
    route: (id) => `/(app)/estates/${id}/documents/upload`,
  },
  {
    id: 'contact',
    label: 'Add a contact',
    route: (id) => `/(app)/estates/${id}/contacts/new`,
  },
];

type Props = { estateId: string };

/** Dismissible first-run checklist above the property hub grid (§10.2). */
export function SetupChecklist({ estateId }: Props) {
  const router = useRouter();
  // Select stable store slices — never .filter() inside the selector (breaks getSnapshot caching).
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
    () =>
      allInvitations.filter((i) => i.estateId === estateId && i.status !== 'revoked'),
    [allInvitations, estateId]
  );
  const stays = useMemo(
    () => allStays.filter((st) => st.estateId === estateId),
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
      block: stays.length > 0,
      invite: invites.length > 0,
      document: docs.length > 0,
      contact: contacts.length > 0,
    }),
    [stays.length, invites.length, docs.length, contacts.length]
  );

  const allDone = STEPS.every((s) => done[s.id]);

  useEffect(() => {
    if (allDone && !dismissed) {
      void AsyncStorage.setItem(storageKey, 'dismissed');
      setDismissed(true);
    }
  }, [allDone, dismissed, storageKey]);

  if (dismissed || allDone) return null;

  const next = STEPS.find((s) => !done[s.id]);

  async function dismiss() {
    await AsyncStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Get set up</Text>
        <Pressable onPress={() => void dismiss()}>
          <Text style={styles.dismiss}>Dismiss</Text>
        </Pressable>
      </View>
      {STEPS.map((s) => {
        const isDone = done[s.id];
        const isNext = next?.id === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => router.push(s.route(estateId) as never)}
            style={[styles.row, isNext && styles.rowNext]}
          >
            <Text style={styles.check}>{isDone ? '✓' : '○'}</Text>
            <Text style={[styles.label, isDone && styles.labelDone]}>{s.label}</Text>
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
    borderColor: MC.border,
    gap: 8,
    backgroundColor: MC.bg,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: MC.text },
  dismiss: { fontSize: 13, color: MC.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowNext: { backgroundColor: 'rgba(35,69,54,0.06)', borderRadius: 8, paddingHorizontal: 8 },
  check: { width: 20, color: MC.brand, fontWeight: '700' },
  label: { fontSize: 14, color: MC.text },
  labelDone: { color: MC.textSecondary, textDecorationLine: 'line-through' },
});
