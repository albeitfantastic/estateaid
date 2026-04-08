/** Row shape mirrored from RevenueCat (trusted path: webhook → DB). */
export interface SubscriptionEntitlementRow {
  user_id: string;
  entitlement_id: string;
  product_id: string | null;
  status: string;
  expires_at: string | null;
  store: string | null;
  updated_at: string;
  last_event_id: string | null;
}
