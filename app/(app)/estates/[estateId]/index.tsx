import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SponsorCoverageBanner } from '@/components/ui/sponsor-coverage-banner';
import { PhotoHero, photoHeroOverlayText } from '@/components/ui/photo-hero';
import {
  ScreenScroll,
  ScreenShell,
  FilledButton,
  OutlineButton,
  GroupedList,
  GroupedRow,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout, Radius } from '@/constants/theme';
import { useCan, type Capability } from '@/lib/entitlements/capabilities';
import type { UpgradeFeature } from '@/lib/maison-pro-upgrade';
import { addDays, today } from '@/lib/date-utils';
import { getEstateActorRole } from '@/lib/estate-role';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { leaveEstateHub, useEstateHubIntent } from '@/lib/open-estate-hub';

const OWNER_ITEMS: {
  labelKey: string;
  icon: string;
  route: string;
  cap: Capability;
  feature: UpgradeFeature;
  countKey?: 'documents' | 'contacts' | 'guests';
}[] = [
  { labelKey: 'estateHub.guests', icon: 'person.2.fill', route: 'guests', cap: 'activity.view', feature: 'guests.invite', countKey: 'guests' },
  { labelKey: 'estateHub.stayRequests', icon: 'calendar', route: 'stays', cap: 'activity.view', feature: 'stays.approve' },
  { labelKey: 'estateHub.maintenance', icon: 'wrench.fill', route: 'events', cap: 'events.read', feature: 'events.write' },
  { labelKey: 'estateHub.availability', icon: 'calendar.badge.exclamationmark', route: 'availability', cap: 'availability.read', feature: 'availability.write' },
  { labelKey: 'estateHub.faq', icon: 'questionmark.circle.fill', route: 'faq', cap: 'faq.read', feature: 'generic' },
  { labelKey: 'estateHub.documents', icon: 'doc.fill', route: 'documents', cap: 'documents.read', feature: 'documents.upload', countKey: 'documents' },
  { labelKey: 'estateHub.contacts', icon: 'phone.fill', route: 'contacts', cap: 'contacts.read', feature: 'generic', countKey: 'contacts' },
  { labelKey: 'estateHub.activity', icon: 'map.fill', route: 'activity', cap: 'activity.view', feature: 'generic' },
  { labelKey: 'estateHub.handover', icon: 'checkmark.circle.fill', route: 'handover', cap: 'property.edit', feature: 'generic' },
  { labelKey: 'estateHub.expenses', icon: 'creditcard.fill', route: 'expenses', cap: 'property.edit', feature: 'generic' },
];

type GuestHubItem =
  | { labelKey: string; icon: string; href: 'plan' | 'my-stays'; alwaysOn: true }
  | { labelKey: string; icon: string; route: string; alwaysOn: boolean };

const GUEST_ITEMS: GuestHubItem[] = [
  { labelKey: 'estateHub.requestDates', icon: 'calendar', href: 'plan', alwaysOn: true },
  { labelKey: 'estateHub.myStays', icon: 'checkmark.circle.fill', href: 'my-stays', alwaysOn: true },
  { labelKey: 'estateHub.faq', icon: 'questionmark.circle.fill', route: 'faq', alwaysOn: false },
  { labelKey: 'estateHub.documents', icon: 'doc.fill', route: 'documents', alwaysOn: false },
  { labelKey: 'estateHub.contacts', icon: 'phone.fill', route: 'contacts', alwaysOn: false },
  { labelKey: 'estateHub.handover', icon: 'checkmark.circle.fill', route: 'handover', alwaysOn: false },
  { labelKey: 'estateHub.activity', icon: 'map.fill', route: 'activity', alwaysOn: false },
];

function HubCover({
  name,
  location,
  imageUrl,
  guestBadge,
}: {
  name: string;
  location: string;
  imageUrl?: string | null;
  guestBadge?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.coverWrap}>
      <PhotoHero imageUrl={imageUrl} height={240} edgeToEdge>
        {guestBadge ? (
          <View style={styles.guestBadge}>
            <ThemedText style={styles.guestBadgeText}>{t('common.guest')}</ThemedText>
          </View>
        ) : null}
        <ThemedText type="display" style={styles.coverName} numberOfLines={2}>
          {name}
        </ThemedText>
        <View style={styles.locationRow}>
          <IconSymbol name="map.fill" size={13} color={photoHeroOverlayText} />
          <ThemedText style={styles.coverLocation}>{location}</ThemedText>
        </View>
      </PhotoHero>
    </View>
  );
}

