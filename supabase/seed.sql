-- Datos de prueba para ver el catálogo funcionando.
-- Ejecutar en el SQL Editor de Supabase, después de schema.sql.
-- Estos libros se pueden borrar/editar luego desde el panel admin.

insert into public.categories (name, slug) values
  ('Ficción', 'ficcion'),
  ('No ficción', 'no-ficcion'),
  ('Infantil', 'infantil')
on conflict (slug) do nothing;

insert into public.books (title, author, description, price, stock, category_id, active)
select
  v.title, v.author, v.description, v.price, v.stock,
  (select id from public.categories where slug = v.category_slug),
  true
from (
  values
    ('Cien años de soledad', 'Gabriel García Márquez', 'Una de las obras cumbre del realismo mágico latinoamericano.', 12500.00, 8, 'ficcion'),
    ('Sapiens', 'Yuval Noah Harari', 'Una breve historia de la humanidad.', 15800.00, 5, 'no-ficcion'),
    ('El Principito', 'Antoine de Saint-Exupéry', 'Un clásico de la literatura infantil y universal.', 8900.00, 12, 'infantil')
) as v(title, author, description, price, stock, category_slug);
