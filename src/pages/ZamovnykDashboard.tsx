import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, KanbanSquare, Link2, List, Loader2, Plus, Search, Wallet, XCircle } from 'lucide-react';
import { DirectoryRow, Payment, PaymentStatus, User } from '../types/database';
import { dirMap, listPayments, usersMap } from '../lib/api';
import {
  formatDate,
  formatPaymentNo,
  formatUAH,
  IMPORTANCE_OPTIONS,
  STATUS_COLUMNS,
  SUBMIT_PATH,
} from '../constants/domain';
import { KanbanBoard, KanbanColumn } from '../components/ui/KanbanBoard';
import { StatusPill } from '../components/ui/StatusPill';
import { NewPaymentModal } from '../components/payments/NewPaymentModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { PaymentFilter } from '../components/payments/PaymentFilter';

type ViewMode = 'list' | 'board';
const VIEW_KEY = 'oplaty_zamovnyk_view';

// Замовник бачить (RLS) лише власні заявки. Дашборд сфокусований на перегляді:
// що подано, що чекає погодження й що вже оплачено.
type Filter = 'all' | 'pending' | 'in_progress' | 'paid' | 'rejected';

const inProgress = (s: PaymentStatus) => s === 'approved' || s === 'allocated';

type TileKey = 'pending' | 'in_progress' | 'paid' | 'rejected';

// Кожна плитка — швидкий вибір групи статусів для кнопки «Фільтр».
const GROUP_STATUSES: Record<TileKey, PaymentStatus[]> = {
  pending: ['pending'],
  in_progress: ['approved', 'allocated'],
  paid: ['paid'],
  rejected: ['rejected'],
};

