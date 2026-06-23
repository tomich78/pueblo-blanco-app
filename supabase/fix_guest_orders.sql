-- Permite ver pedidos de invitados (sin user_id) por su id.
-- El id de la orden (UUID) actúa como token de acceso: solo quien tiene
-- el link de confirmación puede verlo.
-- Ejecutar en el SQL Editor de Supabase.

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "order_items_select_via_order" on public.order_items;
create policy "order_items_select_via_order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or o.user_id is null or public.is_admin())
    )
  );
