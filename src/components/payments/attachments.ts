import { useEffect, useState } from 'react';
import { PaymentAttachment } from '../../types/database';
import { attachmentUrl } from '../../lib/api';

export const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic'];
export type FileKind = 'image' | 'pdf' | 'other';

export const fileKind = (name: string): FileKind => {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
};

export interface Preview {
  url: string;
  downloadUrl: string;
  name: string;
  kind: 'image' | 'pdf';
  loading: boolean;
}

/** Керує оверлеєм перегляду. Файл тягнеться як blob, щоб обійти
 *  X-Frame-Options/CSP self-hosted Supabase, які блокують вбудовування PDF. */
export function useFilePreview(onError?: (msg: string) => void) {
  const [preview, setPreview] = useState<Preview | null>(null);

  const closePreview = () => {
    setPreview((p) => {
      if (p?.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
      return null;
    });
  };

  const openFile = async (a: PaymentAttachment) => {
    const kind = fileKind(a.name || a.path);
    try {
      const url = await attachmentUrl(a.path);
      if (kind === 'other') {
        window.open(url, '_blank', 'noopener');
        return;
      }
      setPreview({ url, downloadUrl: url, name: a.name || 'Файл', kind, loading: true });
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPreview((p) => (p && p.downloadUrl === url ? { ...p, url: objectUrl, loading: false } : p));
      } catch {
        setPreview((p) => (p && p.downloadUrl === url ? { ...p, loading: false } : p));
      }
    } catch (err) {
      onError?.((err as Error).message);
    }
  };

  return { preview, openFile, closePreview };
}

/** Підвантажує signed URL для картинок, щоб показати мініатюри. */
export function useThumbnails(attachments: PaymentAttachment[]): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const imgs = attachments.filter((a) => fileKind(a.name || a.path) === 'image' && !thumbs[a.id]);
      if (imgs.length === 0) return;
      const entries = await Promise.all(
        imgs.map(async (a) => {
          try {
            return [a.id, await attachmentUrl(a.path)] as const;
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) {
        const fresh = Object.fromEntries(entries.filter(Boolean) as (readonly [string, string])[]);
        setThumbs((prev) => ({ ...prev, ...fresh }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  return thumbs;
}
