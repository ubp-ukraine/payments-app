-- ── Перегляд довідника «Форма оплати» ───────────────────────────────────────
-- Приводимо форми оплати до узгодженого набору (укр. назви):
--   ПДВ · без ПДВ · Ф2 Карта · Ф2 Готівка · Валюта $ · Валюта €
-- Наявні рядки ПЕРЕЙМЕНОВУЄМО (а не видаляємо), щоб зберегти payment_form_id
-- у вже поданих заявках. Ідемпотентно: повторний запуск нічого не ламає.

-- 1) Перейменування наявних форм (рос. → укр., за змістом).
update public.payment_forms set name = 'ПДВ'        where name = 'НДС';
update public.payment_forms set name = 'Ф2 Готівка' where name = 'Ф2 Наличные';
update public.payment_forms set name = 'Валюта $'   where name = 'Импорт $';
update public.payment_forms set name = 'Валюта €'   where name = 'Импорт €';
-- 'Ф2 Карта' лишається як є.

-- 2) Нова форма «без ПДВ».
insert into public.payment_forms (name)
select 'без ПДВ'
where not exists (select 1 from public.payment_forms where name = 'без ПДВ');

-- 3) Прибираємо з вибору те, чого не має бути.
--    ФОП — деактивуємо (могло використовуватись історично, посилання зберігаємо).
update public.payment_forms set is_active = false where name = 'ФОП';
--    Безготівковий/Готівковий — тимчасові тестові рядки; видаляємо лише якщо
--    на них не посилається жодна заявка.
delete from public.payment_forms pf
where pf.name in ('Безготівковий', 'Готівковий')
  and not exists (select 1 from public.payments p where p.payment_form_id = pf.id);

-- 4) Порядок у випадному списку (сортування за created_at) — як у вимозі.
update public.payment_forms pf
set created_at = now() + (o.ord * interval '1 second')
from (values
  ('ПДВ', 1), ('без ПДВ', 2), ('Ф2 Карта', 3),
  ('Ф2 Готівка', 4), ('Валюта $', 5), ('Валюта €', 6)
) as o(nm, ord)
where pf.name = o.nm;
