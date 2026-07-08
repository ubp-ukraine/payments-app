# Оплати (payments-app)

Максимально спрощений застосунок на тому ж стеку, що й основний проєкт:
**Vite + React + TypeScript + Tailwind + Supabase**.

Наразі це каркас:

- авторизація користувача (email + пароль через Supabase Auth);
- одна роль — `admin`;
- стартова сторінка — **«Оплати»** (поки заглушка).

## Стек

| Шар      | Технологія                        |
| -------- | --------------------------------- |
| Frontend | Vite, React 18, TypeScript        |
| Стилі    | Tailwind CSS                      |
| Auth/БД  | Supabase (self-hosted, окремий api-домен) |

## 1. Встановлення

```bash
cd payments-app
npm install
```

## 2. База даних (новий Supabase-інстанс на VM)

Проєкт розрахований на **окремий self-hosted Supabase** на власному api-домені
(наприклад `https://api.oplaty.example.com`) — не змішується з основним WMS.
Піднімається на **тій самій VM**, що й основний проєкт, але з іншим `project_id`
і зміщеними портами (Kong на `54331`) — див. [`supabase/config.toml`](supabase/config.toml).

**Повна покрокова інструкція для VM (Supabase CLI + Cloudflare Tunnel):
[`docs/DEPLOY_SELF_HOSTED.md`](docs/DEPLOY_SELF_HOSTED.md).**

Коротко: на VM `npx supabase start` сам підніме стек на зміщених портах і застосує
міграцію [`supabase/migrations/0001_init_auth_and_users.sql`](supabase/migrations/0001_init_auth_and_users.sql) —
створить таблицю `public.users`, RLS і тригер авто-профілю з роллю `admin`.

## 3. Налаштування .env

Скопіюй `.env.example` → `.env` і підстав значення нового інстансу:

```
VITE_SUPABASE_URL=https://api.oplaty.example.com
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # Studio → Settings → API, або `npx supabase status`
```

## 4. Створення адміністратора

Через **Supabase Studio → Authentication → Users → Add user** (email + пароль,
Auto Confirm). Профіль з роллю `admin` створиться автоматично тригером.

## 5. Запуск

```bash
npm run dev        # http://localhost:5174
npm run build      # прод-збірка у dist/
npm run typecheck  # перевірка типів
```

## Структура

```
payments-app/
├─ src/
│  ├─ App.tsx                     # loading / login / гейт ролі / Layout+Payments
│  ├─ contexts/AuthContext.tsx    # сесія, профіль, signIn/signOut
│  ├─ components/
│  │  ├─ auth/LoginForm.tsx       # форма входу
│  │  └─ layout/Layout.tsx        # шапка + кнопка «Вийти»
│  ├─ pages/Payments.tsx          # стартова сторінка «Оплати»
│  ├─ lib/supabase.ts             # клієнт Supabase
│  └─ types/database.ts           # типи User / UserRole
└─ supabase/migrations/0001_init_auth_and_users.sql
```
