import { FormEvent, useEffect, useState } from 'react';
import { DirectoryRow } from '../../types/database';
import { createDir, DirTable, listDir, toggleDir } from '../../lib/api';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { FormField, TextInput } from '../ui/FormField';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InfoBanner } from '../ui/InfoBanner';

interface Props {
  table: DirTable;
  title: string;
  subtitle: string;
  placeholder: string;
}

export function DirectoryList({ table, title, subtitle, placeholder }: Props) {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listDir(table));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createDir(table, name.trim());
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: DirectoryRow) => {
    await toggleDir(table, r.id, !r.is_active);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="Назва" htmlFor={`dir-${table}`}>
              <TextInput
                id={`dir-${table}`}
                placeholder={placeholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={saving}>
            Додати
          </Button>
        </form>

        {error && <InfoBanner tone="danger">{error}</InfoBanner>}

        {loading ? (
          <div className="text-sm text-gray-500">Завантаження...</div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2"
              >
                <span
                  className={`flex-1 text-sm ${
                    r.is_active ? 'text-gray-900' : 'text-gray-400 line-through'
                  }`}
                >
                  {r.name}
                </span>
                <Badge variant={r.is_active ? 'success' : 'muted'}>
                  {r.is_active ? 'Активний' : 'Неактивний'}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => toggle(r)}>
                  {r.is_active ? 'Деактивувати' : 'Активувати'}
                </Button>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="text-sm text-gray-400">Порожньо</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
