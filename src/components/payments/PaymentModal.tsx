import { useEffect, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DirectoryRow,
  Payment,
  PaymentAllocation,
  PaymentAttachment,
  PaymentComment,
  User,
} from '../../types/database';
import {
  approvePayment,
  attachmentUrl,
  listAllocations,
  listAttachments,
  listComments,
  listDir,
  payPayment,
  rejectPayment,
  resubmitPayment,
} from '../../lib/api';
import { formatUAH, IMPORTANCE_LABELS } from '../../constants/domain';
import { Modal } from '../ui/Modal';
import { StatusPill } from '../ui/StatusPill';

interface Props {
  payment: Payment;
  users: Record<string, User>;
  companies: Record<string, DirectoryRow>;
  forms: Record<string, DirectoryRow>;
  onClose: () => void;
  onChanged: () => void;
}

export function PaymentModal({ payment, users, companies, forms, onClose, onChanged }: Props) {
  const { user, profile } = useAuth();
  const role = profile?.role;
  const canApprove = role === 'admin' || role === 'fin_director';
  const canPay = role === 'buhgalter' || role === 'admin';
  const isOwner = payment.author_id === user?.id;

  const [comments, setComments] = useState<PaymentComment[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [attachments, setAttachments] = useState<PaymentAttachment[]>([]);
  const [banks, setBanks] = useState<DirectoryRow[]>([]);
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [rejectComment, setRejectComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [c, a, at] = await Promise.all([
        listComments(payment.id),
        listAllocations(payment.id),
        listAttachments(payment.id),
      ]);
      setComments(c);
      setAllocations(a);
      setAttachments(at);
      if (payment.status === 'approved' && canPay) setBanks(await listDir('banks', true));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id]);

  const name = (id: string | null) => (id ? users[id]?.full_name || users[id]?.email || '—' : '—');
  const companyName = payment.payer_company_id ? companies[payment.payer_company_id]?.name ?? '—' : '—';
  const formName = payment.payment_form_id ? forms[payment.payment_form_id]?.name ?? '—' : payment.payment_form ?? '—';

  const openFile = async (path: string) => {
    try {
      const url = await attachmentUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const doApprove = () => run(() => approvePayment(payment.id));
  const doReject = () => {
    if (!rejectComment.trim()) return setError('Вкажіть причину відхилення');
    if (!user) return;
    return run(() => rejectPayment(payment.id, rejectComment.trim(), user.id));
  };
  const doResubmit = () => run(() => resubmitPayment(payment.id));

  const allocTotal = Object.values(alloc).reduce(
    (s, v) => s + (Number(String(v).replace(',', '.')) || 0),
    0
  );
  const allocMatch = Math.abs(allocTotal - payment.amount) <= 0.001;
  const doPay = () => {
    const rows = Object.entries(alloc)
      .map(([bank_id, v]) => ({ bank_id, amount: Number(String(v).replace(',', '.')) || 0 }))
      .filter((r) => r.amount > 0);
    if (!allocMatch) return setError('Сума по банках має дорівнювати сумі заявки');
    return run(() => payPayment(payment.id, rows));
  };

  return (
    <Modal title={payment.purpose || 'Заявка на оплату'} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusPill status={payment.status} />
          <span className="text-xl font-bold tabular-nums text-gray-900">{formatUAH(payment.amount)}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-400 text-xs">Підприємство-платник</dt>
            <dd className="text-gray-900">{companyName}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs">Форма оплати</dt>
            <dd className="text-gray-900">{formName}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs">Важливість</dt>
            <dd className="text-gray-900">{payment.importance ? IMPORTANCE_LABELS[payment.importance] : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs">Замовник</dt>
            <dd className="text-gray-900">{name(payment.author_id)}</dd>
          </div>
          {payment.purpose && (
            <div className="col-span-2">
              <dt className="text-gray-400 text-xs">За що оплата</dt>
              <dd className="text-gray-900">{payment.purpose}</dd>
            </div>
          )}
          {(payment.status === 'approved' || payment.status === 'paid') && (
            <div>
              <dt className="text-gray-400 text-xs">Погодив</dt>
              <dd className="text-gray-900">{name(payment.approved_by)}</dd>
            </div>
          )}
          {payment.status === 'paid' && (
            <div>
              <dt className="text-gray-400 text-xs">Оплатив</dt>
              <dd className="text-gray-900">{name(payment.paid_by)}</dd>
            </div>
          )}
        </dl>

        {attachments.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-2">Вкладення</div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openFile(a.path)}
                  className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-brand-700 hover:bg-gray-100"
                >
                  <Paperclip size={13} />
                  <span className="max-w-[200px] truncate">{a.name || 'Файл'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {payment.status === 'paid' && allocations.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-2">Розбивка по банках</div>
            <div className="flex flex-wrap gap-2">
              {allocations.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                  <span className="font-medium text-gray-700">{banks.find((b) => b.id === a.bank_id)?.name ?? 'Банк'}</span>
                  <span className="tabular-nums font-semibold text-gray-900">{formatUAH(a.amount)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {comments.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="text-xs text-gray-400">Коментарі</div>
            {comments.map((c) => (
              <div key={c.id} className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <div className="text-gray-800">{c.text}</div>
                <div className="text-[11px] text-gray-400 mt-1">{name(c.author_id)}</div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

        {payment.status === 'pending' && canApprove && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Коментар (обовʼязковий при відхиленні)"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={doApprove}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                Погодити
              </button>
              <button
                disabled={busy}
                onClick={doReject}
                className="flex-1 px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
              >
                Відхилити
              </button>
            </div>
          </div>
        )}

        {payment.status === 'approved' && canPay && (
          <div className="border-t border-gray-100 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Розкидати по банках</div>
            <div className="space-y-2">
              {banks.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-gray-700">{b.name}</div>
                  <input
                    className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={alloc[b.id] ?? ''}
                    onChange={(e) => setAlloc((a) => ({ ...a, [b.id]: e.target.value }))}
                  />
                </div>
              ))}
              {banks.length === 0 && (
                <div className="text-sm text-gray-400">Немає активних банків. Додайте у «Довідники».</div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className={`text-sm font-medium ${allocMatch ? 'text-green-700' : 'text-gray-500'}`}>
                Розподілено: <span className="tabular-nums">{formatUAH(allocTotal)}</span> / {formatUAH(payment.amount)}
              </span>
              <button
                disabled={busy || !allocMatch}
                onClick={doPay}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                Провести оплату
              </button>
            </div>
          </div>
        )}

        {payment.status === 'rejected' && isOwner && (
          <div className="border-t border-gray-100 pt-4">
            <button
              disabled={busy}
              onClick={doResubmit}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Подати знову
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
