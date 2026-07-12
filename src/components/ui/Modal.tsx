import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

// Widths wider than max-w-lg go full-screen on mobile.
const WIDE_WIDTHS = new Set([
  'max-w-xl',
  'max-w-2xl',
  'max-w-3xl',
  'max-w-4xl',
  'max-w-5xl',
  'max-w-6xl',
  'max-w-7xl',
  'max-w-full',
]);

export function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isWide = WIDE_WIDTHS.has(maxWidth);
  const mobileFull = isWide ? 'max-sm:h-full max-sm:rounded-none max-sm:mt-0 max-sm:mb-0' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full ${maxWidth} bg-white rounded-2xl mt-10 mb-10 animate-modalIn shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] ${mobileFull}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
