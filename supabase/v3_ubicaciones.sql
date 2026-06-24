-- Ronda 3: catálogo real con ubicación física por caja, historial de ventas viejo.
-- Ejecutar en el SQL Editor de Supabase.

-- ===== books: columnas nuevas =====
alter table public.books
  add column if not exists publisher text,
  add column if not exists legacy_id integer unique;

-- ===== ubicaciones (stock por caja física) =====
create table if not exists public.ubicaciones (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.books(id) on delete cascade,
  caja text not null,
  cantidad integer not null default 0 check (cantidad >= 0),
  unique (producto_id, caja)
);

create index if not exists ubicaciones_producto_id_idx on public.ubicaciones(producto_id);

-- mantiene books.stock = suma de todas las cajas del producto
create or replace function public.sync_book_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producto_id uuid;
begin
  v_producto_id := coalesce(new.producto_id, old.producto_id);

  update public.books
  set stock = (
    select coalesce(sum(cantidad), 0)
    from public.ubicaciones
    where producto_id = v_producto_id
  )
  where id = v_producto_id;

  return null;
end;
$$;

drop trigger if exists ubicaciones_sync_stock on public.ubicaciones;
create trigger ubicaciones_sync_stock
  after insert or update or delete on public.ubicaciones
  for each row execute procedure public.sync_book_stock();

-- ===== descuento/restauración de stock por caja puntual =====
-- reemplaza a decrement_book_stock / increment_book_stock (Ronda 1 y 2),
-- que tocaban books.stock directo. Ahora se opera sobre una caja concreta
-- y el trigger de arriba deja books.stock sincronizado solo.
drop function if exists public.decrement_book_stock(uuid, integer);
drop function if exists public.increment_book_stock(uuid, integer);

create or replace function public.decrement_ubicacion_stock(p_producto_id uuid, p_caja text, p_cantidad integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ubicaciones
  set cantidad = greatest(cantidad - p_cantidad, 0)
  where producto_id = p_producto_id and caja = p_caja;
$$;

create or replace function public.increment_ubicacion_stock(p_producto_id uuid, p_caja text, p_cantidad integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ubicaciones (producto_id, caja, cantidad)
  values (p_producto_id, p_caja, p_cantidad)
  on conflict (producto_id, caja)
  do update set cantidad = public.ubicaciones.cantidad + excluded.cantidad;
$$;

-- ===== order_item_cajas (de qué caja salió cada venta nueva) =====
create table if not exists public.order_item_cajas (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  caja text not null,
  cantidad integer not null check (cantidad > 0)
);

create index if not exists order_item_cajas_order_item_id_idx on public.order_item_cajas(order_item_id);

-- ===== historial de ventas viejo (solo lectura/consulta) =====
create table if not exists public.ventas_historicas (
  id integer primary key,
  fecha timestamptz,
  email text,
  total numeric(10,2),
  medio_pago text,
  status text
);

create table if not exists public.ventas_historicas_items (
  id integer primary key,
  venta_id integer references public.ventas_historicas(id) on delete cascade,
  producto_id uuid references public.books(id) on delete set null,
  nombre text,
  precio numeric(10,2),
  cantidad integer
);

create index if not exists ventas_historicas_items_venta_id_idx on public.ventas_historicas_items(venta_id);

-- ===== RLS =====
alter table public.ubicaciones enable row level security;
alter table public.order_item_cajas enable row level security;
alter table public.ventas_historicas enable row level security;
alter table public.ventas_historicas_items enable row level security;

drop policy if exists "ubicaciones_admin_all" on public.ubicaciones;
create policy "ubicaciones_admin_all" on public.ubicaciones
  for all using (public.is_admin());

drop policy if exists "order_item_cajas_admin_all" on public.order_item_cajas;
create policy "order_item_cajas_admin_all" on public.order_item_cajas
  for all using (public.is_admin());

drop policy if exists "ventas_historicas_select_admin" on public.ventas_historicas;
create policy "ventas_historicas_select_admin" on public.ventas_historicas
  for select using (public.is_admin());

drop policy if exists "ventas_historicas_items_select_admin" on public.ventas_historicas_items;
create policy "ventas_historicas_items_select_admin" on public.ventas_historicas_items
  for select using (public.is_admin());
