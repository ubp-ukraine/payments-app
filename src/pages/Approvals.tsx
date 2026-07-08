import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Payment, User } from '../types/database';
import { approvePayment, listPayments, rejectPayment, usersMap } from '../lib/api';
import { formatDate, formatUAH } from '../constants/domain';
import { StatusPill } from '../components/ui/StatusPill';

export function Approvals() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rows, map] = await Promise.all([listPayments('pending'), usersMap()]);
      setPayments(rows);
      setUsers(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await approvePayment(id);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    const comment = (drafts[id] ?? '').trim();
    if (!comment) {
      alert('Вкажіть причину відхилення в коментарі');
      return;
    }
    if (!user) return;
    setBusy(id);
    try {
      await rejectPayment(id, comment, user.id);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Погодження</h1>
      <p className="text-gray-500 text-sm mb-5">Заявки, що очікують вашого рішення.</p>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          Немає заявок на погодженні.
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const author = users[p.author_id];
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <StatusPill status={p.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{p.recipient}</div>
                    <div className="text-xs text-gray-500">
                      замовник: {author?.full_name || author?.email || '—'} · {p.payment_form} · оплата {formatDate(p.pay_date)}
                    </div>
                    {p.purpose && <div className="text-sm text-gray-600 mt-1">{p.purpose}</div>}
                  </div>
                  <div className="font-bold tabular-nums text-gray-900">{formatUAH(p.amount)}</div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Коментар (обовʼязковий при відхиленні)"
                    value={drafts[p.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={busy === p.id}
                      onClick={() => approve(p.id)}
                      className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                    >
                      Погодити
                    </button>
                    <button
                      disabled={busy === p.id}
                      onClick={() => reject(p.id)}
                      className="px-4 py-1.5 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
                    >
                      Відхилити
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
