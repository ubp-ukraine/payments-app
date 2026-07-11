-- ── Унікальний людиночитний номер платежу (OP-000123) ───────────────────────
-- Послідовний bigint через sequence; форматування префікса — на клієнті.

alter table public.payments add column if not exists number bigint;

create sequence if not exists public.payments_number_seq owned by public.payments.number;

-- Бекфіл наявних рядків у порядку створення.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.payments
  where number is null
)
update public.payments p
set number = o.rn
from ordered o
where p.id = o.id;

-- Продовжуємо лічильник із максимуму.
-- 3-арг форма: якщо таблиця порожня (max = null → 0), стартуємо з 1 і is_called=false,
-- щоб перший nextval повернув 1 (setval із 0 недопустимий: мін. значення sequence = 1).
select setval(
  'public.payments_number_seq',
  greatest(coalesce((select max(number) from public.payments), 0), 1),
  coalesce((select max(number) from public.payments), 0) > 0
);

-- Нові рядки автоматично отримують номер.
alter table public.payments alter column number set default nextval('public.payments_number_seq');

create unique index if not exists payments_number_key on public.payments(number);
