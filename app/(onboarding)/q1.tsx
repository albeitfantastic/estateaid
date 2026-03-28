import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingQuestion } from '@/components/ui/onboarding-question';

const OPTIONS = [
  'Frequently — every few months',
  'A few times a year',
  'Rarely, but I\'d love to change that',
];

export default function Q1() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <OnboardingQuestion
      step={1}
      total={3}
      question="How often do you gather with family and close friends?"
      hint="Your properties could be the backdrop for memories that last a lifetime."
      options={OPTIONS}
      selectedIndex={selected}
      onSelect={setSelected}
      onContinue={() => router.push('/(onboarding)/q2' as never)}
    />
  );
}
