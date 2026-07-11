-- ── ЮР особа-отримувач: код ЄДРПОУ/ІПН ───────────────────────────────────────
-- Назва ЮР особи вже зберігається у наявній колонці payments.recipient.
-- Додаємо код ЄДРПОУ (8 цифр) / ІПН (10–12 цифр) отримувача.
alter table public.payments
  add column if not exists recipient_tax_id text;
