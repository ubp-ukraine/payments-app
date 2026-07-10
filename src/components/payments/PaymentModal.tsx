import { ReactNode, useEffect, useState } from 'react';
import { Check, FileText, MessageSquare, Paperclip, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DirectoryRow,
  Payment,
  PaymentAllocation,
  PaymentAttachment,
  PaymentComment,
  PaymentTypeAllocation,
  Stage,
  User,
} from '../../types/database';
import {
  addComment,
  allocatePayment,
  approvePayment,
  createDir,
  getPayment,
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
import { formatDateTime, formatPaymentNo, formatUAH, IMPORTANCE_LABELS } from '../../constants/domain';
import { Modal } from '../ui/Modal';
import { StatusPill } from '../ui/StatusPill';
import { fileKind, useFilePreview, useThumbnails } from './attachments';
import { FilePreviewOverlay } from './FilePreviewOverlay';

type ThreadItem =
  | { kind: 'comment'; id: string; at: string; author_id: string; text: string }
  | { kind: 'file'; id: string; at: string; att: PaymentAttachment };

// ── Крок таймлайну ───────────────────────────────────────────────────────────
type BlockState = 'done' | 'active' | 'pending' | 'rejected';

function StageBadge({ state }: { state: BlockState }) {
  const map: Record<BlockState, { label: string; cls: string }> = {
    done: { label: 'Виконано', cls: 'border-green-200 bg-green-50 text-green-700' },
    active: { label: 'Поточний крок', cls: 'border-brand-200 bg-brand-50 text-brand-700' },
    rejected: { label: 'Відхилено', cls: 'border-red-200 bg-red-50 text-red-700' },
    pending: { label: 'Очікує', cls: 'border-gray-200 bg-gray-50 text-gray-400' },
  };
  const m = map[state];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Block({
  index,
  title,
  state,
  actor,
  at,
  last,
  children,
}: {
  index: number;
  title: string;
  state: BlockState;
  actor?: string | null;
  at?: string | null;
  last?: boolean;
  children?: ReactNode;
}) {
  const node =
    state === 'done'
      ? 'bg-green-500 border-green-500 text-white'
      : state === 'active'
      ? 'bg-white border-brand-500 text-brand-600'
      : state === 'rejected'
      ? 'bg-red-500 border-red-500 text-white'
      : 'bg-white border-gray-300 text-gray-300';
  return (
    <li className={`relative pl-9 ${last ? '' : 'pb-5'}`}>
      {!last && <span className="absolute left-[11px] top-7 bottom-0 w-px bg-gray-200" aria-hidden />}
      <span
        className={`absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${node}`}
        aria-hidden
      >
        {state === 'done' ? (
          <Check size={13} strokeWidth={3} />
        ) : state === 'rejected' ? (
          <X size={13} strokeWidth={3} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Блок {index}</div>
          <div className="text-sm font-semibold text-gray-900 leading-tight">{title}</div>
        </div>
        <StageBadge state={state} />
      </div>
      {(actor || at) && (
        <div className="mt-0.5 text-[11px] text-gray-400">
          {actor ?? ''}
          {actor && at ? ' · ' : ''}
          {at ?? ''}
        </div>
      )}
      {children && <div className="mt-2">{children}</div>}
    </li>
  );
}

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

  const [p, setP] = useState<Payment>(payment);
  const isOwner = p.author_id === user?.id;
  const s = p.status;

  const [comments, setComments] = useState<PaymentComment[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [attachments, setAttachments] = useState<PaymentAttachment[]>([]);
  const [banks, setBanks] = useState<DirectoryRow[]>([]);
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [approvalNote, setApprovalNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showComments, setShowComments] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);

  const [payFiles, setPayFiles] = useState<File[]>([]);
  const [payNote, setPayNote] = useState('');

  const [types, setTypes] = useState<DirectoryRow[]>([]);
  const [typeAllocs, setTypeAllocs] = useState<PaymentTypeAllocation[]>([]);
  const [typeAlloc, setTypeAlloc] = useState<Record<string, string>>({});
  const [newTypeName, setNewTypeName] = useState('');
  const [savingTypes, setSavingTypes] = useState(false);

  const { preview, openFile, closePreview } = useFilePreview(setError);
  const thumbs = useThumbnails(attachments);

  const loadThread = async () => {
    const [c, at] = await Promise.all([listComments(payment.id), listAttachments(payment.id)]);
    setComments(c);
    setAttachments(at);
  };

  // Повне перезавантаження заявки (оновлення модалки на місці після дій).
  // seedTypes=true пересіює поля введення типів (лише при першому відкритті),
  // щоб дія «Зберегти розподіл» не затирала незбережені суми по типах.
  const reload = async (seedTypes = false) => {
    const [pmt, a, c, at, bks] = await Promise.all([
      getPayment(payment.id),
      listAllocations(payment.id),
      listComments(payment.id),
      listAttachments(payment.id),
      listDir('banks'),
    ]);
    setP(pmt);
    setAllocations(a);
    setComments(c);
    setAttachments(at);
    setBanks(bks);
    setAlloc(Object.fromEntries(a.map((x) => [x.bank_id, String(x.amount)])));
    // Типи оплат — окремо й толерантно: якщо міграцію 0007 ще не застосовано,
    // решта модалки має працювати (а не падати цілком).
    try {
      const [ta, tps] = await Promise.all([
        listTypeAllocations(payment.id),
        listDir('payment_types', true),
      ]);
      setTypeAllocs(ta);
      setTypes(tps);
      if (seedTypes) setTypeAlloc(Object.fromEntries(ta.map((t) => [t.type_id, String(t.amount)])));
    } catch {
      /* таблиці типів оплат ще немає — функція типів тимчасово недоступна */
    }
  };

  useEffect(() => {
    reload(true).catch((err) => setError((err as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id]);

  // ── Похідні за етапами (нема stage → трактуємо як обговорення) ──────────────
  const stageOf = (x: { stage?: Stage }): Stage => x.stage ?? 'discussion';
  const commentsAt = (st: Stage) => comments.filter((c) => stageOf(c) === st);
  const filesAt = (st: Stage) => attachments.filter((a) => stageOf(a) === st);

  const name = (id: string | null) => (id ? users[id]?.full_name || users[id]?.email || '—' : '—');
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? 'Тип';
  const bankName = (id: string) => banks.find((b) => b.id === id)?.name ?? 'Банк';
  const companyName = p.payer_company_id ? companies[p.payer_company_id]?.name ?? '—' : '—';
  const formName = p.payment_form_id ? forms[p.payment_form_id]?.name ?? '—' : p.payment_form ?? '—';

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
    (sum, v) => sum + (Number(String(v).replace(',', '.')) || 0),
    0
  );
  const typeMatch = Math.abs(typeTotal - p.amount) <= 0.001;

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

  const addFiles = (list: FileList | null) => {
    if (list) setCommentFiles((prev) => [...prev, ...Array.from(list)]);
  };
  const addPayFiles = (list: FileList | null) => {
    if (list) setPayFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const postComment = async () => {
    if (!user) return;
    if (!newComment.trim() && commentFiles.length === 0) return;
    setPosting(true);
    setError('');
    try {
      for (const file of commentFiles) {
        await uploadAttachment(payment.id, file, 'discussion');
      }
      if (newComment.trim()) {
        await addComment(payment.id, user.id, newComment.trim(), 'discussion');
      }
      setNewComment('');
      setCommentFiles([]);
      await loadThread();
    } catch (err) {
      setError((err as Error).message || 'Не вдалося додати коментар');
    } finally {
      setPosting(false);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await reload();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doApprove = () =>
    run(async () => {
      await approvePayment(payment.id);
      if (approvalNote.trim() && user) await addComment(payment.id, user.id, approvalNote.trim(), 'approval');
      setApprovalNote('');
    });
  const doReject = () => {
    if (!approvalNote.trim()) return setError('Вкажіть причину відхилення');
    if (!user) return;
    return run(async () => {
      await rejectPayment(payment.id, approvalNote.trim(), user.id);
      setApprovalNote('');
    });
  };
  const doResubmit = () => run(() => resubmitPayment(payment.id));

  const allocTotal = Object.values(alloc).reduce(
    (sum, v) => sum + (Number(String(v).replace(',', '.')) || 0),
    0
  );
  const allocMatch = Math.abs(allocTotal - p.amount) <= 0.001;

  const doAllocate = () => {
    const rows = Object.entries(alloc)
      .map(([bank_id, v]) => ({ bank_id, amount: Number(String(v).replace(',', '.')) || 0 }))
      .filter((r) => r.amount > 0);
    if (!allocMatch) return setError('Сума по банках має дорівнювати сумі заявки');
    return run(() => allocatePayment(payment.id, rows));
  };
  const doPay = () =>
    run(async () => {
      for (const file of payFiles) {
        await uploadAttachment(payment.id, file, 'payment');
      }
      if (payNote.trim() && user) await addComment(payment.id, user.id, payNote.trim(), 'payment');
      await payPayment(payment.id);
      setPayFiles([]);
      setPayNote('');
    });

  // Стан блоків залежно від статусу заявки.
  const b1: BlockState = 'done';
  const b2: BlockState = s === 'pending' ? 'active' : s === 'rejected' ? 'rejected' : 'done';
  const b3: BlockState = s === 'approved' ? 'active' : s === 'allocated' || s === 'paid' ? 'done' : 'pending';
  const b4: BlockState = s === 'allocated' ? 'active' : s === 'paid' ? 'done' : 'pending';

  const editAllocation = canPay && (s === 'approved' || s === 'allocated');
  const editTypes = canPay && s !== 'pending' && s !== 'rejected';

  // Розподіл видимий і для деактивованих банків, що вже мають суму (щоб можна було виправити).
  const activeBanks = banks.filter((b) => b.is_active);
  const allocBankIds = new Set(allocations.map((a) => a.bank_id));
  const editorBanks = [...activeBanks, ...banks.filter((b) => !b.is_active && allocBankIds.has(b.id))];

  // ── Дрібні рендери ──────────────────────────────────────────────────────────
  const fileButton = (att: PaymentAttachment) =>
    fileKind(att.name || att.path) === 'image' && thumbs[att.id] ? (
      <button
        key={att.id}
        onClick={() => openFile(att)}
        className="block overflow-hidden rounded-xl border border-gray-200"
      >
        <img src={thumbs[att.id]} alt={att.name || 'Зображення'} className="max-h-40 w-auto object-cover" />
      </button>
    ) : (
      <button
        key={att.id}
        onClick={() => openFile(att)}
        className="inline-flex items-center gap-2 max-w-full rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-brand-700 hover:bg-gray-200"
      >
        {fileKind(att.name || att.path) === 'pdf' ? (
          <FileText size={16} className="shrink-0" />
        ) : (
          <Paperclip size={15} className="shrink-0" />
        )}
        <span className="truncate">{att.name || 'Файл'}</span>
      </button>
    );

  const pendingFileList = (list: File[], onRemove: (i: number) => void) =>
    list.length > 0 && (
      <div className="space-y-1">
        {list.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Paperclip size={13} className="text-gray-400" />
            <span className="flex-1 truncate">{f.name}</span>
            <button type="button" onClick={() => onRemove(i)} className="text-gray-400 hover:text-red-600" aria-label="Прибрати">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    );

  const allocChips = allocations.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {allocations.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
          <span className="font-medium text-gray-700">{bankName(a.bank_id)}</span>
          <span className="tabular-nums font-semibold text-gray-900">{formatUAH(a.amount)}</span>
        </span>
      ))}
    </div>
  );

  const typeChips = typeAllocs.length > 0 && (
    <div>
      <div className="text-xs font-medium text-gray-600 mb-1.5">Типи оплати</div>
      <div className="flex flex-wrap gap-2">
        {typeAllocs.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
            <span className="font-medium text-gray-700">{typeName(t.type_id)}</span>
            <span className="tabular-nums font-semibold text-gray-900">{formatUAH(t.amount)}</span>
          </span>
        ))}
      </div>
    </div>
  );

  const typesEditor = (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-600">Типи оплати</div>
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
      {types.length === 0 && <div className="text-sm text-gray-400">Ще немає типів. Додайте новий нижче.</div>}
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
      <div className="flex items-center justify-between pt-2">
        <span className={`text-sm font-medium ${typeMatch ? 'text-green-700' : 'text-gray-500'}`}>
          Розподілено: <span className="tabular-nums">{formatUAH(typeTotal)}</span> / {formatUAH(p.amount)}
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
  );

  // ── Права колонка: тільки обговорення (stage = discussion) ─────────────────
  const thread: ThreadItem[] = [
    ...commentsAt('discussion').map(
      (c): ThreadItem => ({ kind: 'comment', id: c.id, at: c.created_at, author_id: c.author_id, text: c.text })
    ),
    ...filesAt('discussion').map((a): ThreadItem => ({ kind: 'file', id: a.id, at: a.created_at, att: a })),
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
              {fileButton(item.att)}
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
        {pendingFileList(commentFiles, (i) => setCommentFiles((prev) => prev.filter((_, idx) => idx !== i)))}
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

  const submissionComments = commentsAt('submission');
  const submissionFiles = filesAt('submission');
  // Лише коментарі поточного циклу погодження: після «Подати знову» стара причина
  // відхилення (створена до теперішнього рішення) не має воскресати у блоці 2.
  const approvalComments = commentsAt('approval').filter(
    (c) => !p.approved_at || c.created_at >= p.approved_at
  );
  const paymentComments = commentsAt('payment');
  const paymentFiles = filesAt('payment');

  return (
    <Modal title={p.purpose || 'Заявка на оплату'} onClose={onClose} maxWidth="max-w-5xl">
      <div className="relative flex flex-col h-[80vh] overflow-hidden">
        {/* Верхній рядок: статус, № рахунку, сума, кнопка обговорення */}
        <div className="shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <StatusPill status={p.status} />
            <span className="font-mono text-xs text-gray-400 whitespace-nowrap">{formatPaymentNo(p.number)}</span>
            {p.invoice_number && (
              <span className="font-mono text-xs text-gray-400 truncate">· № {p.invoice_number}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl font-bold tabular-nums text-gray-900 whitespace-nowrap">{formatUAH(p.amount)}</span>
            <button
              onClick={() => setShowComments((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Обговорення</span>
              {thread.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold">
                  {thread.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {error && <div className="shrink-0 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

        {/* Блоки на всю ширину модалки, з окремим прокрутом */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-4 pr-1">
          <ol className="relative">
            {/* Блок 1 — Заявка */}
            <Block index={1} title="Заявка" state={b1} actor={name(p.author_id)} at={formatDateTime(p.created_at)}>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
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
                  <dd className="text-gray-900">{p.importance ? IMPORTANCE_LABELS[p.importance] : '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">Номер рахунку</dt>
                  <dd className="text-gray-900">{p.invoice_number || '—'}</dd>
                </div>
                {p.purpose && (
                  <div className="col-span-2 md:col-span-4">
                    <dt className="text-gray-400 text-xs">За що оплата</dt>
                    <dd className="text-gray-900">{p.purpose}</dd>
                  </div>
                )}
              </dl>
              {submissionComments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {submissionComments.map((c) => (
                    <p key={c.id} className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {c.text}
                    </p>
                  ))}
                </div>
              )}
              {submissionFiles.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400 mb-1">Файл рахунку</div>
                  <div className="flex flex-wrap gap-2">{submissionFiles.map(fileButton)}</div>
                </div>
              )}
            </Block>

            {/* Блок 2 — Погодження */}
            <Block
              index={2}
              title="Погодження"
              state={b2}
              actor={b2 === 'active' ? undefined : name(p.approved_by)}
              at={b2 === 'active' ? undefined : formatDateTime(p.approved_at)}
              last={s === 'rejected'}
            >
              {b2 === 'active' && canApprove && (
                <div className="space-y-2">
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Коментар (обовʼязковий при відхиленні)"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
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
              {b2 === 'active' && !canApprove && (
                <p className="text-xs text-gray-400">Очікує погодження адміністратора або фін. директора.</p>
              )}
              {b2 === 'rejected' && (
                <div className="space-y-2">
                  {approvalComments.length > 0 ? (
                    approvalComments.map((c) => (
                      <p key={c.id} className="text-sm text-red-700 whitespace-pre-wrap break-words">
                        {c.text}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-red-600">Заявку відхилено.</p>
                  )}
                  {isOwner && (
                    <button
                      disabled={busy}
                      onClick={doResubmit}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Подати знову
                    </button>
                  )}
                </div>
              )}
              {b2 === 'done' && approvalComments.length > 0 && (
                <div className="space-y-1">
                  {approvalComments.map((c) => (
                    <p key={c.id} className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {c.text}
                    </p>
                  ))}
                </div>
              )}
            </Block>

            {s !== 'rejected' && (
              <>
                {/* Блок 3 — Розподіл по банках */}
                <Block
                  index={3}
                  title="Розподіл по банках"
                  state={b3}
                  actor={b3 === 'done' ? name(p.allocated_by) : undefined}
                  at={b3 === 'done' ? formatDateTime(p.allocated_at) : undefined}
                >
                  {b3 === 'pending' && <p className="text-xs text-gray-400">Стане доступним після погодження заявки.</p>}
                  {b3 === 'active' && !canPay && (
                    <p className="text-xs text-gray-400">Очікує розподілу по банках бухгалтером.</p>
                  )}

                  {editAllocation ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1.5">Розподілити суму по банках</div>
                        <div className="space-y-2">
                          {editorBanks.map((b) => (
                            <div key={b.id} className="flex items-center gap-3">
                              <div className="flex-1 text-sm text-gray-700">
                                {b.name}
                                {!b.is_active && <span className="ml-1 text-[11px] text-gray-400">(неактивний)</span>}
                              </div>
                              <input
                                className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={alloc[b.id] ?? ''}
                                onChange={(e) => setAlloc((a) => ({ ...a, [b.id]: e.target.value }))}
                              />
                            </div>
                          ))}
                          {editorBanks.length === 0 && (
                            <div className="text-sm text-gray-400">Немає активних банків. Додайте у «Довідники».</div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className={`text-sm font-medium ${allocMatch ? 'text-green-700' : 'text-gray-500'}`}>
                            Розподілено: <span className="tabular-nums">{formatUAH(allocTotal)}</span> / {formatUAH(p.amount)}
                          </span>
                          <button
                            disabled={busy || !allocMatch}
                            onClick={doAllocate}
                            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                          >
                            {s === 'approved' ? 'Зберегти розподіл' : 'Оновити розподіл'}
                          </button>
                        </div>
                      </div>
                      {editTypes && <div className="border-t border-gray-100 pt-3">{typesEditor}</div>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allocChips}
                      {editTypes ? <div className="border-t border-gray-100 pt-3">{typesEditor}</div> : typeChips}
                    </div>
                  )}
                </Block>

                {/* Блок 4 — Оплата */}
                <Block
                  index={4}
                  title="Оплата"
                  state={b4}
                  actor={b4 === 'done' ? name(p.paid_by) : undefined}
                  at={b4 === 'done' ? formatDateTime(p.paid_at) : undefined}
                  last
                >
                  {b4 === 'pending' && <p className="text-xs text-gray-400">Стане доступним після розподілу по банках.</p>}

                  {b4 === 'active' && canPay && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        До оплати: <span className="font-semibold tabular-nums text-gray-800">{formatUAH(p.amount)}</span>
                      </p>
                      <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer hover:text-brand-700">
                        <Upload size={15} />
                        <span>Додати платіжку / файл</span>
                        <input type="file" multiple className="hidden" onChange={(e) => addPayFiles(e.target.files)} />
                      </label>
                      {pendingFileList(payFiles, (i) => setPayFiles((prev) => prev.filter((_, idx) => idx !== i)))}
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        rows={2}
                        placeholder="Деталі оплати (необовʼязково)"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                      />
                      <button
                        disabled={busy}
                        onClick={doPay}
                        className="w-full px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                      >
                        Провести оплату
                      </button>
                    </div>
                  )}
                  {b4 === 'active' && !canPay && (
                    <p className="text-xs text-gray-400">Очікує проведення оплати бухгалтером.</p>
                  )}
                  {b4 === 'done' && (
                    <div className="space-y-2">
                      <p className="text-xs text-green-700">Оплату проведено.</p>
                      {paymentComments.length > 0 &&
                        paymentComments.map((c) => (
                          <p key={c.id} className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {c.text}
                          </p>
                        ))}
                      {paymentFiles.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Платіжка</div>
                          <div className="flex flex-wrap gap-2">{paymentFiles.map(fileButton)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </Block>
              </>
            )}
          </ol>
        </div>

        {/* Видвижна панель обговорення */}
        {showComments && (
          <div className="absolute inset-0 z-10 bg-black/20" onClick={() => setShowComments(false)} aria-hidden />
        )}
        <aside
          className={`absolute top-0 right-0 z-20 h-full w-full sm:w-[400px] bg-white sm:border-l border-gray-200 sm:shadow-xl flex flex-col transform transition-transform duration-300 ${
            showComments ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Обговорення</span>
            <button
              onClick={() => setShowComments(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Закрити"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4">{thread$}</div>
        </aside>
      </div>

      {preview && <FilePreviewOverlay preview={preview} onClose={closePreview} />}
    </Modal>
  );
}
