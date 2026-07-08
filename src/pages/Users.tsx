import { FormEvent, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types/database';
import { listUsers, registerUser, updateUserRole } from '../lib/api';
import { ROLE_LABELS, ROLE_ORDER } from '../constants/domain';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export function Users() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // create form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('zamovnyk');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

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

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (!email.trim()) return setError('Вкажіть email');
    if (password.length < 6) return setError('Пароль — щонайменше 6 символів');
    setCreating(true);
    try {
      await registerUser({
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        role,
      });
      setOk(`Користувача ${email.trim()} створено`);
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('zamovnyk');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (id: string, newRole: UserRole) => {
    setBusy(id);
    try {
      await updateUserRole(id, newRole);
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
      <p className="text-gray-500 text-sm mb-5">Створюйте користувачів і призначайте ролі.</p>

      <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-gray-900 font-semibold">
          <UserPlus size={17} className="text-brand-600" />
          Новий користувач
        </div>

        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        {ok && <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{ok}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Пароль</label>
            <input className={inputCls} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="мінімум 6 символів" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ім'я</label>
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Прізвище Імʼя" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Роль</label>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {creating ? 'Створення...' : 'Створити користувача'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
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
