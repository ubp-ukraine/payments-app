import { useEffect, useState } from 'react';
import { Bank, Payment, User } from '../types/database';
import { listBanks, listPayments, payPayment, usersMap } from '../lib/api';
import { formatDate, formatUAH } from '../constants/domain';
import { StatusPill } from '../components/ui/StatusPill';

type AllocDraft = Record<string, Record<string, string>>; // paymentId -> bankId -> amount

export function ToPay() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [alloc, setAlloc] = useState<AllocDraft>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rows, bankRows, map] = await Promise.all([
        listPayments('approved'),
        listBanks(true),
        usersMap(),
      ]);
      setPayments(rows);
      setBanks(bankRows);
      setUsers(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setAmount = (paymentId: string, bankId: string, value: string) =>
    setAlloc((a) => ({ ...a, [paymentId]: { ...(a[paymentId] ?? {}), [bankId]: value } }));

  const total = (paymentId: string): number =>
    Object.values(alloc[paymentId] ?? {}).reduce(
      (sum, v) => sum + (Number(String(v).replace(',', '.')) || 0),
      0
    );

  const pay = async (p: Payment) => {
    const rows = Object.entries(alloc[p.id] ?? {})
      .map(([bank_id, v]) => ({ bank_id, amount: Number(String(v).replace(',', '.')) || 0 }))
      .filter((r) => r.amount > 0);
    const sum = rows.reduce((s, r) => s + r.amount, 0);
    if (Math.abs(sum - p.amount) > 0.001) {
      alert(`Сума по банках (${formatUAH(sum)}) має дорівнювати сумі заявки (${formatUAH(p.amount)})`);
      return;
    }
    setBusy(p.id);
    try {
      await payPayment(p.id, rows);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">До оплати</h1>
      <p className="text-gray-500 text-sm mb-5">Погоджені заявки. Розкидайте суму по банках і проведіть оплату.</p>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          Немає погоджених заявок до оплати.
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => {
            const author = users[p.author_id];
            const sum = total(p.id);
            const match = Math.abs(sum - p.amount) <= 0.001;
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <StatusPill status={p.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{p.recipient}</div>
                    <div className="text-xs text-gray-500">
                      замовник: {author?.full_name || author?.email || '—'} · {p.payment_form} · оплата {formatDate(p.pay_date)}
                    </div>
                  </div>
                  <div className="font-bold tabular-nums text-gray-900">{formatUAH(p.amount)}</div>
                </div>

                <div className="mt-3 space-y-2">
                  {banks.map((b) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <div className="flex-1 text-sm font-medium text-gray-700">{b.name}</div>
                      <input
                        className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={alloc[p.id]?.[b.id] ?? ''}
                        onChange={(e) => setAmount(p.id, b.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-sm font-medium ${match ? 'text-green-700' : 'text-gray-500'}`}>
                    Розподілено: <span className="tabular-nums">{formatUAH(sum)}</span> / {formatUAH(p.amount)}
                  </span>
                  <button
                    disabled={busy === p.id || !match}
                    onClick={() => pay(p)}
                    className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                  >
                    {busy === p.id ? 'Проведення...' : 'Провести оплату'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
