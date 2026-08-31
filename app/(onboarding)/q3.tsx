import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';
import { getLocalQuiz, persistLocalQuiz } from '@/lib/use-case-profile';

export default function OnboardingQ3() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    void getLocalQuiz().then((q) => {
      if (q.q3 != null) setSelected(q.q3);
    });
  }, []);

  return (
    <OnboardingQuestion
      step={3}
      total={4}
      question={t('onboarding.q3q')}
      hint={t('onboarding.q3h')}
      options={[t('onboarding.q3o0'), t('onboarding.q3o1'), t('onboarding.q3o2')]}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => {
        void persistLocalQuiz({ q3: selected });
        router.push('/(onboarding)/q4' as never);
      }}
    />
  );
}
