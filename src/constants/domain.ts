import { Wallet, BookOpen, Users, BarChart3, type LucideIcon } from 'lucide-react';
import { Importance, PaymentStatus, UserRole } from '../types/database';

export const ROLE_LABELS: Record<UserRole, string> = {
  zamovnyk: 'Замовник',
  buhgalter: 'Бухгалтер оплат',
  admin: 'Адміністратор',
  fin_director: 'Фін директор',
};

export const ROLE_ORDER: UserRole[] = ['zamovnyk', 'buhgalter', 'fin_director', 'admin'];

export interface StatusMeta {
  label: string;
  /** Tailwind classes for a pill */
  pill: string;
  dot: string;
}

export const STATUS_META: Record<PaymentStatus, StatusMeta> = {
  pending: {
    label: 'На погодженні',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Погоджено',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  paid: {
    label: 'Оплачено',
    pill: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  rejected: {
    label: 'Відхилено',
    pill: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
};

export const IMPORTANCE_OPTIONS: { value: Importance; label: string; className: string }[] = [
  { value: 'urgent', label: 'Терміново', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'today', label: 'Сьогодні', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'days_1_2', label: '1–2 дні', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'this_week', label: 'Цього тижня', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'this_month', label: 'Цього місяця', className: 'bg-gray-100 text-gray-600 border-gray-200' },
];

export const IMPORTANCE_LABELS: Record<Importance, string> = Object.fromEntries(
  IMPORTANCE_OPTIONS.map((o) => [o.value, o.label])
) as Record<Importance, string>;

export function formatUAH(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ₴';
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Views the app can show, gated by role. */
export type View = 'payments' | 'reports' | 'directories' | 'users';

export interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV: NavItem[] = [
  { view: 'payments', label: 'Оплати', icon: Wallet, roles: ['zamovnyk', 'buhgalter', 'admin', 'fin_director'] },
  { view: 'reports', label: 'Звіти', icon: BarChart3, roles: ['buhgalter', 'admin', 'fin_director'] },
  { view: 'directories', label: 'Довідники', icon: BookOpen, roles: ['admin'] },
  { view: 'users', label: 'Користувачі', icon: Users, roles: ['admin'] },
];

export function navForRole(role: UserRole | null): NavItem[] {
  if (!role) return [];
  return NAV.filter((item) => item.roles.includes(role));
}

export function defaultView(_role: UserRole | null): View {
  return 'payments';
}

export const STATUS_COLUMNS: { status: PaymentStatus; label: string; headerBg: string; color: string }[] = [
  { status: 'pending', label: 'На погодженні', headerBg: 'bg-amber-100', color: 'text-amber-700' },
  { status: 'approved', label: 'Погоджено · до оплати', headerBg: 'bg-blue-100', color: 'text-blue-700' },
  { status: 'paid', label: 'Оплачено', headerBg: 'bg-green-100', color: 'text-green-700' },
  { status: 'rejected', label: 'Відхилено', headerBg: 'bg-red-100', color: 'text-red-700' },
];
