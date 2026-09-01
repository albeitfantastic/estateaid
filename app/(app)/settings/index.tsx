import { useTranslation } from 'react-i18next';

import { SettingsHubContent } from '@/components/settings/settings-hub-content';
import { ScreenShell } from '@/components/ui/screen-layout';

export default function SettingsHub() {
  const { t } = useTranslation();
  return (
    <ScreenShell title={t('common.settings')}>
      <SettingsHubContent />
    </ScreenShell>
  );
}
