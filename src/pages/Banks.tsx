import { FormEvent, useEffect, useState } from 'react';
import { Bank } from '../types/database';
import { createBank, listBanks, updateBank } from '../lib/api';

export function Banks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setBanks(await listBanks());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Вкажіть назву банку');
    setSaving(true);
    try {
      await createBank(name.trim(), accountNo.trim() || null);
      setName('');
      setAccountNo('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b: Bank) => {
    await updateBank(b.id, { is_active: !b.is_active });
    await load();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Банки</h1>
      <p className="text-gray-500 text-sm mb-5">Рахунки, на які бухгалтер розкидає оплати.</p>

      <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Назва (напр. Банка А)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Рахунок / IBAN (необовʼязково)"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            Додати
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
        <div className="space-y-2">
          {banks.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1">
                <div className={`font-medium ${b.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                  {b.name}
                </div>
                {b.account_no && <div className="text-xs text-gray-500">{b.account_no}</div>}
              </div>
              <button
                onClick={() => toggle(b)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                {b.is_active ? 'Деактивувати' : 'Активувати'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
