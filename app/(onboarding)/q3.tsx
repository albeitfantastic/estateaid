import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';

export default function Q3() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  const options = useMemo(
    () => [t('onboarding.q3o0'), t('onboarding.q3o1'), t('onboarding.q3o2')],
    [t]
  );

  return (
    <OnboardingQuestion
      step={3}
      total={3}
      question={t('onboarding.q3q')}
      hint={t('onboarding.q3h')}
      options={options}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/role' as never)}
    />
  );
}
