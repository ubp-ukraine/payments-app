interface TabItem {
  key: string;
  label: string;
  count?: number;
  color?: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? tab.color || 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                    isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
