-- Función para restaurar stock cuando se cancela un pedido que ya estaba pagado.
-- Ejecutar en el SQL Editor de Supabase.

create or replace function public.increment_book_stock(p_book_id uuid, p_quantity integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.books
  set stock = stock + p_quantity
  where id = p_book_id;
$$;
