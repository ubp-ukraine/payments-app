-- Payments-app: базова схема авторизації.
-- Одна роль: admin. Стартова сторінка застосунку — «Оплати».
--
-- Застосувати на новому Supabase-інстансі:
--   psql "<CONNECTION_STRING>" -f supabase/migrations/0001_init_auth_and_users.sql
-- або вставити вміст у Supabase Studio → SQL Editor і виконати.

-- ── Профілі користувачів (1:1 до auth.users) ─────────────────────────────────
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  -- Поки що єдина роль. CHECK легко розширити пізніше.
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Кожен бачить лише свій профіль.
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

-- Кожен може оновити власний профіль (напр. full_name), але не роль/id.
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Авто-створення профілю при реєстрації в auth.users ───────────────────────
-- Новий користувач автоматично отримує профіль з роллю admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'admin'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── (Опційно) Бекфіл для вже існуючих користувачів auth.users ────────────────
insert into public.users (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', ''), 'admin'
from auth.users u
on conflict (id) do nothing;
