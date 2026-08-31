import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateUuidV4 } from '@/lib/id';
import { today } from '@/lib/date-utils';
import {
  homeEmphasisFor,
  isOnboardingUseCase,
  starterFaqsFor,
  MAINTENANCE_TEMPLATES,
  PRIMARY_RESIDENCE_SEED_TEMPLATE_IDS,
  type OnboardingUseCase,
} from '@/lib/onboarding-starters';
import { supabase } from '@/lib/supabase';
import { useContactStore } from '@/store/contact-store';
import { useEventStore } from '@/store/event-store';
import { useFaqStore } from '@/store/faq-store';

const USE_CASE_KEY = 'maison.onboarding_use_case';
const QUIZ_KEY = 'maison.onboarding_quiz';

export type OnboardingQuizAnswers = {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  useCase: OnboardingUseCase | null;
};

const EMPTY_QUIZ: OnboardingQuizAnswers = { q1: null, q2: null, q3: null, useCase: null };

export async function persistLocalUseCase(useCase: OnboardingUseCase): Promise<void> {
  await AsyncStorage.setItem(USE_CASE_KEY, useCase);
  const quiz = await getLocalQuiz();
  await persistLocalQuiz({ ...quiz, useCase });
}

export async function getLocalUseCase(): Promise<OnboardingUseCase | null> {
  const quiz = await getLocalQuiz();
  if (quiz.useCase) return quiz.useCase;
  const v = await AsyncStorage.getItem(USE_CASE_KEY);
  return isOnboardingUseCase(v) ? v : null;
}

export async function persistLocalQuiz(partial: Partial<OnboardingQuizAnswers>): Promise<void> {
  const current = await getLocalQuiz();
  const next: OnboardingQuizAnswers = { ...current, ...partial };
  await AsyncStorage.setItem(QUIZ_KEY, JSON.stringify(next));
  if (next.useCase) await AsyncStorage.setItem(USE_CASE_KEY, next.useCase);
}

export async function getLocalQuiz(): Promise<OnboardingQuizAnswers> {
  try {
    const raw = await AsyncStorage.getItem(QUIZ_KEY);
    if (!raw) return { ...EMPTY_QUIZ };
    const parsed = JSON.parse(raw) as Partial<OnboardingQuizAnswers>;
    return {
      q1: typeof parsed.q1 === 'number' ? parsed.q1 : null,
      q2: typeof parsed.q2 === 'number' ? parsed.q2 : null,
      q3: typeof parsed.q3 === 'number' ? parsed.q3 : null,
      useCase: isOnboardingUseCase(parsed.useCase) ? parsed.useCase : null,
    };
  } catch {
    return { ...EMPTY_QUIZ };
  }
}

export async function persistOnboardingQuizToProfile(
  userId: string,
  quiz: OnboardingQuizAnswers
): Promise<void> {
  await persistLocalQuiz(quiz);
  const payload = {
    q1: quiz.q1,
    q2: quiz.q2,
    q3: quiz.q3,
    use_case: quiz.useCase,
  };
  const row: Record<string, unknown> = { onboarding_quiz: payload };
  if (quiz.useCase) row.onboarding_use_case = quiz.useCase;
  await supabase.from('profiles').update(row).eq('id', userId);
}

export async function fetchProfileUseCase(userId: string): Promise<OnboardingUseCase | null> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_use_case, onboarding_quiz')
    .eq('id', userId)
    .maybeSingle();
  const fromColumn = data?.onboarding_use_case;
  if (isOnboardingUseCase(fromColumn)) {
    await persistLocalUseCase(fromColumn);
    return fromColumn;
  }
  const quiz = data?.onboarding_quiz as { use_case?: unknown } | null | undefined;
  if (isOnboardingUseCase(quiz?.use_case)) {
    await persistLocalUseCase(quiz.use_case);
    return quiz.use_case;
  }
  return getLocalUseCase();
}

export async function shouldReaskPropertyType(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('property_type_reasked')
    .eq('id', userId)
    .maybeSingle();
  return data?.property_type_reasked !== true;
}

export async function markPropertyTypeReasked(
  userId: string,
  useCase: OnboardingUseCase
): Promise<void> {
  await persistLocalUseCase(useCase);
  await supabase
    .from('profiles')
    .update({
      property_type_reasked: true,
      onboarding_use_case: useCase,
    })
    .eq('id', userId);
}

export { homeEmphasisFor };

/** Seed starter FAQs / templates / contacts once per estate when empty. */
export async function seedStarterFaqsIfEmpty(
  estateId: string,
  useCase?: OnboardingUseCase | null
): Promise<void> {
  await seedFirstProperty(estateId, useCase);
}

export async function seedFirstProperty(
  estateId: string,
  useCase?: OnboardingUseCase | null
): Promise<void> {
  const resolved = useCase ?? (await getLocalUseCase());
  const existingFaqs = useFaqStore.getState().getFaqsByEstate(estateId);
  if (existingFaqs.length === 0) {
    const starters = starterFaqsFor(resolved);
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

  if (resolved === 'primary_residence') {
    const existingEvents = useEventStore.getState().getEventsByEstate(estateId);
    if (existingEvents.length === 0) {
      const startDate = today();
      const dayOfMonth = new Date().getDate();
      for (const id of PRIMARY_RESIDENCE_SEED_TEMPLATE_IDS) {
        const tpl = MAINTENANCE_TEMPLATES.find((x) => x.id === id);
        if (!tpl) continue;
        await useEventStore.getState().addEvent({
          id: generateUuidV4(),
          estateId,
          title: tpl.title,
          description: tpl.body,
          type: 'recurring',
          recurrence: {
            frequency: tpl.recurrence,
            dayOfMonth,
            startDate,
          },
          reminderLeadDays: tpl.recurrence === 'yearly' ? 14 : 7,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  if (resolved === 'managing_for_other') {
    const existingContacts = useContactStore.getState().getContactsByEstate(estateId);
    if (existingContacts.length === 0) {
      await useContactStore.getState().addContact({
        id: generateUuidV4(),
        estateId,
        name: 'Host contact',
        role: 'Host',
        category: 'other',
        notes: 'Add a phone number or email. You can edit or delete this starter.',
        order: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }
}
