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

## 2. База даних (новий Supabase-інстанс)

Проєкт розрахований на **окремий self-hosted Supabase** на власному api-домені
(наприклад `https://api.oplaty.example.com`) — не змішується з основним WMS.

1. Розгорни новий інстанс Supabase (Docker / CLI) на сервері з окремим доменом.
2. Застосуй міграцію [`supabase/migrations/0001_init_auth_and_users.sql`](supabase/migrations/0001_init_auth_and_users.sql):
   - або через **Studio → SQL Editor** (вставити вміст файлу та Run);
   - або `psql "<CONNECTION_STRING>" -f supabase/migrations/0001_init_auth_and_users.sql`.

Міграція створює таблицю `public.users`, вмикає RLS і додає тригер, який
автоматично заводить профіль з роллю `admin` для кожного нового користувача Auth.

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
