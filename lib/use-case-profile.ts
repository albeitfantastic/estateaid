import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateUuidV4 } from '@/lib/id';
import {
  homeEmphasisFor,
  starterFaqsFor,
  type OnboardingUseCase,
} from '@/lib/onboarding-starters';
import { supabase } from '@/lib/supabase';
import { useFaqStore } from '@/store/faq-store';

const USE_CASE_KEY = 'maison.onboarding_use_case';

export async function persistLocalUseCase(useCase: OnboardingUseCase): Promise<void> {
  await AsyncStorage.setItem(USE_CASE_KEY, useCase);
}

export async function getLocalUseCase(): Promise<OnboardingUseCase | null> {
  const v = await AsyncStorage.getItem(USE_CASE_KEY);
  if (
    v === 'holiday_home' ||
    v === 'primary_residence' ||
    v === 'rental_property' ||
    v === 'managing_for_other'
  ) {
    return v;
  }
  return null;
}

export async function fetchProfileUseCase(userId: string): Promise<OnboardingUseCase | null> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_use_case')
    .eq('id', userId)
    .maybeSingle();
  const v = data?.onboarding_use_case as string | null | undefined;
  if (
    v === 'holiday_home' ||
    v === 'primary_residence' ||
    v === 'rental_property' ||
    v === 'managing_for_other'
  ) {
    await persistLocalUseCase(v);
    return v;
  }
  return getLocalUseCase();
}

export { homeEmphasisFor };

/** Seed starter FAQs once per estate when the estate has none. */
export async function seedStarterFaqsIfEmpty(
  estateId: string,
  useCase?: OnboardingUseCase | null
): Promise<void> {
  const existing = useFaqStore.getState().getFaqsByEstate(estateId);
  if (existing.length > 0) return;
  const starters = starterFaqsFor(useCase ?? (await getLocalUseCase()));
  const now = new Date().toISOString();
  for (let i = 0; i < starters.length; i++) {
    const s = starters[i];
    await useFaqStore.getState().addFaq({
      id: generateUuidV4(),
      estateId,
      question: s.question,
      answer: s.answer,
      order: i,
      createdAt: now,
      updatedAt: now,
    });
  }
}