const sameSet = (a: PaymentStatus[], b: PaymentStatus[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

const sum = (rows: Payment[]) => rows.reduce((acc, p) => acc + p.amount, 0);

interface TileDef {
  key: TileKey;
  label: string;
  icon: typeof Clock;
  ring: string;
  iconCls: string;
  accent: string;
}

const TILES: TileDef[] = [
  { key: 'pending', label: 'В очікуванні', icon: Clock, ring: 'hover:border-amber-300', iconCls: 'bg-amber-50 text-amber-600', accent: 'text-amber-700' },
  { key: 'in_progress', label: 'В роботі', icon: Loader2, ring: 'hover:border-blue-300', iconCls: 'bg-blue-50 text-blue-600', accent: 'text-blue-700' },
  { key: 'paid', label: 'Оплачено', icon: Wallet, ring: 'hover:border-green-300', iconCls: 'bg-green-50 text-green-600', accent: 'text-green-700' },
  { key: 'rejected', label: 'Відхилено', icon: XCircle, ring: 'hover:border-red-300', iconCls: 'bg-red-50 text-red-600', accent: 'text-red-700' },
];

export function ZamovnykDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [companies, setCompanies] = useState<Record<string, DirectoryRow>>({});
  const [forms, setForms] = useState<Record<string, DirectoryRow>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [statusSel, setStatusSel] = useState<PaymentStatus[]>(['pending']);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list')
  );

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, mode);
  }, [mode]);

  const load = async () => {
    setLoading(true);
    try {
      const [rows, uMap, cMap, fMap] = await Promise.all([
        listPayments(),
        usersMap(),
        dirMap('payer_companies'),
        dirMap('payment_forms'),
      ]);
      setPayments(rows);
      setUsers(uMap);
      setCompanies(cMap);
      setForms(fMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyLink = async () => {
    const link = `${window.location.origin}${SUBMIT_PATH}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Скопіюйте посилання:', link);
    }
  };

  const counts = useMemo(() => {
    const by: Record<Filter, Payment[]> = { all: payments, pending: [], in_progress: [], paid: [], rejected: [] };
    for (const p of payments) {
      if (p.status === 'pending') by.pending.push(p);
      else if (inProgress(p.status)) by.in_progress.push(p);
      else if (p.status === 'paid') by.paid.push(p);
      else if (p.status === 'rejected') by.rejected.push(p);
    }
    return by;
  }, [payments]);

  const matches = (p: Payment): boolean => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const company = p.payer_company_id ? companies[p.payer_company_id]?.name ?? '' : '';
    return [p.invoice_number ?? '', p.purpose ?? '', company, p.recipient ?? '', formatPaymentNo(p.number)].some(
      (v) => v.toLowerCase().includes(needle)
    );
  };

  const passesCompany = (p: Payment) =>
    !companyFilter.length || (!!p.payer_company_id && companyFilter.includes(p.payer_company_id));
  const passesStatus = (p: Payment) => !statusSel.length || statusSel.includes(p.status);

  const searched = payments.filter(matches).filter(passesCompany);
  const visible = searched.filter(passesStatus);

  const boardColumns: KanbanColumn<Payment>[] = STATUS_COLUMNS.map((c) => ({
    key: c.status,
    label: c.label,
    color: c.color,
    headerBg: c.headerBg,
    items: visible.filter((p) => p.status === c.status),
  }));

  // Підприємства для фільтра — лише ті, що трапляються у власних заявках.
  const filterCompanies = Object.values(companies)
    .filter((c) => payments.some((p) => p.payer_company_id === c.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мої заявки</h1>
          <p className="text-gray-500 text-sm">Стежте за поданими заявками та станом їх погодження й оплати.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Скопіювати посилання на форму подачі оплати"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} />}
            {copied ? 'Скопійовано' : 'Поділитися формою'}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={16} />
            Нова заявка
          </button>
        </div>
      </div>

      {/* HUD — плитки по групах, клік фільтрує список */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TILES.map((t) => {
          const rows = counts[t.key];
          const Icon = t.icon;
          const isActive = mode === 'list' && sameSet(statusSel, GROUP_STATUSES[t.key]);
          return (
            <button
              key={t.key}
              onClick={() => {
                setStatusSel(GROUP_STATUSES[t.key]);
                setMode('list');
              }}
              className={`text-left bg-white border rounded-xl p-4 transition-all ${t.ring} ${
                isActive ? 'border-brand-400 ring-1 ring-brand-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${t.iconCls}`}>
                  <Icon size={17} />
                </span>
                <span className={`text-2xl font-bold tabular-nums ${t.accent}`}>{rows.length}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-gray-700">{t.label}</div>
              <div className="text-xs text-gray-400 tabular-nums">{formatUAH(sum(rows))}</div>
            </button>
          );
        })}
      </div>

      {/* Кнопка «Фільтр» (статус + підприємство) + перемикач вигляду */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <PaymentFilter
          companies={filterCompanies}
          companyIds={companyFilter}
          statuses={statusSel}
          onCompaniesChange={setCompanyFilter}
          onStatusesChange={setStatusSel}
        />
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
          {([
            { key: 'list' as ViewMode, label: 'Список', icon: List },
            { key: 'board' as ViewMode, label: 'Канбан', icon: KanbanSquare },
          ]).map((v) => {
            const Icon = v.icon;
            const isActive = mode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setMode(v.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за № рахунку, призначенням, підприємством…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : mode === 'board' ? (
        <KanbanBoard
          columns={boardColumns}
          getItemKey={(p) => p.id}
          emptyMessage="Немає заявок"
          renderCard={(p) => {
            const company = p.payer_company_id ? companies[p.payer_company_id]?.name : null;
            const form = p.payment_form_id ? forms[p.payment_form_id]?.name : p.payment_form;
            const imp = IMPORTANCE_OPTIONS.find((o) => o.value === p.importance);
            return (
              <button
                onClick={() => setSelected(p)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-gray-900 text-sm leading-snug">{company || p.recipient || 'Заявка'}</span>
                  <span className="font-bold tabular-nums text-gray-900 text-sm whitespace-nowrap">{formatUAH(p.amount)}</span>
                </div>
                {p.purpose && <div className="text-xs text-gray-700 mt-1 line-clamp-2 whitespace-pre-wrap">{p.purpose}</div>}
                {form && <div className="text-xs text-gray-500 mt-1">{form}</div>}
                {p.invoice_number && <div className="text-[11px] text-gray-400 mt-1 font-mono truncate">№ {p.invoice_number}</div>}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {imp && (
                    <span className={`inline-flex items-center rounded-md border text-[11px] font-semibold px-2 py-0.5 ${imp.className}`}>
                      {imp.label}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 font-mono">{formatPaymentNo(p.number)}</span>
                </div>
              </button>
            );
          }}
        />
      ) : visible.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">У цій групі поки що немає заявок.</p>
          {payments.length === 0 && (
            <button
              onClick={() => setShowNew(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              <Plus size={16} />
              Створити першу заявку
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => {
            const company = p.payer_company_id ? companies[p.payer_company_id]?.name : null;
            const form = p.payment_form_id ? forms[p.payment_form_id]?.name : p.payment_form;
            const imp = IMPORTANCE_OPTIONS.find((o) => o.value === p.importance);
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full text-left flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-gray-400">{formatPaymentNo(p.number)}</span>
                    <StatusPill status={p.status} />
                    {imp && (
                      <span className={`inline-flex items-center rounded-md border text-[11px] font-semibold px-2 py-0.5 ${imp.className}`}>
                        {imp.label}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-gray-900 text-sm truncate mt-1">
                    {company || p.recipient || 'Заявка'}
                  </div>
                  {p.purpose && <div className="text-xs text-gray-500 truncate">{p.purpose}</div>}
                  {(form || p.invoice_number) && (
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {form ? form : ''}
                      {form && p.invoice_number ? ' · ' : ''}
                      {p.invoice_number ? `№ ${p.invoice_number}` : ''}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold tabular-nums text-gray-900 text-sm whitespace-nowrap">{formatUAH(p.amount)}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(p.created_at)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewPaymentModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {selected && (
        <PaymentModal
          payment={selected}
          users={users}
          companies={companies}
          forms={forms}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
