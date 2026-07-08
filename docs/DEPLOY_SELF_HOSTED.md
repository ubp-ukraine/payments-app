# Розгортання payments-app на VM (другий Supabase поруч з основним)

Той самий підхід, що й у WMS: **self-hosted Supabase (CLI + Docker) на Ubuntu VM**,
публічний API через **Cloudflare Tunnel**, фронт — статична збірка Vite.

Відмінність від основного проєкту: цей інстанс живе **на тій самій VM**, тому має
**інший `project_id`** і **окремий блок портів `48000-48007`** (навмисно далеко від
основного стеку). Обидва стеки працюють одночасно й не конфліктують. Все це вже
прописано у [`supabase/config.toml`](../supabase/config.toml).

> Скрізь заміни `api.oplaty.example.com` / `oplaty.example.com` на реальні домени.

---

## Мапа портів (щоб не конфліктувати з основним)

| Служба | Основний (WMS) | payments-app |
| ------ | -------------- | ------------ |
| Kong (API) | 54321 | **48000** ← сюди веде новий Tunnel |
| PostgreSQL | 54322 | 48001 |
| shadow | 54320 | 48002 |
| Pooler | 54329 | 48003 |
| Studio | 54323 | 48004 |
| Inbucket | 54324 | 48005 |
| Analytics | 54327 | 48006 |
| Edge inspector | 8083 | 48007 |

---

## 1. Забрати код на VM

```bash
cd ~
git clone https://github.com/ubp-ukraine/payments-app.git
cd payments-app
```

(Docker і Node вже стоять на VM з часів основного проєкту. Перевір: `docker ps`, `node -v`.)

## 2. Домен у config.toml — ПІЗНІШЕ (важливо про порядок!)

**НЕ прописуй публічний домен до того, як підніметься стек і запрацює тунель.**
`supabase start` робить health-check по `external_url`; якщо домен ще не резолвиться,
старт впаде з `Head "https://.../rest-admin/v1/ready": ... no such host` і CLI погасить
контейнери. Тому:

- `[api].external_url` і `[auth].jwt_issuer` наразі **закоментовані** — так і лиши для
  першого запуску (health-check піде на `127.0.0.1:48000`, стек підніметься).
- Розкоментуєш і впишеш реальний домен **на кроці 5–6**, коли тунель + DNS вже працюють,
  і зробиш `npx supabase stop && npx supabase start`.
- `[auth].site_url` / `additional_redirect_urls` можна одразу вказати URL фронта
  (напр. `https://payments-app.crm-a10.workers.dev`) — вони не пінгуються на старті.

## 3. Підняти стек (окремий project_id → окремі контейнери)

```bash
cd ~/payments-app
npx supabase start
```

`supabase start` автоматично:

- підніме контейнери на **окремих портах** (Kong на **48000**);
- застосує міграції з `supabase/migrations/` — тобто створить таблицю `users`,
  RLS і тригер авто-профілю (роль `admin`).

Перевір, що обидва стеки живі:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E 'payments-app|supabase'
```

## 4. Взяти ключі клієнта

```bash
cd ~/payments-app
npx supabase status
```

Потрібні:

- **API URL** — локально `http://<LAN_IP>:48000` (публічно буде домен через тунель);
- **anon / Publishable key** → піде у `VITE_SUPABASE_ANON_KEY` фронта.

`service_role` у фронт **не** потрапляє.

## 5. Cloudflare Tunnel — новий public hostname

У тому ж конекторі `cloudflared`, що обслуговує основний API (або в новому тунелі):

**Zero Trust → Networks → Tunnels → (твій тунель) → Public Hostname → Add:**

- **Subdomain/Hostname:** `api.<твій-домен>` (той самий, що в `external_url`, без `/` в кінці)
- **Service:** `http://<LAN_IP_VM>:48000` ← **новий порт Kong**, лише схема+хост+порт, без шляху

У **DNS** зони домену Cloudflare зʼявиться запис на тунель (тип Tunnel / CNAME на `*.cfargotunnel.com`).

## 6. Перевірка API

```bash
curl -H "apikey: <ANON_KEY>" https://api.<твій-домен>/rest/v1/
```

Має відповісти PostgREST (JSON), а не HTML стороннього сайту.

## 7. Створити адміна

Studio цього інстансу: `http://<LAN_IP>:48004` (або окремий hostname у тунелі).
**Authentication → Users → Add user** (email + пароль, Auto Confirm).
Профіль з роллю `admin` створиться автоматично тригером `on_auth_user_created`.

## 8. Фронт (.env + збірка)

На машині розробника у `payments-app/.env`:

```
VITE_SUPABASE_URL=https://api.<твій-домен>
VITE_SUPABASE_ANON_KEY=<anon key з кроку 4>
```

```bash
npm install
npm run build      # dist/ — статична збірка
```

Далі — так само, як основний проєкт: віддай `dist/` через Cloudflare Workers / Nginx,
або для перевірки локально `npm run dev` (http://localhost:5174).

---

## Керування стеком payments-app

```bash
cd ~/payments-app
npx supabase stop      # зупинити лише цей інстанс (основний не чіпає)
npx supabase start     # підняти знову
npx supabase status    # порти та ключі
```

## Оновлення схеми БД у майбутньому

Додай новий файл у `supabase/migrations/` (напр. `0002_payments_table.sql`) і:

```bash
git pull
npx supabase migration up      # застосувати нові міграції до запущеної БД
```

## Бекап

Аналогічно основному проєкту, але вкажи порт БД **48001** і потрібний контейнер
цього інстансу. Див. `docs/SELF_HOSTED_STACK.md` основного репозиторію, розділ
«Автоматичний бекап PostgreSQL».
