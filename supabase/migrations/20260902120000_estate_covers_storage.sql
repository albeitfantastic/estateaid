-- Public cover photos for estates. Paths are `{estateId}/cover.{ext}` so RLS
-- can key off the first folder segment, matching estate-documents.
insert into storage.buckets (id, name, public)
values ('estate-covers', 'estate-covers', true)
on conflict (id) do update set public = true;

drop policy if exists "estate_covers_insert_host" on storage.objects;
create policy "estate_covers_insert_host"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'estate-covers'
  and public.estate_host_write_allowed(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "estate_covers_update_host" on storage.objects;
create policy "estate_covers_update_host"
on storage.objects for update to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_host_write_allowed(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'estate-covers'
  and public.estate_host_write_allowed(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "estate_covers_delete_host" on storage.objects;
create policy "estate_covers_delete_host"
on storage.objects for delete to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_host_write_allowed(((storage.foldername(name))[1])::uuid)
);
