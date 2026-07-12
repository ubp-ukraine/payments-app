import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Paperclip, Search } from 'lucide-react';
import { DirectoryRow, Payment, PaymentAttachment } from '../../types/database';
import { listAllAttachments } from '../../lib/api';
import { formatUAH } from '../../constants/domain';
import { Badge } from '../ui/Badge';
import { InfoBanner } from '../ui/InfoBanner';
import { TextInput } from '../ui/FormField';
import { fileKind, useFilePreview, useThumbnails } from './attachments';
import { FilePreviewOverlay } from './FilePreviewOverlay';

interface Props {
  payments: Payment[];
  companies: Record<string, DirectoryRow>;
}

export function PaymentFiles({ payments, companies }: Props) {
  const [attachments, setAttachments] = useState<PaymentAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const { preview, openFile, closePreview } = useFilePreview(setError);
  const thumbs = useThumbnails(attachments);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setAttachments(await listAllAttachments());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const paymentsById = useMemo(() => Object.fromEntries(payments.map((p) => [p.id, p])), [payments]);

  const paymentLabel = (a: PaymentAttachment): string => {
    const p = paymentsById[a.payment_id];
    if (!p) return 'Заявка';
    const company = p.payer_company_id ? companies[p.payer_company_id]?.name : null;
    return p.purpose || company || 'Заявка';
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return attachments;
    return attachments.filter((a) => {
      const inv = paymentsById[a.payment_id]?.invoice_number || '';
      return (
        (a.name || '').toLowerCase().includes(needle) ||
        paymentLabel(a).toLowerCase().includes(needle) ||
        inv.toLowerCase().includes(needle)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, attachments, paymentsById]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div>
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за назвою файлу, заявкою чи № рахунку…"
          className="pl-9"
        />
      </div>

      {error && (
        <div className="mb-4">
          <InfoBanner tone="danger" icon={AlertCircle}>
            {error}
          </InfoBanner>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-sm">{attachments.length === 0 ? 'Немає файлів' : 'Нічого не знайдено'}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((a) => {
            const kind = fileKind(a.name || a.path);
            return (
              <button
                key={a.id}
                onClick={() => openFile(a)}
                className="group text-left bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-brand-300 hover:shadow-md transition-all duration-150 flex flex-col focus:outline-none focus:ring-4 focus:ring-brand-600/20"
              >
                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                  {kind === 'image' && thumbs[a.id] ? (
                    <img src={thumbs[a.id]} alt={a.name || ''} className="w-full h-full object-cover" />
                  ) : kind === 'pdf' ? (
                    <FileText size={30} className="text-gray-300" />
                  ) : (
                    <Paperclip size={26} className="text-gray-300" />
                  )}
                </div>
                <div className="p-2.5 min-w-0 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-900 truncate">{a.name || 'Файл'}</div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">{paymentLabel(a)}</div>
                  <div className="text-[11px] text-gray-400 mt-1.5 flex items-center justify-between gap-2">
                    <span className="tabular-nums">{fmtDate(a.created_at)}</span>
                    {paymentsById[a.payment_id] && (
                      <Badge variant="muted" className="tabular-nums whitespace-nowrap">
                        {formatUAH(paymentsById[a.payment_id].amount)}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {preview && <FilePreviewOverlay preview={preview} onClose={closePreview} />}
    </div>
  );
}
