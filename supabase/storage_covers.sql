-- Crea el bucket público "covers" para portadas de libros y sus políticas.
-- Ejecutar en el SQL Editor de Supabase.

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "covers_select_public" on storage.objects;
create policy "covers_select_public" on storage.objects
  for select using (bucket_id = 'covers');

drop policy if exists "covers_write_admin" on storage.objects;
create policy "covers_write_admin" on storage.objects
  for insert with check (bucket_id = 'covers' and public.is_admin());

drop policy if exists "covers_update_admin" on storage.objects;
create policy "covers_update_admin" on storage.objects
  for update using (bucket_id = 'covers' and public.is_admin());

drop policy if exists "covers_delete_admin" on storage.objects;
create policy "covers_delete_admin" on storage.objects
  for delete using (bucket_id = 'covers' and public.is_admin());
