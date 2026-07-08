-- 0004: розширена форма заявки — компанія-платник, форма оплати (довідники),
-- важливість, вкладення (файли/фото через Supabase Storage).

-- ── Довідники (адмін керує, як банками) ──────────────────────────────────────
create table if not exists public.payer_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.payment_forms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.payer_companies enable row level security;
alter table public.payment_forms enable row level security;

drop policy if exists "payer_companies_select" on public.payer_companies;
create policy "payer_companies_select" on public.payer_companies for select to authenticated using (true);
drop policy if exists "payer_companies_admin" on public.payer_companies;
create policy "payer_companies_admin" on public.payer_companies for all to authenticated
  using (public.user_role() = 'admin') with check (public.user_role() = 'admin');

drop policy if exists "payment_forms_select" on public.payment_forms;
create policy "payment_forms_select" on public.payment_forms for select to authenticated using (true);
drop policy if exists "payment_forms_admin" on public.payment_forms;
create policy "payment_forms_admin" on public.payment_forms for all to authenticated
  using (public.user_role() = 'admin') with check (public.user_role() = 'admin');

insert into public.payer_companies (name)
select v from (values
  ('ПроектТорг'), ('ТОРГУНИВЕРС ЛТД'), ('УБП УКРАИНА'),
  ('ФОП Гончаров А.Є.'), ('ФОП Гончарова Т.В'), ('ФОП Мацан К.Р.'), ('УБП Украина Сталь')
) t(v)
where not exists (select 1 from public.payer_companies);

insert into public.payment_forms (name)
select v from (values
  ('НДС'), ('ФОП'), ('Ф2 Карта'), ('Ф2 Наличные'), ('Импорт $'), ('Импорт €')
) t(v)
where not exists (select 1 from public.payment_forms);

-- ── Нові поля заявки ─────────────────────────────────────────────────────────
alter table public.payments
  add column if not exists payer_company_id uuid references public.payer_companies(id),
  add column if not exists payment_form_id  uuid references public.payment_forms(id),
  add column if not exists importance        text;

alter table public.payments drop constraint if exists payments_importance_check;
alter table public.payments
  add constraint payments_importance_check
  check (importance is null or importance in ('urgent', 'planned'));

-- Форма більше не збирає отримувача й стару текстову форму оплати — робимо їх необовʼязковими.
alter table public.payments alter column recipient drop not null;
alter table public.payments alter column payment_form drop not null;

-- ── Вкладення ────────────────────────────────────────────────────────────────
create table if not exists public.payment_attachments (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  path       text not null,
  name       text,
  created_at timestamptz not null default now()
);
alter table public.payment_attachments enable row level security;

drop policy if exists "pa_select" on public.payment_attachments;
create policy "pa_select" on public.payment_attachments for select to authenticated
  using (exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.author_id = auth.uid() or public.user_role() in ('admin', 'fin_director', 'buhgalter'))
  ));

drop policy if exists "pa_insert" on public.payment_attachments;
create policy "pa_insert" on public.payment_attachments for insert to authenticated
  with check (
    exists (select 1 from public.payments p where p.id = payment_id and p.author_id = auth.uid())
    or public.user_role() in ('admin', 'buhgalter')
  );

drop policy if exists "pa_delete" on public.payment_attachments;
create policy "pa_delete" on public.payment_attachments for delete to authenticated
  using (
    public.user_role() = 'admin'
    or exists (select 1 from public.payments p where p.id = payment_id and p.author_id = auth.uid())
  );

-- ── Storage bucket для файлів ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('payment-files', 'payment-files', false)
on conflict (id) do nothing;

drop policy if exists "pf_select" on storage.objects;
create policy "pf_select" on storage.objects for select to authenticated
  using (bucket_id = 'payment-files');
drop policy if exists "pf_insert" on storage.objects;
create policy "pf_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-files');
drop policy if exists "pf_delete" on storage.objects;
create policy "pf_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-files');

-- ── Гранти для нових таблиць ─────────────────────────────────────────────────
grant all on public.payer_companies, public.payment_forms, public.payment_attachments
  to anon, authenticated, service_role;
