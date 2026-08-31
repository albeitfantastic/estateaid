import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  MaintenanceList,
  useMaintenanceEvents,
} from '@/components/maintenance/maintenance-list';
import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EventsIndex() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(params.estateId);
  const router = useRouter();
  const { colors } = useScreenTheme();
  const canWrite = useCan()('events.write', { estateId });
  const events = useMaintenanceEvents(estateId);

  const goNew = (kind?: 'issue') => {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'events.write', `/(app)/estates/${estateId}/events/new`);
      return;
    }
    const q = kind === 'issue' ? '?kind=issue' : '';
    router.push(`/(app)/estates/${estateId}/events/new${q}` as never);
  };

  return (
    <ScreenShell
      title={t('titles.events')}
      headerRight={
        <View style={styles.headerActions}>
          <HostProLockTouchable
            locked={!canWrite}
            feature="events.write"
            returnTo={`/(app)/estates/${estateId}/events`}
            shrinkToContent
            onPress={() => goNew('issue')}
            style={[
              styles.addBtn,
              {
                backgroundColor: colors.tint + '22',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.tint + '55',
              },
            ]}
            activeOpacity={0.8}
            accessibilityLabel={t('maintenanceSchedule.addIssueCta')}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.tint} />
          </HostProLockTouchable>
          <HostProLockTouchable
            locked={!canWrite}
            feature="events.write"
            returnTo={`/(app)/estates/${estateId}/events`}
            shrinkToContent
            onPress={() => goNew()}
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            activeOpacity={0.8}
            accessibilityLabel={t('maintenanceSchedule.addCta')}
          >
            <IconSymbol name="plus" size={18} color={colors.textOnBrand} />
          </HostProLockTouchable>
        </View>
      }
    >
      {events.length === 0 ? (
        <EmptyState
          icon="calendar.badge.plus"
          title={t('maintenanceSchedule.emptyTitle')}
          subtitle={t('maintenanceSchedule.emptySub')}
          actionLabel={t('maintenanceSchedule.addCta')}
          onAction={() => goNew()}
        />
      ) : (
        <ScreenScroll>
          <MaintenanceList estateId={estateId} />
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
