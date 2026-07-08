import { ReactNode } from 'react';

export interface KanbanColumn<T> {
  key: string;
  label: string;
  color: string;
  headerBg: string;
  items: T[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  getItemKey: (item: T) => string;
  emptyMessage?: string;
  columnClassName?: string;
}

export function KanbanBoard<T>({
  columns,
  renderCard,
  getItemKey,
  emptyMessage = 'Порожньо',
  columnClassName = 'w-[86vw] min-w-[86vw] sm:w-[20rem] sm:min-w-[20rem]',
}: KanbanBoardProps<T>) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarGutter: 'stable' }}>
      {columns.map((col) => (
        <div
          key={col.key}
          className={`flex-shrink-0 ${columnClassName} flex flex-col rounded-xl border border-gray-200 bg-gray-50 overflow-hidden`}
        >
          <div className={`px-4 py-3 ${col.headerBg} border-b border-gray-200 shrink-0 flex items-center justify-between gap-2`}>
            <span className={`text-sm font-semibold ${col.color} leading-snug`}>{col.label}</span>
            <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold bg-white ${col.color}`}>
              {col.items.length}
            </span>
          </div>

          <div className="flex-1 min-h-[120px] p-3 space-y-3 overflow-y-auto">
            {col.items.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-gray-400">{emptyMessage}</div>
            ) : (
              col.items.map((item) => <div key={getItemKey(item)}>{renderCard(item)}</div>)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
