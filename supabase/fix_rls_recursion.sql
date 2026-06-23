-- Fix: infinite recursion en las políticas RLS que consultaban "profiles"
-- desde dentro de una política sobre la propia tabla "profiles".
-- Ejecutar en el SQL Editor de Supabase.

-- función que chequea si el usuario actual es admin, sin pasar por RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  );
$$;

-- categories
drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin" on public.categories
  for all using (public.is_admin());

-- books
drop policy if exists "books_select_admin_all" on public.books;
create policy "books_select_admin_all" on public.books
  for select using (public.is_admin());

drop policy if exists "books_write_admin" on public.books;
create policy "books_write_admin" on public.books
  for insert with check (public.is_admin());

drop policy if exists "books_update_admin" on public.books;
create policy "books_update_admin" on public.books
  for update using (public.is_admin());

drop policy if exists "books_delete_admin" on public.books;
create policy "books_delete_admin" on public.books
  for delete using (public.is_admin());

-- profiles (acá estaba la recursión)
drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all" on public.profiles
  for select using (public.is_admin());

-- orders
drop policy if exists "orders_select_admin_all" on public.orders;
create policy "orders_select_admin_all" on public.orders
  for select using (public.is_admin());

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());

-- order_items
drop policy if exists "order_items_select_via_order" on public.order_items;
create policy "order_items_select_via_order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );
