import { useEffect, useState } from 'react';
import { Filter, RotateCcw, X } from 'lucide-react';
import { DirectoryRow, PaymentStatus } from '../../types/database';
import { STATUS_META } from '../../constants/domain';
import { Button } from '../ui/Button';

interface Props {
  /** Підприємства для вибору (зазвичай ті, що трапляються у заявках). */
  companies: DirectoryRow[];
  companyIds: string[];
  statuses: PaymentStatus[];
  onCompaniesChange: (ids: string[]) => void;
  onStatusesChange: (s: PaymentStatus[]) => void;
  /** Які статуси показувати (за замовч. усі 5). */
  statusOptions?: PaymentStatus[];
}

const ALL_STATUSES: PaymentStatus[] = ['pending', 'approved', 'allocated', 'paid', 'rejected'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const chipCls = (active: boolean) =>
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-brand-600/20 ${
    active
      ? 'bg-brand-600 border-brand-600 text-white'
      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
  }`;

export function PaymentFilter({
  companies,
  companyIds,
  statuses,
  onCompaniesChange,
  onStatusesChange,
  statusOptions = ALL_STATUSES,
}: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = companyIds.length + statuses.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const clearAll = () => {
    onCompaniesChange([]);
    onStatusesChange([]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-brand-600/20 ${
          activeCount > 0
            ? 'border-brand-200 bg-brand-50 text-brand-700'
            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
        }`}
      >
        <Filter size={16} />
        Фільтр
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[11px] font-bold tabular-nums">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 right-0 w-full sm:w-[380px] bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] flex flex-col">
            <header className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <span className="text-base font-semibold text-gray-900">Фільтри</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-brand-600/20"
                aria-label="Закрити"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Статус (можна декілька)</label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((s) => {
                    const active = statuses.includes(s);
                    return (
                      <button key={s} onClick={() => onStatusesChange(toggle(statuses, s))} className={chipCls(active)}>
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : STATUS_META[s].dot}`} />
                        {STATUS_META[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Підприємство (можна декілька)</label>
                {companies.length === 0 ? (
                  <div className="text-sm text-gray-400">Немає підприємств</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {companies.map((c) => {
                      const active = companyIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => onCompaniesChange(toggle(companyIds, c.id))}
                          className={chipCls(active)}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <footer className="shrink-0 flex items-center justify-between px-5 py-4 border-t border-gray-200">
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={activeCount === 0}>
                <RotateCcw size={15} />
                Скинути все
              </Button>
              <Button variant="primary" size="md" onClick={() => setOpen(false)}>
                Готово
              </Button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
