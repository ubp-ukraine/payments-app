-- 0008: розподіл по банках як ОКРЕМИЙ етап між «Погоджено» та «Оплачено».
-- Новий статус allocated. Ланцюг: pending → approved → allocated → paid (гілка rejected).
-- Бухгалтер спершу розподіляє суму по банках (approved → allocated),
-- потім окремою дією проводить оплату (allocated → paid).

-- ── Розширюємо перелік статусів ──────────────────────────────────────────────
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'approved', 'allocated', 'paid', 'rejected'));

-- ── Хто і коли зробив розподіл по банках ─────────────────────────────────────
alter table public.payments
  add column if not exists allocated_by uuid references public.users(id),
  add column if not exists allocated_at timestamptz;

-- Бекфіл історичних оплат: у вже проведених заявок вважаємо, що розподіл
-- відбувся разом із оплатою — щоб таймлайн мав повні дані по всіх блоках.
update public.payments
set allocated_by = coalesce(allocated_by, paid_by),
    allocated_at = coalesce(allocated_at, paid_at)
where status = 'paid' and allocated_at is null;

-- ── Оновлений контроль переходів статусу ─────────────────────────────────────
-- Ключова зміна: paid тепер лише з allocated (раніше — напряму з approved).
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

    elsif new.status = 'allocated' then
      if old.status <> 'approved' then
        raise exception 'Розподілити по банках можна лише погоджену заявку';
      end if;
      if r not in ('buhgalter', 'admin') then
        raise exception 'Розподіляти по банках може лише бухгалтер';
      end if;
      new.allocated_by := auth.uid();
      new.allocated_at := now();

    elsif new.status = 'paid' then
      if old.status <> 'allocated' then
        raise exception 'Оплатити можна лише заявку з розподілом по банках';
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
