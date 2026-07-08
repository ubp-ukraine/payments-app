import { useEffect, useMemo, useState } from 'react';
import { DirectoryRow, PaymentAllocation } from '../types/database';
import { dirMap, listAllAllocations } from '../lib/api';
import { formatUAH } from '../constants/domain';

interface BankTotal {
  id: string;
  name: string;
  sum: number;
  count: number;
}

export function Reports() {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [banks, setBanks] = useState<Record<string, DirectoryRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, b] = await Promise.all([listAllAllocations(), dirMap('banks')]);
        setAllocations(a);
        setBanks(b);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { rows, total } = useMemo(() => {
    const acc: Record<string, BankTotal> = {};
    for (const a of allocations) {
      const name = banks[a.bank_id]?.name ?? 'Невідомий банк';
      if (!acc[a.bank_id]) acc[a.bank_id] = { id: a.bank_id, name, sum: 0, count: 0 };
      acc[a.bank_id].sum += Number(a.amount);
      acc[a.bank_id].count += 1;
    }
    const list = Object.values(acc).sort((x, y) => y.sum - x.sum);
    const t = list.reduce((s, r) => s + r.sum, 0);
    return { rows: list, total: t };
  }, [allocations, banks]);

  const max = rows.length ? rows[0].sum : 0;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Звіти</h1>
      <p className="text-gray-500 text-sm mb-5">Скільки грошей проведено через кожен банк (за оплаченими заявками).</p>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          Ще немає проведених оплат.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-brand-600 text-white rounded-xl p-5">
            <div className="text-sm text-brand-100">Усього проведено</div>
            <div className="text-3xl font-bold tabular-nums mt-1">{formatUAH(total)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {rows.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-semibold text-gray-900">{r.name}</div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-gray-900">{formatUAH(r.sum)}</div>
                    <div className="text-xs text-gray-400">
                      {r.count} {r.count === 1 ? 'оплата' : 'оплат'} ·{' '}
                      {total ? Math.round((r.sum / total) * 100) : 0}%
                    </div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${max ? (r.sum / max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
