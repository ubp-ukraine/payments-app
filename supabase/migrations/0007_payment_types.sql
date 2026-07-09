-- ── Типи оплат (довідник) + розбивка суми оплати по типах ────────────────────
-- Бухгалтер (і адмін) може створювати власні типи та розкидати суму по них.

create table if not exists public.payment_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.payment_types enable row level security;

drop policy if exists "pt_select" on public.payment_types;
create policy "pt_select" on public.payment_types for select to authenticated
  using (true);

drop policy if exists "pt_write" on public.payment_types;
create policy "pt_write" on public.payment_types for all to authenticated
  using (public.user_role() in ('buhgalter', 'admin'))
  with check (public.user_role() in ('buhgalter', 'admin'));

-- Розбивка оплати по типах (сума на кожен тип).
create table if not exists public.payment_type_allocations (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  type_id    uuid not null references public.payment_types(id),
  amount     numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
alter table public.payment_type_allocations enable row level security;

drop policy if exists "pta_select" on public.payment_type_allocations;
create policy "pta_select" on public.payment_type_allocations for select to authenticated
  using (exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.author_id = auth.uid() or public.user_role() in ('admin', 'fin_director', 'buhgalter'))
  ));

drop policy if exists "pta_write" on public.payment_type_allocations;
create policy "pta_write" on public.payment_type_allocations for all to authenticated
  using (public.user_role() in ('buhgalter', 'admin'))
  with check (public.user_role() in ('buhgalter', 'admin'));

grant all on public.payment_types, public.payment_type_allocations
  to anon, authenticated, service_role;
