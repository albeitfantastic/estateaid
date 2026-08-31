import { useTranslation } from 'react-i18next';

import { LegalDocument } from '@/components/settings/legal-document';
import { SUPPORT_EMAIL } from '@/lib/support';

export default function ImpressumScreen() {
  const { t } = useTranslation();

  return (
    <LegalDocument
      title={t('legal.impressumTitle')}
      intro={t('legal.impressumIntro')}
      sections={[
        { heading: t('legal.impressumProviderHeading'), body: t('legal.impressumProviderBody') },
        {
          heading: t('legal.impressumRepresentativeHeading'),
          body: t('legal.impressumRepresentativeBody'),
        },
        {
          heading: t('legal.impressumContactHeading'),
          body: t('legal.impressumContactBody', { email: SUPPORT_EMAIL }),
        },
        { heading: t('legal.impressumRegisterHeading'), body: t('legal.impressumRegisterBody') },
        {
          heading: t('legal.impressumResponsibleHeading'),
          body: t('legal.impressumResponsibleBody'),
        },
        { heading: t('legal.impressumDisputeHeading'), body: t('legal.impressumDisputeBody') },
      ]}
    />
  );
}
