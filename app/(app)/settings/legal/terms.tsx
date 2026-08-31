import { useTranslation } from 'react-i18next';

import { LegalDocument } from '@/components/settings/legal-document';
import { APP_TRIAL_DAYS } from '@/lib/subscription-config';

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();

  return (
    <LegalDocument
      title={t('legal.termsTitle')}
      sections={[
        { heading: t('legal.termsWhatHeading'), body: t('legal.termsWhatBody') },
        { heading: t('legal.termsAccountHeading'), body: t('legal.termsAccountBody') },
        { heading: t('legal.termsSlotsHeading'), body: t('legal.termsSlotsBody') },
        {
          heading: t('legal.termsTrialHeading'),
          body: t('legal.termsTrialBody', { days: APP_TRIAL_DAYS }),
        },
        { heading: t('legal.termsBillingHeading'), body: t('legal.termsBillingBody') },
        { heading: t('legal.termsContentHeading'), body: t('legal.termsContentBody') },
        { heading: t('legal.termsLimitsHeading'), body: t('legal.termsLimitsBody') },
      ]}
    />
  );
}
