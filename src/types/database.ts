export type UserRole = 'zamovnyk' | 'buhgalter' | 'admin' | 'fin_director';

export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export type Importance = 'urgent' | 'planned';

export interface DirectoryRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PaymentAttachment {
  id: string;
  payment_id: string;
  path: string;
  name: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole | null;
  created_at: string;
}

export interface Bank {
  id: string;
  name: string;
  account_no: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  author_id: string;
  recipient: string | null;
  amount: number;
  payment_form: string | null;
  payer_company_id: string | null;
  payment_form_id: string | null;
  importance: Importance | null;
  pay_date: string | null;
  purpose: string | null;
  status: PaymentStatus;
  approved_by: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  bank_id: string;
  amount: number;
  created_at: string;
}

export interface PaymentComment {
  id: string;
  payment_id: string;
  author_id: string;
  text: string;
  created_at: string;
}
