-- Cover photos are a basic estate field (same as name/location), not a Pro
-- capability. Align storage writes with estates_update_host.
drop policy if exists "estate_covers_insert_host" on storage.objects;
create policy "estate_covers_insert_host"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'estate-covers'
  and public.estate_basic_update_allowed(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "estate_covers_update_host" on storage.objects;
create policy "estate_covers_update_host"
on storage.objects for update to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_basic_update_allowed(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'estate-covers'
  and public.estate_basic_update_allowed(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "estate_covers_delete_host" on storage.objects;
create policy "estate_covers_delete_host"
on storage.objects for delete to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_basic_update_allowed(((storage.foldername(name))[1])::uuid)
);
