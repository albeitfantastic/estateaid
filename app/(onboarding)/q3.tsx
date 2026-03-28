import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingQuestion } from '@/components/ui/onboarding-question';

const OPTIONS = [
  "More than I'd like — it's overwhelming",
  'Several hours a week at least',
  "I've delegated it, but oversight is still needed",
];

export default function Q3() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <OnboardingQuestion
      step={3}
      total={3}
      question="How much mental space do your properties take up?"
      hint="Your time is valuable. EstateAid gives it back."
      options={OPTIONS}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/role' as never)}
    />
  );
}
