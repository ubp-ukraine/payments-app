import { useEffect, useState } from 'react';
import { Check, KanbanSquare, Link2, List, Plus, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DirectoryRow, Payment, PaymentStatus, User } from '../types/database';
import { dirMap, listPayments, usersMap } from '../lib/api';
import { formatDate, formatPaymentNo, formatUAH, IMPORTANCE_OPTIONS, STATUS_COLUMNS, SUBMIT_PATH } from '../constants/domain';
import { KanbanBoard, KanbanColumn } from '../components/ui/KanbanBoard';
import { Button } from '../components/ui/Button';
import { ListBanner } from '../components/ui/ListBanner';
import { SegmentedToggle } from '../components/ui/SegmentedToggle';
import { Tabs } from '../components/ui/Tabs';
import { NewPaymentModal } from '../components/payments/NewPaymentModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { PaymentFiles } from '../components/payments/PaymentFiles';
import { PaymentFilter } from '../components/payments/PaymentFilter';
import { StatusSectionList } from '../components/payments/StatusSectionList';

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
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list'>(
    () => (localStorage.getItem('oplaty_payments_view') === 'list' ? 'list' : 'board')
  );

  useEffect(() => {
    localStorage.setItem('oplaty_payments_view', viewMode);
  }, [viewMode]);

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
    if (p.status === 'approved' && (role === 'buhgalter' || role === 'admin')) return 'Потребує оплати';
    if (p.status === 'paid' && (role === 'buhgalter' || role === 'admin')) return 'Потребує розподілу';
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

  const passesFilter = (p: Payment): boolean => {
    if (companyFilter.length && !(p.payer_company_id && companyFilter.includes(p.payer_company_id))) return false;
    if (statusFilter.length && !statusFilter.includes(p.status)) return false;
    return true;
  };
  const visible = payments.filter(matches).filter(passesFilter);

  // Підприємства для фільтра — лише ті, що трапляються у заявках.
  const filterCompanies = Object.values(companies)
    .filter((c) => payments.some((p) => p.payer_company_id === c.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  const columns: KanbanColumn<Payment>[] = STATUS_COLUMNS.map((c) => ({
    key: c.status,
    label: c.label,
    color: c.color,
    headerBg: c.headerBg,
    items: visible.filter((p) => p.status === (c.status as PaymentStatus)),
  }));

  const uName = (id: string) => users[id]?.full_name || users[id]?.email || '—';

  return (
    <div className="space-y-5">
      <ListBanner
        title="Оплати"
        subtitle="Заявки, погодження та проведення — усе в одному місці."
        actions={
          tab === 'requests' && (
            <div className="flex items-center gap-2 flex-wrap">
              <SegmentedToggle
                tone="onDark"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'board', label: 'Канбан', icon: KanbanSquare },
                  { value: 'list', label: 'Список', icon: List },
                ]}
              />
              <Button
                variant="outline"
                onClick={copyLink}
                title="Скопіювати посилання на форму подачі оплати"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} />}
                {copied ? 'Скопійовано' : 'Поділитися формою'}
              </Button>
              <Button onClick={() => setShowNew(true)}>
                <Plus size={16} />
                Нова заявка
              </Button>
            </div>
          )
        }
      />

      <Tabs
        tabs={[
          { key: 'requests', label: 'Заявки' },
          { key: 'files', label: 'Файли' },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {tab === 'files' ? (
        <PaymentFiles payments={payments} companies={companies} />
      ) : loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
        <>
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук за № рахунку, призначенням, підприємством…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-sm transition-colors focus:outline-none focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5"
            />
          </div>
          <PaymentFilter
            companies={filterCompanies}
            companyIds={companyFilter}
            statuses={statusFilter}
            onCompaniesChange={setCompanyFilter}
            onStatusesChange={setStatusFilter}
          />
        </div>
        {viewMode === 'board' ? (
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
        ) : (
          <StatusSectionList
            sections={columns.map((c) => ({
              status: c.key as PaymentStatus,
              label: c.label,
              color: c.color,
              headerBg: c.headerBg,
              items: c.items,
            }))}
            storageKey="oplaty_payments_collapsed"
            renderItem={(p) => {
              const hint = actionHint(p);
              const imp = IMPORTANCE_OPTIONS.find((o) => o.value === p.importance);
              const company = p.payer_company_id ? companies[p.payer_company_id]?.name : null;
              const form = p.payment_form_id ? forms[p.payment_form_id]?.name : p.payment_form;
              return (
                <button
                  onClick={() => setSelected(p)}
                  className="w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-gray-400">{formatPaymentNo(p.number)}</span>
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
                    <div className="font-semibold text-gray-900 text-sm truncate mt-1">
                      {company || p.recipient || 'Заявка'}
                    </div>
                    {p.purpose && <div className="text-xs text-gray-500 truncate">{p.purpose}</div>}
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {form ? `${form} · ` : ''}
                      {uName(p.author_id)}
                      {p.invoice_number ? ` · № ${p.invoice_number}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold tabular-nums text-gray-900 text-sm whitespace-nowrap">
                      {formatUAH(p.amount)}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(p.created_at)}</div>
                  </div>
                </button>
              );
            }}
          />
        )}
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
