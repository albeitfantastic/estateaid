-- Storage bucket + policies for real estate_documents file uploads
-- (previously the documents feature only wrote metadata rows with an empty
-- fileUri -- see app/(app)/estates/[estateId]/documents/upload.tsx).
-- Objects are stored as `{estateId}/{filename}`, so the first path segment
-- (storage.foldername(name))[1] identifies which estate a file belongs to,
-- mirroring the owner/accepted-guest RLS shape used elsewhere in this schema.
-- Write access additionally requires user_has_full_product_access(), matching
-- the tier gate added on the estate_documents table itself.

insert into storage.buckets (id, name, public)
values ('estate-documents', 'estate-documents', false)
on conflict (id) do nothing;

create policy "estate_documents_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'estate-documents'
  and exists (
    select 1 from public.estates e
    where e.id::text = (storage.foldername(name))[1]
      and e.owner_id = auth.uid()
  )
  and public.user_has_full_product_access()
);

create policy "estate_documents_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'estate-documents'
  and exists (
    select 1 from public.estates e
    where e.id::text = (storage.foldername(name))[1]
      and e.owner_id = auth.uid()
  )
  and public.user_has_full_product_access()
);

create policy "estate_documents_storage_select_owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'estate-documents'
  and exists (
    select 1 from public.estates e
    where e.id::text = (storage.foldername(name))[1]
      and e.owner_id = auth.uid()
  )
);

create policy "estate_documents_storage_select_accepted_guest"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'estate-documents'
  and exists (
    select 1 from public.invitations i
    where i.estate_id::text = (storage.foldername(name))[1]
      and i.guest_id = auth.uid()
      and i.status = 'accepted'
  )
);
