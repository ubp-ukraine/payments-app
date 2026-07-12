import { useState, FormEvent } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../ui/Card';
import { FormField, TextInput } from '../ui/FormField';
import { InfoBanner } from '../ui/InfoBanner';
import { Button } from '../ui/Button';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      const e = err as { message?: string };
      console.error('Login error:', e);
      if (e.message?.includes('fetch')) {
        setError("Немає зв'язку з сервером. Перевірте інтернет з'єднання.");
      } else if (e.message?.includes('Invalid')) {
        setError('Невірний email або пароль');
      } else {
        setError(e.message || 'Помилка входу. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center shadow-sm">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-900">Оплати</h1>
              <p className="mt-1 text-sm text-gray-500">Вхід до системи</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <InfoBanner tone="danger" icon={AlertCircle}>
                {error}
              </InfoBanner>
            )}

            <FormField label="Email" htmlFor="email" required>
              <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
              />
            </FormField>

            <FormField label="Пароль" htmlFor="password" required>
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </FormField>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? 'Вхід...' : 'Увійти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
