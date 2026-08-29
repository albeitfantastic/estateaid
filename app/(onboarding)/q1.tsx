import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';

export default function OnboardingQ1() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <OnboardingQuestion
      step={1}
      total={4}
      question={t('onboarding.q1q')}
      hint={t('onboarding.q1h')}
      options={[t('onboarding.q1o0'), t('onboarding.q1o1'), t('onboarding.q1o2')]}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/q2' as never)}
    />
  );
}
