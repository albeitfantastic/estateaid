import { STORE_TRIAL_DAYS } from '@/lib/subscription-config';
import type { Benefit, Reassurance, TimelineItem } from './paywall-types';

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

export const TRUST_LINE =
  '14-day free trial, then your selected plan renews automatically until you cancel.';

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
    body: 'You will be charged the price shown at purchase unless you cancel. Cancel anytime in your store subscriptions.',
  },
];

export const TRIAL_REASSURANCES: Reassurance[] = [
  { label: 'Cancel anytime' },
  { label: 'Reminder before renewal' },
  { label: 'No charge during the trial' },
];

// ─── Screen 4 — Outcome ──────────────────────────────────────────────────────

export const OUTCOME_TITLE = 'Imagine not having to think about it anymore';

export const OUTCOME_BODY =
  'No more repeated questions.\nNo more scattered information.\nNo more wondering what\'s happening at your property.\n\nJust a home that runs smoothly.';

// ─── Screen 5 — Exit Offer ───────────────────────────────────────────────────

export const EXIT_TITLE = 'Ready when you are';

export const EXIT_BODY =
  'Start a 14-day free trial on the pack you choose. After the trial, that plan renews automatically until you cancel in your store subscriptions.';

export const EXIT_OFFER = {
  badge: 'Free trial available',
  price: 'Start in the App Store',
};
