-- Pueblo Blanco — esquema inicial
-- Ejecutar en Supabase: Dashboard -> SQL Editor -> New query -> pegar todo -> Run

-- ===== categories =====
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ===== books =====
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  cover_url text,
  category_id uuid references public.categories(id) on delete set null,
  isbn text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists books_category_id_idx on public.books(category_id);
create index if not exists books_active_idx on public.books(active);

-- ===== profiles (extiende auth.users) =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- crea automáticamente un profile cuando se registra un usuario nuevo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===== orders =====
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  guest_name text,
  guest_email text,
  guest_phone text,
  status text not null default 'pendiente_pago'
    check (status in ('pendiente_pago', 'pagado', 'cancelado', 'enviado', 'entregado')),
  payment_method text not null
    check (payment_method in ('mercado_pago', 'efectivo_transferencia')),
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);

-- ===== order_items =====
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ===== RLS =====
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- categories: lectura pública, escritura solo admin
create policy "categories_select_public" on public.categories
  for select using (true);

create policy "categories_write_admin" on public.categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- books: lectura pública de libros activos, escritura solo admin
create policy "books_select_public" on public.books
  for select using (active = true);

create policy "books_select_admin_all" on public.books
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "books_write_admin" on public.books
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "books_update_admin" on public.books
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "books_delete_admin" on public.books
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- profiles: cada usuario ve/edita su propio perfil; admin ve todos
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_select_admin_all" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- orders: el dueño ve sus propias órdenes; admin ve todas; cualquiera (incluso anónimo) puede crear una orden
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders_select_admin_all" on public.orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "orders_insert_any" on public.orders
  for insert with check (true);

create policy "orders_update_admin" on public.orders
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- order_items: visibles si la orden es visible; insertables junto con la orden
create policy "order_items_select_via_order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or exists (
          select 1 from public.profiles where id = auth.uid() and is_admin
        ))
    )
  );

create policy "order_items_insert_any" on public.order_items
  for insert with check (true);
