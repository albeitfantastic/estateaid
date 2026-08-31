export type AvailabilityRuleKind =
  | 'blackout'
  | 'annual_closure' // legacy — no longer shown or enforced in app
  | 'min_nights' // legacy — no longer shown or enforced in app
  | 'max_advance_days';

export interface EstateAvailabilityRule {
  id: string;
  estateId: string;
  kind: AvailabilityRuleKind;
  /** Optional label (e.g. blackout reason) */
  title?: string;
  /** blackout: inclusive YYYY-MM-DD */
  from?: string;
  to?: string;
  /** annual_closure: MM-DD (zero-padded), repeats every year */
  annualFrom?: string;
  annualTo?: string;
  minNights?: number;
  maxAdvanceDays?: number;
  enabled: boolean;
  createdAt: string;
}
