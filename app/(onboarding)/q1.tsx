import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';

export default function Q1() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  const options = useMemo(
    () => [t('onboarding.q1o0'), t('onboarding.q1o1'), t('onboarding.q1o2')],
    [t]
  );

  return (
    <OnboardingQuestion
      step={1}
      total={3}
      question={t('onboarding.q1q')}
      hint={t('onboarding.q1h')}
      options={options}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/q2' as never)}
    />
  );
}
