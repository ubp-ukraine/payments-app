import { ExternalLink, X } from 'lucide-react';
import { Preview } from './attachments';

export function FilePreviewOverlay({ preview, onClose }: { preview: Preview; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-slate-950/70 backdrop-blur-sm animate-fadeIn p-4"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-white mb-3 shrink-0">
        <span className="text-sm font-medium truncate max-w-[70%]">{preview.name}</span>
        <div className="flex items-center gap-2">
          <a
            href={preview.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-white hover:bg-white/10 transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <ExternalLink size={16} />
            Відкрити в новій вкладці
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-white/20"
            aria-label="Закрити"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div
        className="flex-1 min-h-0 flex items-center justify-center animate-modalIn"
        onClick={(e) => e.stopPropagation()}
      >
        {preview.loading ? (
          <span className="text-white/70 text-sm">Завантаження…</span>
        ) : preview.kind === 'image' ? (
          <img
            src={preview.url}
            alt={preview.name}
            className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]"
          />
        ) : (
          <iframe
            src={preview.url}
            title={preview.name}
            className="w-full h-full bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]"
          />
        )}
      </div>
    </div>
  );
}
