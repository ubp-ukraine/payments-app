import { useEffect, useMemo, useState } from 'react';
import { Bank, Payment, PaymentAllocation, PaymentStatus, User } from '../types/database';
import { listAllocations, listBanks, listPayments, usersMap } from '../lib/api';
import { formatDate, formatUAH, STATUS_META } from '../constants/domain';
import { StatusPill } from '../components/ui/StatusPill';

const FILTERS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: 'pending', label: STATUS_META.pending.label },
  { value: 'approved', label: STATUS_META.approved.label },
  { value: 'paid', label: STATUS_META.paid.label },
  { value: 'rejected', label: STATUS_META.rejected.label },
];

export function Register() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [banks, setBanks] = useState<Record<string, Bank>>({});
  const [allocs, setAllocs] = useState<Record<string, PaymentAllocation[]>>({});
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rows, map, bankRows] = await Promise.all([listPayments(), usersMap(), listBanks()]);
        setPayments(rows);
        setUsers(map);
        setBanks(Object.fromEntries(bankRows.map((b) => [b.id, b])));
        const paid = rows.filter((p) => p.status === 'paid');
        const entries = await Promise.all(
          paid.map(async (p) => [p.id, await listAllocations(p.id)] as const)
        );
        setAllocs(Object.fromEntries(entries));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? payments : payments.filter((p) => p.status === filter)),
    [payments, filter]
  );

  const name = (id: string | null) =>
    id ? users[id]?.full_name || users[id]?.email || '—' : '—';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Реєстр оплат</h1>
      <p className="text-gray-500 text-sm mb-4">Усі заявки на оплату.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              filter === f.value
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          Немає заявок.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <StatusPill status={p.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{p.recipient}</div>
                  <div className="text-xs text-gray-500">
                    замовник: {name(p.author_id)} · {p.payment_form} · оплата {formatDate(p.pay_date)}
                    {p.status === 'approved' || p.status === 'paid'
                      ? ` · погодив: ${name(p.approved_by)}`
                      : ''}
                    {p.status === 'paid' ? ` · оплатив: ${name(p.paid_by)}` : ''}
                  </div>
                </div>
                <div className="font-bold tabular-nums text-gray-900">{formatUAH(p.amount)}</div>
              </div>

              {p.status === 'paid' && (allocs[p.id]?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  {allocs[p.id].map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1"
                    >
                      <span className="font-medium text-gray-700">{banks[a.bank_id]?.name ?? 'Банк'}</span>
                      <span className="tabular-nums font-semibold text-gray-900">{formatUAH(a.amount)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
