import { FormEvent, useEffect, useState } from 'react';
import { DirectoryRow } from '../../types/database';
import { createDir, DirTable, listDir, toggleDir } from '../../lib/api';

interface Props {
  table: DirTable;
  title: string;
  subtitle: string;
  placeholder: string;
}

export function DirectoryList({ table, title, subtitle, placeholder }: Props) {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listDir(table));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createDir(table, name.trim());
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: DirectoryRow) => {
    await toggleDir(table, r.id, !r.is_active);
    await load();
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500 mb-3">{subtitle}</p>

      <form onSubmit={add} className="flex gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          Додати
        </button>
      </form>

      {error && <div className="mb-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Завантаження...</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
              <span className={`flex-1 text-sm ${r.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                {r.name}
              </span>
              <button
                onClick={() => toggle(r)}
                className="text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                {r.is_active ? 'Деактивувати' : 'Активувати'}
              </button>
            </div>
          ))}
          {rows.length === 0 && <div className="text-sm text-gray-400">Порожньо</div>}
        </div>
      )}
    </section>
  );
}
