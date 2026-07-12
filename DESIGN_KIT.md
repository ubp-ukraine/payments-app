# Design Kit — payments-app (Оплати)

Authoritative contract for the visual redesign. Derived from the WMS DESIGN_SYSTEM spec,
adapted to this app's existing navy brand palette. **Every screen must build to this contract.**

## 0. Golden rules for implementers
- **Preserve ALL behaviour.** Never change data flow, props, handlers, API calls, RLS logic,
  routing, or state machines. This is a *presentation* refresh only.
- **Keep public component APIs stable** unless this doc says otherwise. If you restyle a shared
  component (KanbanBoard, StatusPill, PaymentFilter, StatusSectionList, Modal), keep its props.
- **Compose from primitives** in `src/components/ui/`. Do not re-invent button/badge/input classes.
- Ukrainian everywhere. `tabular-nums` on aligned numbers. lucide-react icons only.
- After editing, the file must still typecheck (no unused imports, no `any` leaks).

## 1. Tokens
- **Accent / primary action / active nav:** `brand-600` (navy #264B87), hover `brand-700`, active `brand-800`.
  (This app's brand IS the accent — do NOT switch to tailwind `blue-600`.)
- **App background:** `bg-slate-50`. **Dark list banners:** `from-slate-800 to-slate-700`.
- **Component neutrals:** `stone-*` for form controls/secondary buttons/modal chrome; `gray-*` for
  fine UI text, card borders, nav dividers.
- **Danger:** `rose-600` (buttons), `red-*` for error text & badge counters.
- **Text:** primary `text-gray-900`; secondary `text-gray-500/600`; muted `text-gray-400`.
- **Semantic status pairs** (soft: `-50/-100` bg + `-700/-800` text, sometimes `-200` border):
  success `emerald`, warning/waiting `amber`, danger `red`, info/in-progress `blue`, neutral `gray/slate`.

### Payment status → meta (already in `src/constants/domain.ts` `STATUS_META`; keep as single source)
pending=amber, approved=blue, allocated=violet, paid=green/emerald, rejected=red. Do not hardcode
status colours in screens — always read `STATUS_META[status]`.

## 2. Shape / spacing / shadow / motion
- Radii: buttons·fields·tag-badges `rounded-lg`; cards `rounded-xl`; modals·banners `rounded-2xl`;
  pills·avatars·count-badges `rounded-full`; small tags `rounded-md`.
- Shadows: cards/buttons `shadow-sm`; list banners `shadow-lg`; modals custom
  `shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]`.
- Borders: `border-gray-200` (or `border-stone-200` on form chrome). Dividers `border-gray-100`.
- Page padding: `p-4 sm:p-5 lg:p-6`. Gaps: `gap-2/3`; nav `space-y-0.5`; kanban `gap-4`.
- Focus: buttons `focus:outline-none focus:ring-4 focus:ring-brand-600/20`;
  fields `focus:outline-none focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5`.
- Motion: default `transition-colors duration-150` (or `transition-all duration-150`).
  Modals animate `animate-modalIn` (fade + scale 0.96→1, +8px→0, 150ms). Drawers `duration-300`.

## 3. tailwind.config.js — extend
Keep `brand` palette. Add keyframes/animation:
```
extend: {
  colors: { brand: {…unchanged…} },
  keyframes: {
    fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
    modalIn: { '0%': { opacity: '0', transform: 'scale(.96) translateY(8px)' },
               '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
  },
  animation: { fadeIn: 'fadeIn 150ms ease-out', modalIn: 'modalIn 150ms ease-out' },
}
```

## 4. src/index.css — replace body with:
```
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body { @apply bg-slate-50 text-gray-900; }
}

@layer utilities {
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }
}
/* thin custom scrollbars */
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { @apply bg-gray-200 rounded-full; }
*::-webkit-scrollbar-track { background: transparent; }

/* Dark theme via filter invert (see §11). Applied by class on <html>. */
html.theme-dark { filter: invert(0.92) hue-rotate(180deg) saturate(0.9); background: #1a1a1a; }
html.theme-dark img, html.theme-dark video, html.theme-dark canvas,
html.theme-dark svg.no-invert, html.theme-dark .no-invert {
  filter: invert(1) hue-rotate(180deg);
}
```

## 5. index.html
- Set `<html lang="uk">`.
- Add a pre-render theme init in `<head>` (no FOUC):
  `<script>try{if(localStorage.getItem('oplaty-theme')==='dark')document.documentElement.classList.add('theme-dark')}catch(e){}</script>`

## 6. UI primitives (create in `src/components/ui/`)
Each is a small typed wrapper. Exact APIs (implementers consume EXACTLY these):

### Button.tsx  `export function Button(props)`
props: `variant?: 'primary'|'secondary'|'outline'|'danger'|'ghost'` (default primary),
`size?: 'sm'|'md'|'lg'` (default md), `type`, `disabled`, `onClick`, `className?`, `children`,
plus native button attrs (`...rest`). Recipe:
```
base: inline-flex items-center justify-center gap-1.5 font-medium rounded-lg
      transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none
      focus:outline-none focus:ring-4 focus:ring-brand-600/20
primary:   bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm
secondary: bg-stone-100 text-stone-700 hover:bg-stone-200
outline:   border border-stone-200 bg-white text-stone-700 hover:bg-stone-50
danger:    bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm
ghost:     text-stone-600 hover:bg-stone-100
sizes: sm px-2.5 py-1.5 text-xs · md px-3.5 py-2 text-sm · lg px-5 py-2.5 text-base
```

### Card.tsx  `Card`, `CardHeader`, `CardContent`
Card: `bg-white rounded-xl border border-gray-200 shadow-sm` (+className). CardHeader:
`px-5 py-4 border-b border-gray-100`. CardContent: `px-5 py-4`.

### Badge.tsx  `export function Badge({variant, children, className})`
`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium` + variant:
default `bg-gray-100 text-gray-700` · success `bg-emerald-50 text-emerald-700` ·
warning `bg-amber-50 text-amber-700` · danger `bg-red-50 text-red-700` ·
info `bg-blue-50 text-blue-700` · brand `bg-brand-50 text-brand-700` · muted `bg-slate-100 text-slate-500`.

### InfoBanner.tsx  `export function InfoBanner({tone, title?, children, icon?})`
`rounded-xl border p-3.5 flex gap-2.5 text-sm` tones info/warning/danger/success/neutral →
`bg-*-50 border-*-200 text-*-800` (info=blue, warning=amber, danger=red, success=emerald, neutral=slate).
Icon 16px in the tone colour. Use for form errors and notices.

### PageHeader.tsx  `export function PageHeader({title, subtitle?, action?})`
`flex items-start justify-between gap-3 mb-5`; title `text-xl font-semibold text-gray-900`,
subtitle `text-sm text-gray-500`, `action` slot right.

### ListBanner.tsx  `export function ListBanner({title, subtitle?, actions?, compact?})`
Dark gradient hero for list pages:
`bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-lg text-white`
`p-6 sm:p-8` (compact → `px-6 py-4`). Title `text-2xl sm:text-3xl font-bold`
(compact `text-xl`), subtitle `text-slate-200 text-sm sm:text-base mt-1`, `actions` right.

### SegmentedToggle.tsx  `export function SegmentedToggle<T>({value, onChange, options})`
options: `{value:T,label:string,icon?:LucideIcon}[]`. Two skins via `tone?: 'light'|'onDark'`:
- light (default, on white): container `inline-flex rounded-lg border border-gray-200 bg-white p-0.5`,
  active `bg-brand-600 text-white`, inactive `text-gray-600 hover:bg-gray-50`, item
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium`.
- onDark (inside ListBanner): container `bg-slate-600/50 rounded-lg p-1`, active
  `bg-white text-slate-800 shadow-sm`, inactive `text-slate-300 hover:text-white`.
Replaces the hand-rolled Kanban/List & Board/List toggles.

### Tabs.tsx  `export function Tabs({tabs, active, onChange})`
tabs: `{key, label, count?, color?}[]`. Row `flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none`.
Tab `px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors`; active
`border-brand-600 text-brand-700` (or tab.color), inactive `border-transparent text-gray-500 hover:text-gray-800`;
optional count pill right of label.

### FormField.tsx  `FormField`, `TextInput`, `TextArea`, `Select`
- FormField: `{label, required?, htmlFor?, error?, pending?, hint?, action?, children}`. Label
  `text-sm font-medium text-stone-700` + red `*` when required; `action` right of label;
  under field one of: error `text-rose-600` (priority) / pending amber “Заповніть це поле” /
  hint `text-stone-500`, all `text-xs mt-1`.
- Inputs base:
  `w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg transition-colors
   focus:outline-none focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5
   disabled:bg-stone-50 disabled:text-stone-500`.
  State overrides: error `border-rose-300 bg-rose-50/40`; pending `border-amber-300 bg-amber-50/40`.
  `Select` keeps native element but same base (custom chevron optional).
  Accept `hasError?`, `isPending?` booleans + native attrs.

### ThemeToggle.tsx + useTheme
`useTheme()` hook: reads/writes `localStorage['oplaty-theme']` ('light'|'dark'), toggles
`document.documentElement.classList.toggle('theme-dark', dark)`. ThemeToggle: 36×36 ghost icon
button `Moon`/`Sun`, `aria-label`, `rounded-lg text-gray-500 hover:bg-gray-100`.

### Modal.tsx (enhance, KEEP current API)
Keep `{title, onClose, children, maxWidth?}`. Improvements: overlay
`fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm animate-fadeIn`; panel
`animate-modalIn shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]`; on mobile a `maxWidth` wider than
`max-w-lg` becomes full-screen (`max-sm:h-full max-sm:rounded-none max-sm:mt-0`). Keep Esc + header + close.
Do NOT break existing callers (PaymentModal/NewPaymentModal pass title+children).

## 7. App Shell (Layout.tsx) — align to spec
- Root `h-screen bg-slate-50 flex flex-col overflow-hidden`. Header `h-14 bg-white border-b`.
  Sidebar `w-60 bg-white border-r` (sticky desktop, off-canvas mobile, collapsible — already present).
- Header right: add **ThemeToggle** before the user block; keep user name+role+avatar (avatar
  `bg-gradient-to-br from-brand-500 to-brand-700`) and «Вийти».
- Nav item: active `bg-brand-600 text-white`; inactive `text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
  `rounded-lg px-3 py-2 gap-2.5 text-sm font-medium`. (Badge counters optional — only if data exists.)

## 8. Screen patterns
- **List pages** (Payments, ZamovnykDashboard, Reports, Users, Directories): top a **ListBanner**
  (gradient) with title+subtitle and primary actions/toggles on the right (use SegmentedToggle onDark
  for view switches). Below: white **Card**s / Tabs / search+PaymentFilter drawer (already a right
  drawer — keep) / KanbanBoard or StatusSectionList / stat tiles.
- **Stat/KPI tiles:** `bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow`;
  label `text-xs uppercase tracking-wide text-gray-500`, number `text-3xl font-bold tabular-nums`,
  icon in a `p-2.5 rounded-lg bg-*-50 text-*-600` square. Alarm tiles `border-red-200 text-red-600`.
- **Empty states:** centered dashed Card, muted icon in a circle + short Ukrainian line + optional CTA Button.
- **Forms/modals:** use FormField + inputs + InfoBanner for errors; footer with outline «Скасувати» +
  primary action.

## 9. File ownership (parallel implementation — DISJOINT sets)
- **F (foundation, first):** tailwind.config.js, src/index.css, index.html, all new `src/components/ui/*`
  (Button, Card, Badge, InfoBanner, PageHeader, ListBanner, SegmentedToggle, Tabs, FormField, ThemeToggle,
  useTheme), enhance `src/components/ui/Modal.tsx`, restyle `src/components/layout/Layout.tsx`.
- **G1:** src/components/auth/LoginForm.tsx
- **G2:** src/pages/Payments.tsx  (uses ListBanner, Tabs, SegmentedToggle, PaymentFilter, StatusSectionList)
- **G3:** src/pages/ZamovnykDashboard.tsx
- **G4:** src/pages/Reports.tsx
- **G5:** src/pages/Users.tsx
- **G6:** src/pages/Directories.tsx + src/components/directories/DirectoryList.tsx
- **G7:** src/pages/SubmitPayment.tsx
- **G8:** src/components/payments/NewPaymentModal.tsx  (FormField + inputs + InfoBanner + Button)
- **G9:** src/components/payments/PaymentModal.tsx  (restyle to tokens; keep timeline logic; Button/Badge/InfoBanner)
- **G10:** src/components/payments/PaymentFiles.tsx + FilePreviewOverlay.tsx
- **G11 (light):** src/components/ui/StatusPill.tsx, src/components/ui/KanbanBoard.tsx,
  src/components/payments/PaymentFilter.tsx, src/components/payments/StatusSectionList.tsx — restyle to
  tokens, KEEP APIs.
Shared components (KanbanBoard/StatusPill/PaymentFilter/StatusSectionList) are edited ONLY by G11.
Screen agents must not edit them.
