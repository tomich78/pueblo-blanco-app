-- Recrea las políticas de inserción de orders/order_items por si no quedaron
-- bien aplicadas. Ejecutar en el SQL Editor de Supabase.

drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders
  for insert to anon, authenticated
  with check (true);

drop policy if exists "order_items_insert_any" on public.order_items;
create policy "order_items_insert_any" on public.order_items
  for insert to anon, authenticated
  with check (true);
