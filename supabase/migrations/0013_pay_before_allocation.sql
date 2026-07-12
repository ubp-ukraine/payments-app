-- 0013: ОПЛАТА ПЕРЕД РОЗПОДІЛОМ ПО БАНКАХ.
-- Новий ланцюг: pending → approved → paid → allocated (гілка rejected).
-- Спочатку бухгалтер проводить оплату (+ платіжка), і ЛИШЕ потім розбиває суму
-- по банках. allocated стає ФІНАЛЬНИМ станом (повністю оброблено).
-- Це дзеркальна заміна порядку 'allocated' ↔ 'paid' у тригері з 0008.

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
      -- Оплата тепер одразу після погодження.
      if old.status <> 'approved' then
        raise exception 'Оплатити можна лише погоджену заявку';
      end if;
      if r not in ('buhgalter', 'admin') then
        raise exception 'Проводити оплату може лише бухгалтер';
      end if;
      new.paid_by := auth.uid();
      new.paid_at := now();

    elsif new.status = 'allocated' then
      -- Розподіл по банках — фінальний крок, лише після оплати.
      if old.status <> 'paid' then
        raise exception 'Розподілити по банках можна лише оплачену заявку';
      end if;
      if r not in ('buhgalter', 'admin') then
        raise exception 'Розподіляти по банках може лише бухгалтер';
      end if;
      new.allocated_by := auth.uid();
      new.allocated_at := now();

    elsif new.status = 'pending' then
      if old.status <> 'rejected' then
        raise exception 'Повторно подати можна лише відхилену заявку';
      end if;
      if old.author_id <> auth.uid() then
        raise exception 'Повторно подати може лише автор заявки';
      end if;
      new.approved_by  := null;
      new.approved_at  := null;
      new.allocated_by := null;
      new.allocated_at := null;
      new.paid_by      := null;
      new.paid_at      := null;

    else
      raise exception 'Неприпустимий перехід статусу';
    end if;
  end if;
  return new;
end;
$$;

-- ── Міграція наявних даних під новий порядок (тригер тимчасово вимкнено) ──────
alter table public.payments disable trigger trg_payment_transition;

-- Заявки в старому 'allocated' (розподілені, але ще НЕ оплачені): у новому порядку
-- спершу має бути оплата — повертаємо у 'approved' і скидаємо розподіл.
update public.payments
set status = 'approved', allocated_by = null, allocated_at = null
where status = 'allocated' and paid_at is null;

-- Старі фінальні 'paid' (у старому порядку вже були розподілені перед оплатою) →
-- новий фінальний стан 'allocated'. paid_at зберігається (для звітів за датою оплати).
update public.payments
set status = 'allocated',
    allocated_at = coalesce(allocated_at, paid_at),
    allocated_by = coalesce(allocated_by, paid_by)
where status = 'paid';

alter table public.payments enable trigger trg_payment_transition;
