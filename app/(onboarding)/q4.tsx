import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingQuestion } from '@/components/ui/onboarding-question';
import { type OnboardingUseCase } from '@/lib/onboarding-starters';
import { persistLocalUseCase } from '@/lib/use-case-profile';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

const USE_CASES: OnboardingUseCase[] = [
  'holiday_home',
  'primary_residence',
  'rental_property',
  'managing_for_other',
];

/** Use-case personalisation — after engagement Q1–Q3, then home. */
export default function OnboardingUseCaseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const [selected, setSelected] = useState<number | null>(null);

  const options = [
    t('onboarding.useCaseHoliday', { defaultValue: 'Holiday home' }),
    t('onboarding.useCasePrimary', { defaultValue: 'Primary residence' }),
    t('onboarding.useCaseRental', { defaultValue: 'Rental property' }),
    t('onboarding.useCaseOther', { defaultValue: 'Managing for someone else' }),
  ];

  async function onContinue() {
    const useCase = selected != null ? USE_CASES[selected] : null;
    if (useCase) {
      await persistLocalUseCase(useCase);
      if (currentUserId) {
        await supabase.from('profiles').update({ onboarding_use_case: useCase }).eq('id', currentUserId);
      }
    }
    completeOnboarding();
    router.replace('/(onboarding)/start' as never);
  }

  return (
    <OnboardingQuestion
      step={4}
      total={4}
      question={t('onboarding.useCaseQ', { defaultValue: 'What will you use Maison for?' })}
      hint={t('onboarding.useCaseH', {
        defaultValue: 'We’ll tailor your home screen. You can change this later.',
      })}
      options={options}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => void onContinue()}
    />
  );
}
