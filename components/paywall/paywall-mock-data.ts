import type { Benefit, Reassurance, TimelineItem } from './paywall-types';
import { STORE_TRIAL_DAYS } from '@/lib/subscription-config';

// ─── Screen 1 — Trust ────────────────────────────────────────────────────────

export const TRUST_TITLE = 'Designed for people who value a well-run home';

export const TRUST_BODY =
  'Maison helps hosts keep everything organised, reduce guest friction, and stay in control from anywhere.';

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

export const TRUST_LINE = 'No payment due today — start with a free trial';

// ─── Screen 3 — Trial Clarity ─────────────────────────────────────────────────

export const TRIAL_TITLE = 'How your free trial works';

export const TIMELINE_STEPS: TimelineItem[] = [
  {
    heading: 'Today',
    body: 'Start your free trial in the App Store or Play Store. Set up your property and add key information.',
  },
  {
    heading: 'Before your trial ends',
    body: 'We\'ll remind you so there are no surprises.',
  },
  {
    heading: `After ${STORE_TRIAL_DAYS} days`,
    body: 'You\'ll only be charged if you decide to continue. Cancel anytime in your store subscriptions.',
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

export const EXIT_TITLE = 'Ready when you are';

export const EXIT_BODY =
  'Start Maison Pro with a free store trial, or continue exploring on the free plan. Special pricing appears in the store when an exit offer is available.';

export const EXIT_OFFER = {
  badge: 'Free trial available',
  price: 'Start in the App Store',
};
