import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DirectoryRow, Payment, PaymentStatus, User } from '../types/database';
import { dirMap, listPayments, usersMap } from '../lib/api';
import { formatUAH, IMPORTANCE_OPTIONS, STATUS_COLUMNS } from '../constants/domain';
import { KanbanBoard, KanbanColumn } from '../components/ui/KanbanBoard';
import { NewPaymentModal } from '../components/payments/NewPaymentModal';
import { PaymentModal } from '../components/payments/PaymentModal';

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
    if (p.status === 'approved' && (role === 'buhgalter' || role === 'admin')) return 'До оплати';
    if (p.status === 'rejected' && p.author_id === user?.id) return 'Можна подати знову';
    return null;
  };

  const columns: KanbanColumn<Payment>[] = STATUS_COLUMNS.map((c) => ({
    key: c.status,
    label: c.label,
    color: c.color,
    headerBg: c.headerBg,
    items: payments.filter((p) => p.status === (c.status as PaymentStatus)),
  }));

  const uName = (id: string) => users[id]?.full_name || users[id]?.email || '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Оплати</h1>
          <p className="text-gray-500 text-sm">Заявки, погодження та проведення — усе в одному місці.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          <Plus size={16} />
          Нова заявка
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
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
                    {p.purpose || company || 'Заявка'}
                  </span>
                  <span className="font-bold tabular-nums text-gray-900 text-sm whitespace-nowrap">
                    {formatUAH(p.amount)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {company ? `${company} · ` : ''}
                  {form ? `${form} · ` : ''}
                  {uName(p.author_id)}
                </div>
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
