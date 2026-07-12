import { ReactNode, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Payment, PaymentStatus } from '../../types/database';
import { formatUAH } from '../../constants/domain';

export interface StatusSection {
  status: PaymentStatus;
  label: string;
  color: string;
  headerBg: string;
  items: Payment[];
}

interface Props {
  sections: StatusSection[];
  /** Ключ localStorage для запамʼятовування згорнутих секцій. */
  storageKey: string;
  renderItem: (p: Payment) => ReactNode;
  emptyMessage?: string;
}

const sum = (rows: Payment[]) => rows.reduce((acc, p) => acc + p.amount, 0);

export function StatusSectionList({ sections, storageKey, renderItem, emptyMessage = 'Немає заявок' }: Props) {
  const [collapsed, setCollapsed] = useState<Set<PaymentStatus>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
  }, [collapsed, storageKey]);

  const toggle = (s: PaymentStatus) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <div className="space-y-3">
      {sections.map((sec) => {
        const isCollapsed = collapsed.has(sec.status);
        return (
          <div key={sec.status} className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
            <button
              onClick={() => toggle(sec.status)}
              className={`w-full flex items-center gap-2 px-4 py-3 ${sec.headerBg} text-left transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-brand-600/20`}
            >
              {isCollapsed ? (
                <ChevronRight size={16} className={sec.color} />
              ) : (
                <ChevronDown size={16} className={sec.color} />
              )}
              <span className={`text-sm font-semibold ${sec.color}`}>{sec.label}</span>
              <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums bg-white ${sec.color}`}>
                {sec.items.length}
              </span>
              <span className="ml-auto text-sm font-medium tabular-nums text-gray-600">{formatUAH(sum(sec.items))}</span>
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-gray-100 border-t border-gray-200">
                {sec.items.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">{emptyMessage}</div>
                ) : (
                  sec.items.map((p) => <div key={p.id}>{renderItem(p)}</div>)
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
