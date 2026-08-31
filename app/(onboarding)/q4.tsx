import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';
import { ONBOARDING_USE_CASES, type OnboardingUseCase } from '@/lib/onboarding-starters';
import { getLocalQuiz, persistOnboardingQuizToProfile } from '@/lib/use-case-profile';
import { useAuthStore } from '@/store/auth-store';

/** Use-case personalisation — after engagement Q1–Q3, then home. */
export default function OnboardingUseCaseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    void getLocalQuiz().then((q) => {
      if (q.useCase) {
        const idx = ONBOARDING_USE_CASES.indexOf(q.useCase);
        if (idx >= 0) setSelected(idx);
      }
    });
  }, []);

  const options = [
    t('onboarding.useCaseHoliday'),
    t('onboarding.useCasePrimary'),
    t('onboarding.useCaseRental'),
    t('onboarding.useCaseOther'),
  ];

  async function onContinue() {
    const useCase: OnboardingUseCase | null = selected != null ? ONBOARDING_USE_CASES[selected] : null;
    const quiz = await getLocalQuiz();
    const merged = { ...quiz, useCase };
    if (currentUserId) {
      await persistOnboardingQuizToProfile(currentUserId, merged);
    } else {
      const { persistLocalQuiz } = await import('@/lib/use-case-profile');
      await persistLocalQuiz(merged);
    }
    completeOnboarding();
    router.replace('/(onboarding)/start' as never);
  }

  return (
    <OnboardingQuestion
      step={4}
      total={4}
      question={t('onboarding.useCaseQ')}
      hint={t('onboarding.useCaseH')}
      options={options}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => void onContinue()}
    />
  );
}
