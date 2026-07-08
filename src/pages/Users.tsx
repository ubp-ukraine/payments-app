import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types/database';
import { listUsers, updateUserRole } from '../lib/api';
import { ROLE_LABELS, ROLE_ORDER } from '../constants/domain';

export function Users() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id: string, role: UserRole) => {
    setBusy(id);
    try {
      await updateUserRole(id, role);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Користувачі</h1>
      <p className="text-gray-500 text-sm mb-5">
        Нові користувачі створюються в Supabase Studio → Authentication. Тут призначайте ролі.
      </p>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{u.full_name || u.email}</div>
                <div className="text-xs text-gray-500 truncate">{u.email}</div>
              </div>
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                value={u.role ?? 'zamovnyk'}
                disabled={busy === u.id || u.id === authUser?.id}
                onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
