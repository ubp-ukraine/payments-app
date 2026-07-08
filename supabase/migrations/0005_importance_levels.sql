-- 0005: розширені рівні важливості оплати
-- (Терміново / Сьогодні / 1–2 дні / Цього тижня / Цього місяця).

-- Перенести старі значення на новий набір, щоб новий CHECK не впав.
update public.payments set importance = 'urgent'     where importance = 'urgent';
update public.payments set importance = 'this_month' where importance = 'planned';

alter table public.payments drop constraint if exists payments_importance_check;
alter table public.payments
  add constraint payments_importance_check
  check (importance is null or importance in ('urgent', 'today', 'days_1_2', 'this_week', 'this_month'));
