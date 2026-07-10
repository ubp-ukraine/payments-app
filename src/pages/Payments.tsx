import { useEffect, useState } from 'react';
import { Check, Link2, Plus, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DirectoryRow, Payment, PaymentStatus, User } from '../types/database';
import { dirMap, listPayments, usersMap } from '../lib/api';
import { formatPaymentNo, formatUAH, IMPORTANCE_OPTIONS, STATUS_COLUMNS, SUBMIT_PATH } from '../constants/domain';
import { KanbanBoard, KanbanColumn } from '../components/ui/KanbanBoard';
import { NewPaymentModal } from '../components/payments/NewPaymentModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { PaymentFiles } from '../components/payments/PaymentFiles';

type Tab = 'requests' | 'files';

export function Payments() {
  const { profile, user } = useAuth();
  const role = profile?.role;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [companies, setCompanies] = useState<Record<string, DirectoryRow>>({});
  const [forms, setForms] = useState<Record<string, DirectoryRow>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [tab, setTab] = useState<Tab>('requests');
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState('');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${SUBMIT_PATH}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Скопіюйте посилання:', `${window.location.origin}${SUBMIT_PATH}`);
    }
  };

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

  const actionHint = (p: Payment): string | null => {
    if (p.status === 'pending' && (role === 'admin' || role === 'fin_director')) return 'Потребує погодження';
    if (p.status === 'approved' && (role === 'buhgalter' || role === 'admin')) return 'Потребує розподілу';
    if (p.status === 'allocated' && (role === 'buhgalter' || role === 'admin')) return 'До оплати';
    if (p.status === 'rejected' && p.author_id === user?.id) return 'Можна подати знову';
    return null;
  };

  const matches = (p: Payment): boolean => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const company = p.payer_company_id ? companies[p.payer_company_id]?.name ?? '' : '';
    return [p.invoice_number ?? '', p.purpose ?? '', company, p.recipient ?? '', formatPaymentNo(p.number)].some(
      (v) => v.toLowerCase().includes(needle)
    );
  };
  const visible = payments.filter(matches);

  const columns: KanbanColumn<Payment>[] = STATUS_COLUMNS.map((c) => ({
    key: c.status,
    label: c.label,
    color: c.color,
    headerBg: c.headerBg,
    items: visible.filter((p) => p.status === (c.status as PaymentStatus)),
  }));

  const uName = (id: string) => users[id]?.full_name || users[id]?.email || '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Оплати</h1>
          <p className="text-gray-500 text-sm">Заявки, погодження та проведення — усе в одному місці.</p>
        </div>
        {tab === 'requests' && (
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
        )}
      </div>

      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {([
          { key: 'requests', label: 'Заявки' },
          { key: 'files', label: 'Файли' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'files' ? (
        <PaymentFiles payments={payments} companies={companies} />
      ) : loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
        <>
        <div className="mb-4 relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук за № рахунку, призначенням, підприємством…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <KanbanBoard
          columns={columns}
          getItemKey={(p) => p.id}
          emptyMessage="Немає заявок"
          renderCard={(p) => {
            const hint = actionHint(p);
            const imp = IMPORTANCE_OPTIONS.find((o) => o.value === p.importance);
            const company = p.payer_company_id ? companies[p.payer_company_id]?.name : null;
            const form = p.payment_form_id ? forms[p.payment_form_id]?.name : p.payment_form;
            return (
              <button
                onClick={() => setSelected(p)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-gray-900 text-sm leading-snug">
                    {company || p.recipient || 'Заявка'}
                  </span>
                  <span className="font-bold tabular-nums text-gray-900 text-sm whitespace-nowrap">
                    {formatUAH(p.amount)}
                  </span>
                </div>
                {p.purpose && (
                  <div className="text-xs text-gray-700 mt-1 line-clamp-2 whitespace-pre-wrap">{p.purpose}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {form ? `${form} · ` : ''}
                  {uName(p.author_id)}
                </div>
                {p.invoice_number && (
                  <div className="text-[11px] text-gray-400 mt-1 font-mono truncate">№ {p.invoice_number}</div>
                )}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {imp && (
                    <span className={`inline-flex items-center rounded-md border text-[11px] font-semibold px-2 py-0.5 ${imp.className}`}>
                      {imp.label}
                    </span>
                  )}
                  {hint && (
                    <span className="inline-flex items-center rounded-md bg-brand-50 text-brand-700 text-[11px] font-semibold px-2 py-0.5">
                      {hint}
                    </span>
                  )}
                </div>
              </button>
            );
          }}
        />
        </>
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
