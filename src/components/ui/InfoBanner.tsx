import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

interface InfoBannerProps {
  tone: Tone;
  title?: string;
  children?: ReactNode;
  icon?: LucideIcon;
}

const TONES: Record<Tone, { box: string; icon: string }> = {
  info: { box: 'bg-blue-50 border-blue-200 text-blue-800', icon: 'text-blue-600' },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-800', icon: 'text-amber-600' },
  danger: { box: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-600' },
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: 'text-emerald-600' },
  neutral: { box: 'bg-slate-50 border-slate-200 text-slate-800', icon: 'text-slate-600' },
};

export function InfoBanner({ tone, title, children, icon: Icon }: InfoBannerProps) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border p-3.5 flex gap-2.5 text-sm ${t.box}`}>
      {Icon && <Icon size={16} className={`shrink-0 mt-0.5 ${t.icon}`} />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}
