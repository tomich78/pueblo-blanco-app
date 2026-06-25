-- Tabla histórica de clientes (de la base vieja), solo consulta.
create table if not exists public.clientes_historicos (
  id integer primary key,
  nombre text not null,
  email text not null,
  telefono text,
  domicilio text,
  status integer,
  fecha_alta timestamptz
);

alter table public.clientes_historicos enable row level security;

create policy "clientes_historicos_select_admin" on public.clientes_historicos
  for select using (public.is_admin());
