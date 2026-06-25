-- Permite al admin eliminar pedidos. order_items y order_item_cajas
-- se borran solos por ON DELETE CASCADE (ya definido en schema.sql / v3_ubicaciones.sql).
-- Ejecutar en el SQL Editor de Supabase.

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete using (public.is_admin());
