-- 0003: табличні привілеї для PostgREST-ролей.
-- Симптом без цього: будь-який запит до REST повертає 403 (permission denied),
-- бо ролі anon/authenticated не мали GRANT на таблиці — навіть до перевірки RLS.
-- Доступ до РЯДКІВ і далі повністю визначає RLS (це лише табличний рівень).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Майбутні таблиці/послідовності теж одразу доступні цим ролям.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
