import { FormEvent, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createPayment } from '../lib/api';
import { PAYMENT_FORMS } from '../constants/domain';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function NewPayment({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentForm, setPaymentForm] = useState<string>(PAYMENT_FORMS[0]);
  const [payDate, setPayDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = Number(amount.replace(',', '.'));
    if (!recipient.trim()) return setError('Вкажіть отримувача');
    if (!Number.isFinite(amt) || amt <= 0) return setError('Сума має бути більшою за нуль');
    if (!user) return;

    setSaving(true);
    try {
      await createPayment(user.id, {
        recipient: recipient.trim(),
        amount: amt,
        payment_form: paymentForm,
        pay_date: payDate || null,
        purpose: purpose.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message || 'Не вдалося створити заявку');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Нова заявка на оплату</h1>
      <p className="text-gray-500 text-sm mb-5">Заявка піде на погодження керівнику.</p>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Отримувач</label>
            <input
              className={inputCls}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Контрагент / кому платимо"
            />
          </div>
          <div>
            <label className={labelCls}>Сума, ₴</label>
            <input
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className={labelCls}>Форма оплати</label>
            <select
              className={inputCls}
              value={paymentForm}
              onChange={(e) => setPaymentForm(e.target.value)}
            >
              {PAYMENT_FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Дата оплати</label>
            <input
              type="date"
              className={inputCls}
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Призначення платежу</label>
            <textarea
              className={inputCls}
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="За що платимо"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Відправка...' : 'Подати на погодження'}
          </button>
        </div>
      </form>
    </div>
  );
}
