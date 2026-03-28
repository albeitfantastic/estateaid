import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingQuestion } from '@/components/ui/onboarding-question';

const OPTIONS = [
  "It's a constant source of confusion",
  'I manage, but it takes real effort',
  'I have a system, but it\'s far from ideal',
];

export default function Q2() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <OnboardingQuestion
      step={2}
      total={3}
      question="How do you handle who stays where and when?"
      hint="Overlapping requests and missed messages shouldn't be part of the story."
      options={OPTIONS}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/q3' as never)}
    />
  );
}
