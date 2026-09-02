import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { useAccessibleEstates } from '@/lib/entitlements/capabilities';
import { unseenInboxCountAll } from '@/lib/inbox-messages';
import { unseenNotificationCount } from '@/lib/notification-feed';
import { useActivityLogStore } from '@/store/activity-log-store';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEventStore } from '@/store/event-store';
import { useInboxSeenStore } from '@/store/inbox-seen-store';
import { useStayStore } from '@/store/stay-store';

function formatBadge(n: number): string {
  return n > 9 ? '9+' : String(n);
}

function CircleIconButton({
  name,
  label,
  onPress,
  badge,
}: {
  name: 'magnifyingglass' | 'message' | 'bell';
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  const { colors } = useScreenTheme();
  const count = badge ?? 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.circle, { borderColor: colors.border }]}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${label}, ${count}` : label}
    >
      <IconSymbol name={name} size={18} color={colors.tint} />
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <ThemedText style={[styles.badgeText, { color: colors.textOnBrand }]}>
            {formatBadge(count)}
          </ThemedText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function MaisonTopBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const name = currentUser?.name?.trim() || t('common.guest');

  const estates = useAccessibleEstates();
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);
  const events = useEventStore((s) => s.events);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const log = useActivityLogStore((s) => s.entries);
  const documents = useDocumentStore((s) => s.documents);
  const contacts = useContactStore((s) => s.contacts);
  const seenAt = useInboxSeenStore((s) => s.seenAt);

  const messageCount = useMemo(
    () => unseenInboxCountAll(estateIds, events, stayRequests, seenAt),
    [estateIds, events, stayRequests, seenAt]
  );
  const notificationCount = useMemo(
    () =>
      unseenNotificationCount(
        { estateIds, log, stayRequests, events, documents, contacts },
        seenAt
      ),
    [estateIds, log, stayRequests, events, documents, contacts, seenAt]
  );

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings' as never)}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('homeTopBar.settings')}
          >
            <Avatar name={name} imageUri={currentUser?.avatarUrl} size={36} color={colors.tint} />
          </TouchableOpacity>
          <CircleIconButton
            name="magnifyingglass"
            label={t('homeTopBar.search')}
            onPress={() => router.push('/(app)/search' as never)}
          />
        </View>

        <ThemedText type="title" style={styles.wordmark} pointerEvents="none" numberOfLines={1}>
          {t('common.estateAid')}
        </ThemedText>

        <View style={[styles.side, styles.sideEnd]}>
          <CircleIconButton
            name="message"
            label={t('homeTopBar.messages')}
            badge={messageCount}
            onPress={() => router.push('/(app)/messages' as never)}
          />
          <CircleIconButton
            name="bell"
            label={t('homeTopBar.notifications')}
            badge={notificationCount}
            onPress={() => router.push('/(app)/notifications' as never)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.touchMin,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  sideEnd: { justifyContent: 'flex-end' },
  wordmark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
