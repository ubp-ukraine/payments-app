-- ── Фін директор керує довідником підприємств-платників ──────────────────────
-- Дозволяємо фін директору ДОДАВАТИ підприємства у вибірку для оплати
-- (і активувати/деактивувати їх). Видалення лишається лише за адміном.
-- Політики RLS permissive → діють в OR з наявною admin-політикою.

drop policy if exists "payer_companies_fin_insert" on public.payer_companies;
create policy "payer_companies_fin_insert" on public.payer_companies
  for insert to authenticated
  with check (public.user_role() = 'fin_director');

drop policy if exists "payer_companies_fin_update" on public.payer_companies;
create policy "payer_companies_fin_update" on public.payer_companies
  for update to authenticated
  using (public.user_role() = 'fin_director')
  with check (public.user_role() = 'fin_director');
