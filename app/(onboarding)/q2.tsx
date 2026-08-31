import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';
import { getLocalQuiz, persistLocalQuiz } from '@/lib/use-case-profile';

export default function OnboardingQ2() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    void getLocalQuiz().then((q) => {
      if (q.q2 != null) setSelected(q.q2);
    });
  }, []);

  return (
    <OnboardingQuestion
      step={2}
      total={4}
      question={t('onboarding.q2q')}
      hint={t('onboarding.q2h')}
      options={[t('onboarding.q2o0'), t('onboarding.q2o1'), t('onboarding.q2o2')]}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => {
        void persistLocalQuiz({ q2: selected });
        router.push('/(onboarding)/q3' as never);
      }}
    />
  );
}
