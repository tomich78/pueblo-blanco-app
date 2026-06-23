-- Función para descontar stock de forma atómica al confirmarse un pago.
-- Ejecutar en el SQL Editor de Supabase.

create or replace function public.decrement_book_stock(p_book_id uuid, p_quantity integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.books
  set stock = greatest(stock - p_quantity, 0)
  where id = p_book_id;
$$;
