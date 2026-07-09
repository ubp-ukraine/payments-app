import { X } from 'lucide-react';
import { Preview } from './attachments';

export function FilePreviewOverlay({ preview, onClose }: { preview: Preview; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80 p-4" onClick={onClose}>
      <div className="flex items-center justify-between text-white mb-3 shrink-0">
        <span className="text-sm truncate max-w-[70%]">{preview.name}</span>
        <div className="flex items-center gap-3">
          <a
            href={preview.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm underline hover:text-brand-200"
          >
            Відкрити в новій вкладці
          </a>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Закрити">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {preview.loading ? (
          <span className="text-white/70 text-sm">Завантаження…</span>
        ) : preview.kind === 'image' ? (
          <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain rounded-lg" />
        ) : (
          <iframe src={preview.url} title={preview.name} className="w-full h-full bg-white rounded-lg" />
        )}
      </div>
    </div>
  );
}
