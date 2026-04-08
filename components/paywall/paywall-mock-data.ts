import type { Benefit, Plan, Reassurance, Testimonial, TimelineItem } from './paywall-types';

// ─── Screen 1 — Trust ────────────────────────────────────────────────────────

export const TRUST_TITLE = 'Designed for people who value a well-run home';

export const TRUST_BODY =
  'Maison helps property owners keep everything organised, reduce guest friction, and stay in control from anywhere.';

export const TESTIMONIALS: Testimonial[] = [
  { quote: 'It replaced messages, notes, and spreadsheets for us.' },
  { quote: 'Guests always know what to do.' },
  { quote: 'I finally stopped being the bottleneck.' },
];

// ─── Screen 2 — Main Paywall ─────────────────────────────────────────────────

export const PAYWALL_TITLE = 'Your property, without the stress';

export const PAYWALL_SUBTITLE =
  'One calm system for your home, guests, and operations.';

export const BENEFITS: Benefit[] = [
  { label: 'Everything in one place' },
  { label: 'Guests can self-serve' },
  { label: 'Less coordination, fewer interruptions' },
  { label: 'Full visibility, even when you\'re away' },
];

export const PLANS: Plan[] = [
  {
    id: 'yearly',
    title: 'Yearly',
    priceLabel: '€99/year',
    helper: '€8.25/month',
    badge: 'Best value',
  },
  {
    id: 'monthly',
    title: 'Monthly',
    priceLabel: '€12.99/month',
  },
];

export const DEFAULT_PLAN_ID: Plan['id'] = 'yearly';

export const TRUST_LINE = 'No payment due today';

// ─── Screen 3 — Trial Clarity ─────────────────────────────────────────────────

export const TRIAL_TITLE = 'How your free trial works';

export const TIMELINE_STEPS: TimelineItem[] = [
  {
    heading: 'Today',
    body: 'Set up your property and add your key information.',
  },
  {
    heading: 'Before your trial ends',
    body: 'We\'ll remind you so there are no surprises.',
  },
  {
    heading: 'After 7 days',
    body: 'You\'ll only be charged if you decide to continue.',
  },
];

export const TRIAL_REASSURANCES: Reassurance[] = [
  { label: 'Cancel anytime' },
  { label: 'Reminder before renewal' },
  { label: 'No commitment during trial' },
];

// ─── Screen 4 — Outcome ──────────────────────────────────────────────────────

export const OUTCOME_TITLE = 'Imagine not having to think about it anymore';

export const OUTCOME_BODY =
  'No more repeated questions.\nNo more scattered information.\nNo more wondering what\'s happening at your property.\n\nJust a home that runs smoothly.';

// ─── Screen 5 — Exit Offer ───────────────────────────────────────────────────

export const EXIT_TITLE = 'A quieter way to get started';

export const EXIT_BODY = 'Try Maison with 30% off the yearly plan.';

export const EXIT_OFFER = {
  badge: '30% off yearly',
  price: '€69/year',
};
