-- Closes a monetization gap: only `estates` insert/update/delete was gated by
-- user_has_full_product_access() (see 20260429120000_single_user_trial_access.sql).
-- Host-managed per-estate tables (faqs, estate_documents, estate_contacts,
-- estate_availability_rules, stays) and the host side of stay_requests had no
-- tier check at all, so a trial-expired/unsubscribed owner could still fully
-- manage a pre-existing estate through these tables.
--
-- RESTRICTIVE policies AND with whatever permissive policies already exist on
-- each table (regardless of the permissive policies' names), so this adds the
-- gate without needing to know or touch the current policy definitions.

-- Owner-only tables: guests never write these directly, so the gate applies
-- unconditionally to all writes.
create policy "faqs_require_pro_write"
on public.faqs
as restrictive
for insert to authenticated
with check (public.user_has_full_product_access());

create policy "faqs_require_pro_modify"
on public.faqs
as restrictive
for update to authenticated
using (public.user_has_full_product_access())
with check (public.user_has_full_product_access());

create policy "faqs_require_pro_delete"
on public.faqs
as restrictive
for delete to authenticated
using (public.user_has_full_product_access());

create policy "estate_documents_require_pro_write"
on public.estate_documents
as restrictive
for insert to authenticated
with check (public.user_has_full_product_access());

create policy "estate_documents_require_pro_modify"
on public.estate_documents
as restrictive
for update to authenticated
using (public.user_has_full_product_access())
with check (public.user_has_full_product_access());

create policy "estate_documents_require_pro_delete"
on public.estate_documents
as restrictive
for delete to authenticated
using (public.user_has_full_product_access());

create policy "estate_contacts_require_pro_write"
on public.estate_contacts
as restrictive
for insert to authenticated
with check (public.user_has_full_product_access());

create policy "estate_contacts_require_pro_modify"
on public.estate_contacts
as restrictive
for update to authenticated
using (public.user_has_full_product_access())
with check (public.user_has_full_product_access());

create policy "estate_contacts_require_pro_delete"
on public.estate_contacts
as restrictive
for delete to authenticated
using (public.user_has_full_product_access());

create policy "estate_availability_rules_require_pro_write"
on public.estate_availability_rules
as restrictive
for insert to authenticated
with check (public.user_has_full_product_access());

create policy "estate_availability_rules_require_pro_modify"
on public.estate_availability_rules
as restrictive
for update to authenticated
using (public.user_has_full_product_access())
with check (public.user_has_full_product_access());

create policy "estate_availability_rules_require_pro_delete"
on public.estate_availability_rules
as restrictive
for delete to authenticated
using (public.user_has_full_product_access());

create policy "stays_require_pro_write"
on public.stays
as restrictive
for insert to authenticated
with check (public.user_has_full_product_access());

create policy "stays_require_pro_modify"
on public.stays
as restrictive
for update to authenticated
using (public.user_has_full_product_access())
with check (public.user_has_full_product_access());

create policy "stays_require_pro_delete"
on public.stays
as restrictive
for delete to authenticated
using (public.user_has_full_product_access());

-- stay_requests: guests insert their own requests and update their own
-- request (accept/decline an alternative, cancel); owners update to
-- approve/decline/propose-alt/ask-question. The gate must only bind when the
-- *estate owner* is the one acting, matching how estates_update_host already
-- scopes to owner_id = auth.uid(). Guest-side inserts/updates on their own
-- request are unaffected regardless of the estate owner's tier.
create policy "stay_requests_require_pro_for_host_writes"
on public.stay_requests
as restrictive
for all to authenticated
using (
  not exists (
    select 1 from public.estates e
    where e.id = stay_requests.estate_id
      and e.owner_id = auth.uid()
  )
  or public.user_has_full_product_access()
)
with check (
  not exists (
    select 1 from public.estates e
    where e.id = stay_requests.estate_id
      and e.owner_id = auth.uid()
  )
  or public.user_has_full_product_access()
);
