import {
  FileText,
  PlusCircle,
  ShieldCheck,
  CreditCard,
  ClipboardList,
  Landmark,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PaymentStatus, UserRole } from '../types/database';

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

export const PAYMENT_FORMS = ['Безготівка', 'Готівка', 'Картка'] as const;

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
export type View = 'my' | 'new' | 'approve' | 'pay' | 'register' | 'banks' | 'users';

export interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV: NavItem[] = [
  { view: 'my', label: 'Мої заявки', icon: FileText, roles: ['zamovnyk', 'buhgalter', 'admin', 'fin_director'] },
  { view: 'new', label: 'Нова заявка', icon: PlusCircle, roles: ['zamovnyk', 'buhgalter', 'admin', 'fin_director'] },
  { view: 'approve', label: 'Погодження', icon: ShieldCheck, roles: ['admin', 'fin_director'] },
  { view: 'pay', label: 'До оплати', icon: CreditCard, roles: ['buhgalter', 'admin'] },
  { view: 'register', label: 'Реєстр оплат', icon: ClipboardList, roles: ['buhgalter', 'admin', 'fin_director'] },
  { view: 'banks', label: 'Банки', icon: Landmark, roles: ['admin'] },
  { view: 'users', label: 'Користувачі', icon: Users, roles: ['admin'] },
];

export function navForRole(role: UserRole | null): NavItem[] {
  if (!role) return [];
  return NAV.filter((item) => item.roles.includes(role));
}

export function defaultView(role: UserRole | null): View {
  if (role === 'admin' || role === 'fin_director') return 'approve';
  if (role === 'buhgalter') return 'pay';
  return 'my';
}
