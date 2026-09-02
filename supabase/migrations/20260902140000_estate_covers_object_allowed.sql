-- Cover upload must work for the property sponsor without Pro coverage.
-- Call a SECURITY DEFINER helper so storage RLS does not depend on
-- search_path or estate_actor_role naming.
create or replace function public.estate_cover_object_allowed(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.estates e
    where e.id::text = split_part(p_object_name, '/', 1)
      and (
        e.sponsor_user_id = auth.uid()
        or e.owner_id = auth.uid()
      )
  );
$$;

revoke all on function public.estate_cover_object_allowed(text) from public;
grant execute on function public.estate_cover_object_allowed(text) to authenticated;
grant execute on function public.estate_cover_object_allowed(text) to service_role;

drop policy if exists "estate_covers_insert_host" on storage.objects;
create policy "estate_covers_insert_host"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'estate-covers'
  and public.estate_cover_object_allowed(name)
);

drop policy if exists "estate_covers_update_host" on storage.objects;
create policy "estate_covers_update_host"
on storage.objects for update to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_cover_object_allowed(name)
)
with check (
  bucket_id = 'estate-covers'
  and public.estate_cover_object_allowed(name)
);

drop policy if exists "estate_covers_delete_host" on storage.objects;
create policy "estate_covers_delete_host"
on storage.objects for delete to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_cover_object_allowed(name)
);

drop policy if exists "estate_covers_select_host" on storage.objects;
create policy "estate_covers_select_host"
on storage.objects for select to authenticated
using (
  bucket_id = 'estate-covers'
  and public.estate_cover_object_allowed(name)
);
