-- 0002: процес узгодження та проведення оплат.
-- Ролі: zamovnyk (замовник) · buhgalter (бухгалтер) · admin · fin_director.
-- Статуси заявки: pending → approved → paid, гілка rejected (з коментарем).

-- ── Хелпер: роль поточного користувача ───────────────────────────────────────
create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ── Розширення ролей у users ─────────────────────────────────────────────────
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('zamovnyk', 'buhgalter', 'admin', 'fin_director'));

-- Нові користувачі за замовчуванням — найменш привілейований замовник.
alter table public.users alter column role set default 'zamovnyk';

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
    'zamovnyk'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Читати базові профілі (імена для UI) може будь-який авторизований.
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_all" on public.users;
create policy "users_select_all"
  on public.users for select to authenticated using (true);

-- Роль користувача змінює лише адмін.
drop policy if exists "users_admin_update" on public.users;
create policy "users_admin_update"
  on public.users for update to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

-- ── Довідник банків ──────────────────────────────────────────────────────────
create table if not exists public.banks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  account_no text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.banks enable row level security;

drop policy if exists "banks_select" on public.banks;
create policy "banks_select" on public.banks for select to authenticated using (true);

drop policy if exists "banks_admin_all" on public.banks;
create policy "banks_admin_all" on public.banks for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

insert into public.banks (name)
select v from (values ('Банка А'), ('Банка БА'), ('Банка АВА')) as t(v)
where not exists (select 1 from public.banks);

-- ── Заявки на оплату ─────────────────────────────────────────────────────────
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.users(id),
  recipient     text not null,
  amount        numeric(14,2) not null check (amount > 0),
  payment_form  text not null,                         -- готівка / безготівка / картка
  pay_date      date,
  purpose       text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'paid', 'rejected')),
  approved_by   uuid references public.users(id),
  approved_at   timestamptz,
  paid_by       uuid references public.users(id),
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.payments enable row level security;

-- Замовник бачить свої; керівники та бухгалтер — усі.
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select to authenticated
  using (
    author_id = auth.uid()
    or public.user_role() in ('admin', 'fin_director', 'buhgalter')
  );

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments for update to authenticated
  using (
    author_id = auth.uid()
    or public.user_role() in ('admin', 'fin_director', 'buhgalter')
  )
  with check (
    author_id = auth.uid()
    or public.user_role() in ('admin', 'fin_director', 'buhgalter')
  );

-- Валідність переходів статусу — на рівні БД (RLS дає лише грубий доступ).
create or replace function public.enforce_payment_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text := public.user_role();
begin
  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected') then
      if old.status <> 'pending' then
        raise exception 'Погоджувати/відхиляти можна лише заявку на погодженні';
      end if;
      if r not in ('admin', 'fin_director') then
        raise exception 'Погоджувати може лише адмін або фін директор';
      end if;
      new.approved_by := auth.uid();
      new.approved_at := now();

    elsif new.status = 'paid' then
      if old.status <> 'approved' then
        raise exception 'Оплатити можна лише погоджену заявку';
      end if;
      if r not in ('buhgalter', 'admin') then
        raise exception 'Проводити оплату може лише бухгалтер';
      end if;
      new.paid_by := auth.uid();
      new.paid_at := now();

    elsif new.status = 'pending' then
      if old.status <> 'rejected' then
        raise exception 'Повторно подати можна лише відхилену заявку';
      end if;
      if old.author_id <> auth.uid() then
        raise exception 'Повторно подати може лише автор заявки';
      end if;
      new.approved_by := null;
      new.approved_at := null;

    else
      raise exception 'Неприпустимий перехід статусу';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_transition on public.payments;
create trigger trg_payment_transition
  before update on public.payments
  for each row execute function public.enforce_payment_transition();

-- ── Розбивка оплати по банках ────────────────────────────────────────────────
create table if not exists public.payment_allocations (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  bank_id    uuid not null references public.banks(id),
  amount     numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
alter table public.payment_allocations enable row level security;

drop policy if exists "alloc_select" on public.payment_allocations;
create policy "alloc_select" on public.payment_allocations for select to authenticated
  using (exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.author_id = auth.uid() or public.user_role() in ('admin', 'fin_director', 'buhgalter'))
  ));

drop policy if exists "alloc_write" on public.payment_allocations;
create policy "alloc_write" on public.payment_allocations for all to authenticated
  using (public.user_role() in ('buhgalter', 'admin'))
  with check (public.user_role() in ('buhgalter', 'admin'));

-- ── Коментарі (причина відхилення, обговорення) ──────────────────────────────
create table if not exists public.payment_comments (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  author_id  uuid not null references public.users(id),
  text       text not null,
  created_at timestamptz not null default now()
);
alter table public.payment_comments enable row level security;

drop policy if exists "pc_select" on public.payment_comments;
create policy "pc_select" on public.payment_comments for select to authenticated
  using (exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.author_id = auth.uid() or public.user_role() in ('admin', 'fin_director', 'buhgalter'))
  ));

drop policy if exists "pc_insert" on public.payment_comments;
create policy "pc_insert" on public.payment_comments for insert to authenticated
  with check (author_id = auth.uid());
