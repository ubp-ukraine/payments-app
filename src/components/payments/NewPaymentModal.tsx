import { FormEvent, useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addComment, createPayment, listDir, uploadAttachment } from '../../lib/api';
import { DirectoryRow, Importance } from '../../types/database';
import { IMPORTANCE_OPTIONS } from '../../constants/domain';
import { Modal } from '../ui/Modal';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function NewPaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<DirectoryRow[]>([]);
  const [forms, setForms] = useState<DirectoryRow[]>([]);

  const [amount, setAmount] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [formId, setFormId] = useState('');
  const [importance, setImportance] = useState<Importance | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientTaxId, setRecipientTaxId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, f] = await Promise.all([listDir('payer_companies', true), listDir('payment_forms', true)]);
      setCompanies(c);
      setForms(f);
    })();
  }, []);

  const addFiles = (list: FileList | null) => {
    if (list) setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return setError('Сума має бути більшою за нуль');
    if (!companyId) return setError('Оберіть підприємство-платника');
    if (!formId) return setError('Оберіть форму оплати');
    if (!importance) return setError('Оберіть важливість');
    if (!invoiceNumber.trim()) return setError('Вкажіть номер рахунку');
    if (!recipient.trim()) return setError('Вкажіть назву ЮР особи');
    if (!/^\d{8,12}$/.test(recipientTaxId.trim()))
      return setError('ЄДРПОУ/ІПН має містити 8–12 цифр');
    if (!purpose.trim()) return setError('Вкажіть, за що оплата');
    if (!user) return;

    setSaving(true);
    try {
      const id = await createPayment(user.id, {
        amount: amt,
        payer_company_id: companyId,
        payment_form_id: formId,
        importance,
        invoice_number: invoiceNumber.trim(),
        recipient: recipient.trim(),
        recipient_tax_id: recipientTaxId.trim(),
        purpose: purpose.trim(),
      });
      for (const file of files) {
        await uploadAttachment(id, file, 'submission');
      }
      if (comment.trim()) {
        await addComment(id, user.id, comment.trim(), 'submission');
      }
      onCreated();
    } catch (err) {
      setError((err as Error).message || 'Не вдалося створити заявку');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Рахунок на оплату" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Сума, ₴ *</label>
            <input
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Введіть цифру"
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Номер рахунку *</label>
            <input
              className={inputCls}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="напр. РФ-000123"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Підприємство, звідки оплата *</label>
            <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Оберіть…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Форма оплати *</label>
            <select className={inputCls} value={formId} onChange={(e) => setFormId(e.target.value)}>
              <option value="">Оберіть…</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Назва ЮР особи *</label>
            <input
              className={inputCls}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="напр. ТОВ «Ромашка»"
            />
          </div>
          <div>
            <label className={labelCls}>ЄДРПОУ / ІПН *</label>
            <input
              className={inputCls}
              value={recipientTaxId}
              onChange={(e) => setRecipientTaxId(e.target.value)}
              inputMode="numeric"
              placeholder="напр. 12345678"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Важливість оплати *</label>
          <select
            className={inputCls}
            value={importance}
            onChange={(e) => setImportance(e.target.value as Importance | '')}
          >
            <option value="">Оберіть…</option>
            {IMPORTANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Файл або фото</label>
          <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg py-5 cursor-pointer hover:border-brand-400">
            <Upload size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">Оберіть файли…</span>
            <input type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <span className="flex-1 truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-600"
                    aria-label="Прибрати"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>За що оплата, короткий опис *</label>
          <input
            className={inputCls}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Введіть відповідь"
          />
        </div>

        <div>
          <label className={labelCls}>Коментар</label>
          <input
            className={inputCls}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Необовʼязково"
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Скасувати
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Відправка...' : 'Відправити'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
