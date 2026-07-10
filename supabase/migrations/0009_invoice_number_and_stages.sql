-- 0009: номер рахунку (для фільтрації) + прив'язка коментарів і файлів до етапу.
-- Дає змогу кожному блоку таймлайну показувати «свої» деталі:
--   submission — заповнення форми (файл рахунку, початковий коментар),
--   approval   — погодження/відхилення (коментар),
--   allocation — розподіл по банках,
--   payment    — оплата (платіжка + деталі),
--   discussion — загальне обговорення (права колонка модалки).

-- ── Номер рахунку заявки ─────────────────────────────────────────────────────
alter table public.payments add column if not exists invoice_number text;

-- Пришвидшує пошук/фільтрацію за номером рахунку.
create index if not exists payments_invoice_number_idx
  on public.payments (invoice_number);

-- ── Етап для коментарів ──────────────────────────────────────────────────────
alter table public.payment_comments
  add column if not exists stage text not null default 'discussion';

alter table public.payment_comments drop constraint if exists payment_comments_stage_check;
alter table public.payment_comments
  add constraint payment_comments_stage_check
  check (stage in ('submission', 'approval', 'allocation', 'payment', 'discussion'));

-- ── Етап для вкладень ────────────────────────────────────────────────────────
alter table public.payment_attachments
  add column if not exists stage text not null default 'discussion';

alter table public.payment_attachments drop constraint if exists payment_attachments_stage_check;
alter table public.payment_attachments
  add constraint payment_attachments_stage_check
  check (stage in ('submission', 'approval', 'allocation', 'payment', 'discussion'));

-- Табличні привілеї на нові колонки успадковуються з grant у 0003 (grant all on all tables),
-- тож окремих GRANT не потрібно.
