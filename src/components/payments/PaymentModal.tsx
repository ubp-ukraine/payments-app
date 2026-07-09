import { useEffect, useState } from 'react';
import { FileText, Paperclip, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DirectoryRow,
  Payment,
  PaymentAllocation,
  PaymentAttachment,
  PaymentComment,
  PaymentTypeAllocation,
  User,
} from '../../types/database';
import {
  addComment,
  approvePayment,
  createDir,
  listAllocations,
  listAttachments,
  listComments,
  listDir,
  listTypeAllocations,
  payPayment,
  rejectPayment,
  resubmitPayment,
  saveTypeAllocations,
  uploadAttachment,
} from '../../lib/api';
import { formatUAH, IMPORTANCE_LABELS } from '../../constants/domain';
import { Modal } from '../ui/Modal';
import { StatusPill } from '../ui/StatusPill';
import { fileKind, useFilePreview, useThumbnails } from './attachments';
import { FilePreviewOverlay } from './FilePreviewOverlay';

type ThreadItem =
  | { kind: 'comment'; id: string; at: string; author_id: string; text: string }
  | { kind: 'file'; id: string; at: string; att: PaymentAttachment };

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

  const [newComment, setNewComment] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);

  const [types, setTypes] = useState<DirectoryRow[]>([]);
  const [typeAllocs, setTypeAllocs] = useState<PaymentTypeAllocation[]>([]);
  const [typeAlloc, setTypeAlloc] = useState<Record<string, string>>({});
  const [newTypeName, setNewTypeName] = useState('');
  const [savingTypes, setSavingTypes] = useState(false);

  const { preview, openFile, closePreview } = useFilePreview(setError);
  const thumbs = useThumbnails(attachments);

  const reloadThread = async () => {
    const [c, at] = await Promise.all([listComments(payment.id), listAttachments(payment.id)]);
    setComments(c);
    setAttachments(at);
  };

  useEffect(() => {
    (async () => {
      const [c, a, at, ta, tps] = await Promise.all([
        listComments(payment.id),
        listAllocations(payment.id),
        listAttachments(payment.id),
        listTypeAllocations(payment.id),
        listDir('payment_types', true),
      ]);
      setComments(c);
      setAllocations(a);
      setAttachments(at);
      setTypeAllocs(ta);
      setTypeAlloc(Object.fromEntries(ta.map((t) => [t.type_id, String(t.amount)])));
      setTypes(tps);
      if (payment.status === 'approved' && canPay) setBanks(await listDir('banks', true));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id]);

  const addType = async () => {
    const nm = newTypeName.trim();
    if (!nm) return;
    setError('');
    try {
      await createDir('payment_types', nm);
      setNewTypeName('');
      setTypes(await listDir('payment_types', true));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const typeTotal = Object.values(typeAlloc).reduce(
    (s, v) => s + (Number(String(v).replace(',', '.')) || 0),
    0
  );
  const typeMatch = Math.abs(typeTotal - payment.amount) <= 0.001;

  const saveTypes = async () => {
    const rows = Object.entries(typeAlloc)
      .map(([type_id, v]) => ({ type_id, amount: Number(String(v).replace(',', '.')) || 0 }))
      .filter((r) => r.amount > 0);
    setSavingTypes(true);
    setError('');
    try {
      await saveTypeAllocations(payment.id, rows);
      const ta = await listTypeAllocations(payment.id);
      setTypeAllocs(ta);
      setTypeAlloc(Object.fromEntries(ta.map((t) => [t.type_id, String(t.amount)])));
    } catch (err) {
      setError((err as Error).message || 'Не вдалося зберегти типи');
    } finally {
      setSavingTypes(false);
    }
  };

  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? 'Тип';

  const addFiles = (list: FileList | null) => {
    if (list) setCommentFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const postComment = async () => {
    if (!user) return;
    if (!newComment.trim() && commentFiles.length === 0) return;
    setPosting(true);
    setError('');
    try {
      for (const file of commentFiles) {
        await uploadAttachment(payment.id, file);
      }
      if (newComment.trim()) {
        await addComment(payment.id, user.id, newComment.trim());
      }
      setNewComment('');
      setCommentFiles([]);
      await reloadThread();
    } catch (err) {
      setError((err as Error).message || 'Не вдалося додати коментар');
    } finally {
      setPosting(false);
    }
  };

  const name = (id: string | null) => (id ? users[id]?.full_name || users[id]?.email || '—' : '—');
  const companyName = payment.payer_company_id ? companies[payment.payer_company_id]?.name ?? '—' : '—';
  const formName = payment.payment_form_id ? forms[payment.payment_form_id]?.name ?? '—' : payment.payment_form ?? '—';

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

  const thread: ThreadItem[] = [
    ...comments.map(
      (c): ThreadItem => ({ kind: 'comment', id: c.id, at: c.created_at, author_id: c.author_id, text: c.text })
    ),
    ...attachments.map((a): ThreadItem => ({ kind: 'file', id: a.id, at: a.created_at, att: a })),
  ].sort((x, y) => x.at.localeCompare(y.at));

  const thread$ = (
    <>
      <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-2 pr-1">
        {thread.map((item) =>
          item.kind === 'comment' ? (
            <div key={`c-${item.id}`} className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
                {item.text}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 ml-1">{name(item.author_id)}</div>
            </div>
          ) : (
            <div key={`f-${item.id}`} className="flex flex-col items-start">
              {fileKind(item.att.name || item.att.path) === 'image' && thumbs[item.att.id] ? (
                <button
                  onClick={() => openFile(item.att)}
                  className="block max-w-[85%] overflow-hidden rounded-2xl rounded-tl-sm border border-gray-200"
                >
                  <img
                    src={thumbs[item.att.id]}
                    alt={item.att.name || 'Зображення'}
                    className="max-h-52 w-auto object-cover"
                  />
                </button>
              ) : (
                <button
                  onClick={() => openFile(item.att)}
                  className="inline-flex items-center gap-2 max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-brand-700 hover:bg-gray-200"
                >
                  {fileKind(item.att.name || item.att.path) === 'pdf' ? (
                    <FileText size={16} className="shrink-0" />
                  ) : (
                    <Paperclip size={15} className="shrink-0" />
                  )}
                  <span className="truncate">{item.att.name || 'Файл'}</span>
                </button>
              )}
            </div>
          )
        )}
        {thread.length === 0 && <div className="text-sm text-gray-400">Повідомлень поки немає</div>}
      </div>

      <div className="shrink-0 pt-2 mt-2 border-t border-gray-100 space-y-2">
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          rows={2}
          placeholder="Додати коментар…"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        {commentFiles.length > 0 && (
          <div className="space-y-1">
            {commentFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <Paperclip size={13} className="text-gray-400" />
                <span className="flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setCommentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-600"
                  aria-label="Прибрати"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer hover:text-brand-700">
            <Upload size={15} />
            <span>Прикріпити файл</span>
            <input type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
          <button
            type="button"
            disabled={posting || (!newComment.trim() && commentFiles.length === 0)}
            onClick={postComment}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {posting ? 'Надсилання…' : 'Додати'}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <Modal title={payment.purpose || 'Заявка на оплату'} onClose={onClose} maxWidth="max-w-4xl">
      <div className="flex flex-col lg:flex-row gap-5 lg:h-[70vh]">
        {/* Ліворуч: деталі та дії */}
        <div className="lg:w-[46%] min-h-0 lg:overflow-y-auto lg:pr-1 space-y-4">
        <div className="flex items-center justify-between">
          <StatusPill status={payment.status} />
          <span className="text-xl font-bold tabular-nums text-gray-900">{formatUAH(payment.amount)}</span>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

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

        {/* Типи оплати — розбивка суми по типах (для бухгалтера/адміна) */}
        {canPay ? (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-2">Типи оплати</div>
            <div className="space-y-2">
              {types.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-gray-700">{t.name}</div>
                  <input
                    className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={typeAlloc[t.id] ?? ''}
                    onChange={(e) => setTypeAlloc((a) => ({ ...a, [t.id]: e.target.value }))}
                  />
                </div>
              ))}
              {types.length === 0 && (
                <div className="text-sm text-gray-400">Ще немає типів. Додайте новий нижче.</div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <input
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Новий тип…"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addType();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addType}
                  disabled={!newTypeName.trim()}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                >
                  Додати тип
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className={`text-sm font-medium ${typeMatch ? 'text-green-700' : 'text-gray-500'}`}>
                Розподілено: <span className="tabular-nums">{formatUAH(typeTotal)}</span> / {formatUAH(payment.amount)}
              </span>
              <button
                type="button"
                disabled={savingTypes}
                onClick={saveTypes}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {savingTypes ? 'Збереження…' : 'Зберегти типи'}
              </button>
            </div>
          </div>
        ) : (
          typeAllocs.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-400 mb-2">Типи оплати</div>
              <div className="flex flex-wrap gap-2">
                {typeAllocs.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                    <span className="font-medium text-gray-700">{typeName(t.type_id)}</span>
                    <span className="tabular-nums font-semibold text-gray-900">{formatUAH(t.amount)}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        )}

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

        {/* Праворуч: обговорення з окремим прокрутом */}
        <div className="lg:w-[54%] flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-5">
          <div className="text-xs text-gray-400 mb-2 shrink-0">Обговорення</div>
          {thread$}
        </div>
      </div>

      {preview && <FilePreviewOverlay preview={preview} onClose={closePreview} />}
    </Modal>
  );
}
