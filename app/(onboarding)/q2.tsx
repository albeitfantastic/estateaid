import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';

export default function Q2() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  const options = useMemo(
    () => [t('onboarding.q2o0'), t('onboarding.q2o1'), t('onboarding.q2o2')],
    [t]
  );

  return (
    <OnboardingQuestion
      step={2}
      total={3}
      question={t('onboarding.q2q')}
      hint={t('onboarding.q2h')}
      options={options}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/q3' as never)}
    />
  );
}
