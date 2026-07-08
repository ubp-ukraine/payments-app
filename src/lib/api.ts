import { supabase } from './supabase';
import {
  Bank,
  Payment,
  PaymentAllocation,
  PaymentComment,
  PaymentStatus,
  User,
  UserRole,
} from '../types/database';

// ── Users ────────────────────────────────────────────────────────────────────
export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function usersMap(): Promise<Record<string, User>> {
  const users = await listUsers();
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('users').update({ role }).eq('id', id);
  if (error) throw error;
}

// ── Banks ────────────────────────────────────────────────────────────────────
export async function listBanks(activeOnly = false): Promise<Bank[]> {
  let query = supabase.from('banks').select('*').order('created_at', { ascending: true });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createBank(name: string, accountNo: string | null): Promise<void> {
  const { error } = await supabase.from('banks').insert({ name, account_no: accountNo });
  if (error) throw error;
}

export async function updateBank(id: string, patch: Partial<Bank>): Promise<void> {
  const { error } = await supabase.from('banks').update(patch).eq('id', id);
  if (error) throw error;
}

// ── Payments ─────────────────────────────────────────────────────────────────
export interface NewPaymentInput {
  recipient: string;
  amount: number;
  payment_form: string;
  pay_date: string | null;
  purpose: string | null;
}

export async function listPayments(status?: PaymentStatus): Promise<Payment[]> {
  let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listMyPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(authorId: string, input: NewPaymentInput): Promise<void> {
  const { error } = await supabase.from('payments').insert({
    author_id: authorId,
    recipient: input.recipient,
    amount: input.amount,
    payment_form: input.payment_form,
    pay_date: input.pay_date,
    purpose: input.purpose,
    status: 'pending',
  });
  if (error) throw error;
}

export async function approvePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').update({ status: 'approved' }).eq('id', id);
  if (error) throw error;
}

export async function rejectPayment(id: string, comment: string, authorId: string): Promise<void> {
  const { error } = await supabase.from('payments').update({ status: 'rejected' }).eq('id', id);
  if (error) throw error;
  await addComment(id, authorId, comment);
}

export async function resubmitPayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').update({ status: 'pending' }).eq('id', id);
  if (error) throw error;
}

export interface AllocationInput {
  bank_id: string;
  amount: number;
}

/** Split the payment across banks, then mark it paid. */
export async function payPayment(id: string, allocations: AllocationInput[]): Promise<void> {
  const rows = allocations
    .filter((a) => a.amount > 0)
    .map((a) => ({ payment_id: id, bank_id: a.bank_id, amount: a.amount }));
  if (rows.length) {
    const { error: allocErr } = await supabase.from('payment_allocations').insert(rows);
    if (allocErr) throw allocErr;
  }
  const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('id', id);
  if (error) throw error;
}

// ── Allocations & comments ───────────────────────────────────────────────────
export async function listAllocations(paymentId: string): Promise<PaymentAllocation[]> {
  const { data, error } = await supabase
    .from('payment_allocations')
    .select('*')
    .eq('payment_id', paymentId);
  if (error) throw error;
  return data ?? [];
}

export async function listComments(paymentId: string): Promise<PaymentComment[]> {
  const { data, error } = await supabase
    .from('payment_comments')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(paymentId: string, authorId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('payment_comments')
    .insert({ payment_id: paymentId, author_id: authorId, text });
  if (error) throw error;
}
