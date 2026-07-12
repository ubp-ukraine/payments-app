import { ReactNode } from 'react';

interface ListBannerProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
}

export function ListBanner({ title, subtitle, actions, compact = false }: ListBannerProps) {
  return (
    <div
      className={`bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-lg text-white ${
        compact ? 'px-6 py-4' : 'p-6 sm:p-8'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className={`font-bold ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{title}</h1>
          {subtitle && (
            <p className="text-slate-200 text-sm sm:text-base mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
