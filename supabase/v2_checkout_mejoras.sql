-- Ronda 2: envío/retiro, comprobantes de transferencia, métodos de pago separados.
-- Ejecutar en el SQL Editor de Supabase.

-- nuevas columnas en orders
alter table public.orders
  add column if not exists delivery_method text check (delivery_method in ('retiro', 'envio')),
  add column if not exists shipping_address text,
  add column if not exists payment_proof_url text;

-- separar payment_method en mercado_pago / efectivo / transferencia
alter table public.orders drop constraint if exists orders_payment_method_check;
update public.orders set payment_method = 'transferencia' where payment_method = 'efectivo_transferencia';
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('mercado_pago', 'efectivo', 'transferencia'));

-- nuevo estado esperando_confirmacion
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pendiente_pago', 'esperando_confirmacion', 'pagado', 'cancelado', 'enviado', 'entregado'));

-- bucket de comprobantes (subida solo vía API route con service role; lectura pública)
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

drop policy if exists "comprobantes_select_public" on storage.objects;
create policy "comprobantes_select_public" on storage.objects
  for select using (bucket_id = 'comprobantes');
