import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import {
  GroupedList,
  GroupedRow,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
} from '@/components/ui/screen-layout';

/** After quiz: invite code vs add property (§5.2). */
export default function OnboardingStartForkScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenShell
      showBack={false}
      title={t('onboarding.startForkTitle', { defaultValue: 'How do you want to start?' })}
    >
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <ScreenFootnote>
          {t('onboarding.startForkSub', {
            defaultValue: 'Join a property you were invited to, or add your own.',
          })}
        </ScreenFootnote>

        <GroupedList>
          <GroupedRow
            icon="ticket.fill"
            title={t('onboarding.haveInviteCode', { defaultValue: 'I have an invite code' })}
            subtitle={t('onboarding.haveInviteCodeBody', {
              defaultValue: 'Enter the code from your host. No payment required.',
            })}
            onPress={() => router.push('/(app)/estates/join' as never)}
          />
          <GroupedRow
            icon="house.fill"
            title={t('onboarding.addMyProperty', { defaultValue: 'Add my property' })}
            subtitle={t('onboarding.addMyPropertyBody', {
              defaultValue: 'Create your first property. Includes a free 14-day trial.',
            })}
            onPress={() => router.push('/(onboarding)/frame-property' as never)}
            isLast
          />
        </GroupedList>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 8,
    flexGrow: 1,
    justifyContent: 'center',
  },
});