export default function EstateHub() {
  const { t } = useTranslation();
  const { estateId: paramEstateId, landing } = useLocalSearchParams<{ estateId: string; landing?: string }>();
  const intentId = useEstateHubIntent((s) => s.intentId);
  const estateIdRaw = Array.isArray(paramEstateId) ? paramEstateId[paramEstateId.length - 1] : paramEstateId;
  const estateId = intentId ?? estateIdRaw;
  const router = useRouter();
  const { colors } = useScreenTheme();
  const estates = useEstateStore((s) => s.estates);
  const estate = estates.find((e) => e.id === estateId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allStays = useStayStore((s) => s.stays);
  const documents = useDocumentStore((s) => s.documents);
  const contacts = useContactStore((s) => s.contacts);
  const profileById = useProfileStore((s) => s.byId);
  const todayStr = today();
  const can = useCan();
  const estateCtx = { estateId: estateId as string };
  const fetchCoverage = useEstateCoverageStore((s) => s.fetchCoverage);

  useEffect(() => {
    if (estateId) void fetchCoverage([estateId]);
  }, [estateId, fetchCoverage]);

  const actorRole = useMemo(() => {
    if (!estate || !currentUser) return 'none' as const;
    return getEstateActorRole(estates, allInvitations, estateId, currentUser.id, currentUser.email);
  }, [estate, currentUser, estates, allInvitations, estateId]);

  const isHost = actorRole === 'sponsor' || actorRole === 'owner';
  const showGuestLanding = !isHost && landing === '1';

  const inviterName = useMemo(() => {
    if (!currentUser) return '';
    const inv = allInvitations.find(
      (i) =>
        i.estateId === estateId &&
        i.status === 'accepted' &&
        (i.guestId === currentUser.id ||
          (i.guestEmail &&
            currentUser.email &&
            i.guestEmail.toLowerCase() === currentUser.email.toLowerCase()))
    );
    return inv ? resolveUserDisplayName(inv.ownerId, profileById) : '';
  }, [allInvitations, estateId, currentUser, profileById]);

  const docCount = useMemo(
    () => documents.filter((d) => d.estateId === estateId).length,
    [documents, estateId]
  );
  const contactCount = useMemo(
    () => contacts.filter((c) => c.estateId === estateId).length,
    [contacts, estateId]
  );
  const guestCount = useMemo(
    () =>
      allInvitations.filter(
        (i) => i.estateId === estateId && (i.status === 'accepted' || i.status === 'pending')
      ).length,
    [allInvitations, estateId]
  );

  function tileCountLabel(key?: 'documents' | 'contacts' | 'guests'): string | null {
    if (key === 'documents' && docCount > 0) return String(docCount);
    if (key === 'contacts' && contactCount > 0) return String(contactCount);
    if (key === 'guests' && guestCount > 0) return String(guestCount);
    return null;
  }

  const hasContextAccess = useMemo(() => {
    if (isHost) return true;
    if (!currentUser) return false;
    return allStays.some(
      (s) =>
        s.estateId === estateId &&
        s.guestId === currentUser.id &&
        todayStr >= addDays(s.from, -3) &&
        todayStr <= addDays(s.to, 1)
    );
  }, [allStays, estateId, currentUser, todayStr, isHost]);

  const contextUnlockLabel = useMemo(() => {
    if (hasContextAccess || !currentUser) return null;
    const upcoming = allStays
      .filter((s) => s.estateId === estateId && s.guestId === currentUser.id && todayStr < addDays(s.from, -3))
      .sort((a, b) => a.from.localeCompare(b.from))[0];
    if (!upcoming) return t('estateHub.availableDuringStay');
    const unlockDay = addDays(upcoming.from, -3);
    const days = Math.ceil(
      (new Date(unlockDay).getTime() - new Date(todayStr).getTime()) / 86400000
    );
    if (days > 0) return t('estateHub.unlocksInDays', { count: days });
    return t('estateHub.unlocks3DaysBefore');
  }, [allStays, estateId, currentUser, todayStr, hasContextAccess, t]);

  if (!estate) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('estateHub.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  if (!currentUser) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (showGuestLanding && estate) {
    return (
      <ScreenShell
        onBack={leaveEstateHub}
        title={t('guestLanding.invitedYou', {
          name: inviterName || t('common.you'),
          property: estate.name,
        })}
      >
        <ScreenScroll contentContainerStyle={styles.grid} gap={12}>
          <FilledButton
            label={t('guestLanding.requestDates')}
            onPress={() => router.push(`/(app)/stays/plan?estateId=${estateId}` as never)}
          />
          <OutlineButton
            label={t('guestLanding.viewProperty')}
            onPress={() => router.replace(`/(app)/estates/${estateId}` as never)}
          />
        </ScreenScroll>
      </ScreenShell>
    );
  }

  if (isHost) {
    const canEdit = can('property.edit', estateCtx);
    return (
      <ScreenShell
        onBack={leaveEstateHub}
        headerRight={
          <HostProLockTouchable
            locked={!canEdit}
            feature="generic"
            estateId={estateId}
            onPress={() => router.push(`/(app)/estates/${estateId}/edit` as never)}
            style={styles.editBtn}
            accessibilityRole="button"
            accessibilityLabel={t('estateHub.editProperty')}
          >
            <IconSymbol name="pencil" size={20} color={colors.tint} />
          </HostProLockTouchable>
        }
      >
        <ScreenScroll contentContainerStyle={styles.grid}>
          <HubCover name={estate.name} location={estate.location} imageUrl={estate.coverImageUrl} />
          <SponsorCoverageBanner estateId={estateId as string} />
          {estate.description ? (
            <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
              {estate.description}
            </ThemedText>
          ) : null}
          <FilledButton
            tone="accent"
            label={t('setupChecklist.task')}
            onPress={() =>
              router.push(`/(app)/estates/${estateId}/events/new?kind=issue` as never)
            }
          />
          <OutlineButton
            label={t('estateHub.addStay')}
            onPress={() =>
              router.push(`/(app)/stays/block?estateId=${estateId}` as never)
            }
          />
          <GroupedList style={styles.destList}>
            {OWNER_ITEMS.map((item, i) => {
              const canOpen = can(item.cap, estateCtx);
              const locked = !canOpen;
              const count = tileCountLabel(item.countKey);
              return (
                <HostProLockTouchable
                  key={item.route}
                  locked={locked}
                  feature={item.feature}
                  estateId={estateId}
                  returnTo={`/(app)/estates/${estateId}/${item.route}`}
                  onPress={() => router.push(`/(app)/estates/${estateId}/${item.route}` as never)}
                  style={styles.rowPress}
                >
                  <GroupedRow
                    icon={item.icon}
                    title={t(item.labelKey)}
                    trailing={
                      <View style={styles.rowTrail}>
                        {count != null ? (
                          <ThemedText style={[styles.count, { color: colors.textSecondary }]}>
                            {count}
                          </ThemedText>
                        ) : null}
                        <IconSymbol name="chevron.right" size={14} color={colors.textSecondary} />
                      </View>
                    }
                    isLast={i === OWNER_ITEMS.length - 1}
                  />
                </HostProLockTouchable>
              );
            })}
          </GroupedList>
        </ScreenScroll>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell onBack={leaveEstateHub}>
      <ScreenScroll contentContainerStyle={styles.grid}>
        <HubCover
          name={estate.name}
          location={estate.location}
          imageUrl={estate.coverImageUrl}
          guestBadge
        />
        <FilledButton
          tone="accent"
          label={t('estateHub.requestDates')}
          onPress={() => router.push(`/(app)/stays/plan?estateId=${estateId}` as never)}
        />
        <OutlineButton
          label={t('estateHub.myStays')}
          onPress={() =>
            router.push(`/(app)/calendar?segment=stays&estateId=${estateId}` as never)
          }
        />
        <GroupedList style={styles.destList}>
          {GUEST_ITEMS.filter(
            (item): item is Extract<GuestHubItem, { route: string }> => 'route' in item
          ).map((item, i, list) => {
            const unlocked = item.alwaysOn || hasContextAccess;
            return (
              <GroupedRow
                key={item.route}
                icon={item.icon}
                title={t(item.labelKey)}
                subtitle={
                  unlocked ? undefined : (contextUnlockLabel ?? t('estateHub.unlocks3DaysBefore'))
                }
                onPress={
                  unlocked
                    ? () => router.push(`/(app)/estates/${estateId}/${item.route}` as never)
                    : undefined
                }
                disabled={!unlocked}
                isLast={i === list.length - 1}
              />
            );
          })}
        </GroupedList>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverWrap: {
    marginHorizontal: -Layout.screenPaddingX,
    marginTop: -8,
    marginBottom: 16,
  },
  coverName: { color: photoHeroOverlayText },
  coverLocation: { color: photoHeroOverlayText, fontSize: 14 },
  guestBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(245,241,232,0.18)',
    marginBottom: 6,
  },
  guestBadgeText: { fontSize: 12, fontWeight: '700', color: photoHeroOverlayText },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingTop: 8 },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 16, textAlign: 'center' },
  destList: { marginTop: 28 },
  rowPress: { width: '100%' },
  rowTrail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 15, fontWeight: '600' },
});
