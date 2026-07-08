import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Payment, PaymentComment } from '../types/database';
import { listMyPayments, listComments, resubmitPayment } from '../lib/api';
import { formatDate, formatUAH } from '../constants/domain';
import { StatusPill } from '../components/ui/StatusPill';

export function MyPayments({ onNew }: { onNew: () => void }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [comments, setComments] = useState<Record<string, PaymentComment[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await listMyPayments(user.id);
      setPayments(rows);
      const rejected = rows.filter((p) => p.status === 'rejected');
      const entries = await Promise.all(
        rejected.map(async (p) => [p.id, await listComments(p.id)] as const)
      );
      setComments(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const resubmit = async (id: string) => {
    setBusy(id);
    try {
      await resubmitPayment(id);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мої заявки</h1>
          <p className="text-gray-500 text-sm">Ваші заявки на оплату та їх статус.</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          + Нова заявка
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          Ще немає заявок. Створіть першу.
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <StatusPill status={p.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{p.recipient}</div>
                  <div className="text-xs text-gray-500">
                    {p.payment_form} · оплата {formatDate(p.pay_date)}
                    {p.purpose ? ` · ${p.purpose}` : ''}
                  </div>
                </div>
                <div className="font-bold tabular-nums text-gray-900">{formatUAH(p.amount)}</div>
              </div>

              {p.status === 'rejected' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {(comments[p.id] ?? []).map((c) => (
                    <div key={c.id} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                      {c.text}
                    </div>
                  ))}
                  <button
                    disabled={busy === p.id}
                    onClick={() => resubmit(p.id)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {busy === p.id ? 'Відправка...' : 'Подати знову'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
