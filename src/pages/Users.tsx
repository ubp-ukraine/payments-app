import { FormEvent, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types/database';
import { listUsers, registerUser, updateUserRole } from '../lib/api';
import { ROLE_LABELS, ROLE_ORDER } from '../constants/domain';
import { ListBanner } from '../components/ui/ListBanner';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { FormField, TextInput, Select } from '../components/ui/FormField';
import { InfoBanner } from '../components/ui/InfoBanner';
import { Button } from '../components/ui/Button';

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
    <div className="max-w-3xl space-y-6">
      <ListBanner
        title="Користувачі"
        subtitle="Створюйте користувачів і призначайте ролі."
        compact
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <UserPlus size={17} className="text-brand-600" />
            Новий користувач
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            {error && (
              <InfoBanner tone="danger">{error}</InfoBanner>
            )}
            {ok && (
              <InfoBanner tone="success">{ok}</InfoBanner>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </FormField>
              <FormField label="Пароль">
                <TextInput
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="мінімум 6 символів"
                />
              </FormField>
              <FormField label="Ім'я">
                <TextInput
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Прізвище Імʼя"
                />
              </FormField>
              <FormField label="Роль">
                <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? 'Створення...' : 'Створити користувача'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{u.full_name || u.email}</div>
                <div className="text-xs text-gray-500 truncate">{u.email}</div>
              </div>
              <div className="w-44 sm:w-48 shrink-0">
                <Select
                  value={u.role ?? 'zamovnyk'}
                  disabled={busy === u.id || u.id === authUser?.id}
                  onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                >
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
