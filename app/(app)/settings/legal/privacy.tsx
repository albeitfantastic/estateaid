import { useTranslation } from 'react-i18next';

import { LegalDocument } from '@/components/settings/legal-document';
import { SUPPORT_EMAIL } from '@/lib/support';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  return (
    <LegalDocument
      title={t('legal.privacyTitle')}
      sections={[
        { heading: t('legal.privacyControllerHeading'), body: t('legal.privacyControllerBody') },
        { heading: t('legal.privacyCollectHeading'), body: t('legal.privacyCollectBody') },
        { heading: t('legal.privacyWhyHeading'), body: t('legal.privacyWhyBody') },
        { heading: t('legal.privacyProcessorsHeading'), body: t('legal.privacyProcessorsBody') },
        { heading: t('legal.privacyRetentionHeading'), body: t('legal.privacyRetentionBody') },
        {
          heading: t('legal.privacyRightsHeading'),
          body: t('legal.privacyRightsBody', { email: SUPPORT_EMAIL }),
        },
      ]}
    />
  );
}
