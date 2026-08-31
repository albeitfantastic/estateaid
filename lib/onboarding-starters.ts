export type OnboardingUseCase =
  | 'holiday_home'
  | 'primary_residence'
  | 'rental_property'
  | 'managing_for_other';

export const ONBOARDING_USE_CASES: OnboardingUseCase[] = [
  'holiday_home',
  'primary_residence',
  'rental_property',
  'managing_for_other',
];

export function isOnboardingUseCase(v: unknown): v is OnboardingUseCase {
  return (
    v === 'holiday_home' ||
    v === 'primary_residence' ||
    v === 'rental_property' ||
    v === 'managing_for_other'
  );
}

export function homeEmphasisFor(useCase: OnboardingUseCase | null | undefined): {
  tipTitle: string;
  tipBody: string;
} {
  switch (useCase) {
    case 'holiday_home':
      return {
        tipTitle: 'Your holiday home, organised',
        tipBody: 'Add the property, then invite family when you’re ready.',
      };
    case 'primary_residence':
      return {
        tipTitle: 'Keep home ops in one place',
        tipBody: 'Start with contacts and a short FAQ for anyone who helps.',
      };
    case 'rental_property':
      return {
        tipTitle: 'Guests and upkeep, clearer',
        tipBody: 'Create the property first — stay requests and maintenance come next.',
      };
    case 'managing_for_other':
      return {
        tipTitle: 'Manage on their behalf',
        tipBody: 'Add the property you look after, then share access when needed.',
      };
    default:
      return {
        tipTitle: 'Start with one property',
        tipBody: 'Create your first estate to unlock calendars, FAQ, and contacts.',
      };
  }
}

/** Hub tile `route` keys to emphasise for this use case (spec §11.2). */
export function hubEmphasisRoutes(useCase: OnboardingUseCase | null | undefined): string[] {
  switch (useCase) {
    case 'holiday_home':
      return ['faq', 'stays'];
    case 'primary_residence':
      return ['events', 'documents'];
    case 'rental_property':
      return ['stays', 'availability'];
    case 'managing_for_other':
      return ['guests', 'contacts'];
    default:
      return [];
  }
}

export function starterFaqsFor(useCase: OnboardingUseCase | null | undefined): {
  question: string;
  answer: string;
}[] {
  const common = [
    { question: 'Where is the Wi‑Fi password?', answer: 'Add the network name and password here.' },
    { question: 'How do I get in?', answer: 'Describe keys, codes, or lockbox instructions.' },
  ];
  switch (useCase) {
    case 'holiday_home':
      return [
        ...common,
        { question: 'What should guests know before arrival?', answer: 'Parking, heating, and house quirks.' },
      ];
    case 'rental_property':
      return [
        ...common,
        { question: 'Who do I contact for emergencies?', answer: 'List the host and local emergency numbers.' },
      ];
    case 'primary_residence':
      return [
        { question: 'Where are the utility shut-offs?', answer: 'Water, gas, and electrics locations.' },
        { question: 'Who helps with the house?', answer: 'Cleaner, gardener, or neighbour contacts.' },
      ];
    case 'managing_for_other':
      return [
        ...common,
        { question: 'Who is the host contact?', answer: 'Name and preferred way to reach them.' },
      ];
    default:
      return common;
  }
}

/** Starter maintenance recurrence templates (host picks one when creating). */
export const MAINTENANCE_TEMPLATES: {
  id: string;
  title: string;
  body: string;
  recurrence: 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
}[] = [
  { id: 'boiler', title: 'Boiler service', body: 'Annual boiler / heating service', recurrence: 'yearly' },
  { id: 'chimney', title: 'Chimney sweep', body: 'Sweep and safety check', recurrence: 'yearly' },
  { id: 'gutters', title: 'Gutter clearing', body: 'Clear gutters and downpipes', recurrence: 'yearly' },
  { id: 'smoke', title: 'Smoke alarm test', body: 'Test alarms and replace batteries if needed', recurrence: 'monthly' },
  { id: 'winter', title: 'Winterisation', body: 'Drain pipes / set heating for empty periods', recurrence: 'yearly' },
  { id: 'water', title: 'Water shut-off check', body: 'Locate and test main shut-off valve', recurrence: 'yearly' },
];

/** Templates seeded onto a new primary-residence property. */
export const PRIMARY_RESIDENCE_SEED_TEMPLATE_IDS = ['boiler', 'smoke', 'water'] as const;

export const DEFAULT_HANDOVER_ITEMS = [
  'Close all windows',
  'Empty the fridge',
  'Take out bins',
  'Set thermostat to 12°',
  'Lock shutters / doors',
];
