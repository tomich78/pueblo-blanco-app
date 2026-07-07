-- Tabla de cajas como entidad propia
create table if not exists public.cajas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

alter table public.cajas enable row level security;

create policy "cajas_select_admin" on public.cajas
  for select using (public.is_admin());

create policy "cajas_insert_admin" on public.cajas
  for insert with check (public.is_admin());

create policy "cajas_delete_admin" on public.cajas
  for delete using (public.is_admin());

-- Poblar con las cajas ya existentes en ubicaciones
insert into public.cajas (nombre)
select distinct caja from public.ubicaciones
on conflict (nombre) do nothing;
