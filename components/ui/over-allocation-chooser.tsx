import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/paywall/ui/PrimaryButton';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { useAccountContext } from '@/lib/entitlements/capabilities';
import { supabase } from '@/lib/supabase';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useAuthStore } from '@/store/auth-store';

/** When slotCount < propertiesSponsored, sponsor must choose which estates keep coverage. */
export function OverAllocationChooser() {
  const { colors } = useScreenTheme();
  const account = useAccountContext();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const estates = useEstateStore((s) => s.estates);
  const fetchCoverage = useEstateCoverageStore((s) => s.fetchCoverage);
  const coverageById = useEstateCoverageStore((s) => s.byId);

  const sponsored = useMemo(
    () => estates.filter((e) => e.sponsorUserId === currentUserId),
    [estates, currentUserId]
  );

  const overAllocated =
    account.slotCount < account.propertiesSponsored &&
    sponsored.some((e) => coverageById[e.id]?.sponsorOverAllocated);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);

  if (!overAllocated || account.slotCount <= 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < account.slotCount) next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const { data, error } = await supabase.rpc('elect_covered_estates', {
      p_estate_ids: [...selected],
    });
    setSaving(false);
    if (error || !(data as { ok?: boolean })?.ok) {
      Alert.alert('Could not update coverage', error?.message ?? 'Try again');
      return;
    }
    await fetchCoverage(sponsored.map((e) => e.id));
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Choose which properties to keep covered</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Your plan covers {account.slotCount}{' '}
        {account.slotCount === 1 ? 'property' : 'properties'}. Pick up to {account.slotCount}. Nothing
        will be deleted.
      </Text>
      {sponsored.map((e) => {
        const on = selected.has(e.id);
        return (
          <Pressable
            key={e.id}
            onPress={() => toggle(e.id)}
            style={[
              styles.row,
              { borderColor: colors.border },
              on && { borderColor: colors.tint, backgroundColor: colors.tintMuted },
            ]}
          >
            <Text style={[styles.rowText, { color: colors.text }]}>{e.name}</Text>
            <Text style={[styles.check, { color: colors.tint }]}>{on ? '✓' : ''}</Text>
          </Pressable>
        );
      })}
      <PrimaryButton
        label={saving ? 'Saving…' : 'Keep selected covered'}
        onPress={() => void save()}
        disabled={saving || selected.size === 0 || selected.size > account.slotCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rowText: { fontSize: 15, flex: 1 },
  check: { fontSize: 16, fontWeight: '700', width: 24, textAlign: 'right' },
});
