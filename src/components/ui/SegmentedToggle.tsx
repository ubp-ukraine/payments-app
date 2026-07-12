import { LucideIcon } from 'lucide-react';

interface SegmentedOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedToggleProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  tone?: 'light' | 'onDark';
}

export function SegmentedToggle<T extends string | number>({
  value,
  onChange,
  options,
  tone = 'light',
}: SegmentedToggleProps<T>) {
  const container =
    tone === 'onDark'
      ? 'inline-flex bg-slate-600/50 rounded-lg p-1'
      : 'inline-flex rounded-lg border border-gray-200 bg-white p-0.5';

  return (
    <div className={container}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = opt.value === value;
        const item =
          tone === 'onDark'
            ? isActive
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-300 hover:text-white'
            : isActive
              ? 'bg-brand-600 text-white'
              : 'text-gray-600 hover:bg-gray-50';
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${item}`}
          >
            {Icon && <Icon size={15} className="shrink-0" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
