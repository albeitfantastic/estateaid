import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SetupChecklist } from '@/components/ui/setup-checklist';
import { SponsorCoverageBanner } from '@/components/ui/sponsor-coverage-banner';
import { ScreenScroll, ScreenShell, FilledButton, OutlineButton, useScreenTheme } from '@/components/ui/screen-layout';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useCan, type Capability } from '@/lib/entitlements/capabilities';
import type { UpgradeFeature } from '@/lib/maison-pro-upgrade';
import { addDays, today } from '@/lib/date-utils';
import { getEstateActorRole } from '@/lib/estate-role';
import { hubEmphasisRoutes, type OnboardingUseCase } from '@/lib/onboarding-starters';
import { fetchProfileUseCase } from '@/lib/use-case-profile';
import { nextSetupStep, SETUP_STEP_TILE } from '@/lib/setup-progress';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  { labelKey: 'estateHub.activity', icon: 'clock.fill', route: 'activity', cap: 'activity.view', feature: 'generic' },
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
  { labelKey: 'estateHub.activity', icon: 'clock.fill', route: 'activity', alwaysOn: false },
];

function EstateHeaderTitle({
  name,
  location,
  guestBadge,
}: {
  name: string;
  location: string;
  guestBadge?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  return (
    <View style={styles.headerText}>
      {guestBadge ? (
        <View style={styles.nameRow}>
          <ThemedText type="title" style={styles.name} numberOfLines={1}>
            {name}
          </ThemedText>
          <View style={[styles.guestBadge, { backgroundColor: colors.tintMuted }]}>
            <ThemedText style={[styles.guestBadgeText, { color: colors.tint }]}>{t('common.guest')}</ThemedText>
          </View>
        </View>
      ) : (
        <ThemedText type="title" style={styles.name} numberOfLines={1}>
          {name}
        </ThemedText>
      )}
      <View style={styles.locationRow}>
        <IconSymbol name="map.fill" size={13} color={colors.icon} />
        <ThemedText style={[styles.location, { color: colors.icon }]}>{location}</ThemedText>
      </View>
    </View>
  );
}

export default function EstateHub() {
  const { t } = useTranslation();
  const { estateId, landing } = useLocalSearchParams<{ estateId: string; landing?: string }>();
  const router = useRouter();
  const { colors, cardShadow } = useScreenTheme();
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
  const [useCase, setUseCase] = useState<OnboardingUseCase | null>(null);

  useEffect(() => {
    if (estateId) void fetchCoverage([estateId]);
  }, [estateId, fetchCoverage]);

  useEffect(() => {
    if (!currentUser?.id) return;
    void fetchProfileUseCase(currentUser.id).then(setUseCase);
  }, [currentUser?.id]);

  const actorRole = useMemo(() => {
    if (!estate || !currentUser) return 'none' as const;
    return getEstateActorRole(estates, allInvitations, estateId, currentUser.id, currentUser.email);
  }, [estate, currentUser, estates, allInvitations, estateId]);

  const isHost = actorRole === 'sponsor' || actorRole === 'owner';
  const showGuestLanding = !isHost && landing === '1';
  const nextStep = estateId ? nextSetupStep(estateId) : null;
  const nextTile = nextStep ? SETUP_STEP_TILE[nextStep] : null;
  const emphasisRoutes = hubEmphasisRoutes(useCase);

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
        title={t('guestLanding.invitedYou', {
          name: inviterName || t('common.you'),
          property: estate.name,
        })}
      >
        <ScreenScroll contentContainerStyle={styles.grid} bottomInset={Spacing.xl} gap={12}>
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
        title={<EstateHeaderTitle name={estate.name} location={estate.location} />}
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
        <ScreenScroll contentContainerStyle={styles.grid} bottomInset={Spacing.xl}>
          <SponsorCoverageBanner estateId={estateId as string} />
          {estate.description ? (
            <ThemedText style={[styles.description, { color: colors.icon }]}>{estate.description}</ThemedText>
          ) : null}
          <SetupChecklist estateId={estateId as string} />
          <View style={styles.tiles}>
            {OWNER_ITEMS.map((item) => {
              const canOpen = can(item.cap, estateCtx);
              const locked = !canOpen;
              const count = tileCountLabel(item.countKey);
              const isNext = item.route === nextTile;
              const emphasised = isNext || emphasisRoutes.includes(item.route);
              return (
                <HostProLockTouchable
                  key={item.route}
                  locked={locked}
                  feature={item.feature}
                  estateId={estateId}
                  returnTo={`/(app)/estates/${estateId}/${item.route}`}
                  onPress={() => router.push(`/(app)/estates/${estateId}/${item.route}` as never)}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: emphasised ? colors.tintMuted : colors.surface,
                      borderColor: isNext ? colors.tint : emphasised ? colors.tintMuted : colors.border,
                      opacity: count == null && !locked ? 0.85 : 1,
                    },
                    cardShadow,
                  ]}
                >
                  <IconSymbol name={item.icon as never} size={28} color={colors.tint} />
                  <ThemedText type="defaultSemiBold" style={styles.tileLabel}>
                    {t(item.labelKey)}
                    {count != null ? ` · ${count}` : ''}
                  </ThemedText>
                </HostProLockTouchable>
              );
            })}
          </View>
        </ScreenScroll>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={<EstateHeaderTitle name={estate.name} location={estate.location} guestBadge />}
    >
      <ScreenScroll contentContainerStyle={styles.grid} bottomInset={Spacing.xl}>
        <View style={styles.tiles}>
          {GUEST_ITEMS.map((item) => {
            const key = 'href' in item ? item.href : item.route;
            const unlocked = item.alwaysOn || hasContextAccess;
            return (
              <TouchableOpacity
                key={key}
                disabled={!unlocked}
                onPress={() => {
                  if ('href' in item) {
                    if (item.href === 'plan') {
                      router.push(`/(app)/stays/plan?estateId=${estateId}` as never);
                    } else {
                      router.push(
                        `/(app)/calendar?segment=stays&estateId=${estateId}` as never
                      );
                    }
                    return;
                  }
                  router.push(`/(app)/estates/${estateId}/${item.route}` as never);
                }}
                style={[
                  styles.tile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: unlocked ? 1 : 0.55,
                  },
                  cardShadow,
                ]}
                activeOpacity={0.75}
              >
                <IconSymbol name={item.icon as never} size={28} color={colors.tint} />
                <ThemedText type="defaultSemiBold" style={styles.tileLabel}>
                  {t(item.labelKey)}
                </ThemedText>
                {!unlocked ? (
                  <ThemedText style={[styles.contextHint, { color: colors.icon }]}>
                    {contextUnlockLabel ?? t('estateHub.unlocks3DaysBefore')}
                  </ThemedText>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontFamily: Fonts.heading },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  guestBadgeText: { fontSize: 11, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  location: { fontSize: 13 },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingTop: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    flexGrow: 1,
    minHeight: 100,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  tileLabel: { fontSize: 15 },
  contextHint: { fontSize: 11, lineHeight: 14, marginTop: 2 },
});
