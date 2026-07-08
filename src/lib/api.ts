import { supabase } from './supabase';
import {
  DirectoryRow,
  Importance,
  Payment,
  PaymentAllocation,
  PaymentAttachment,
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

// ── Directories (banks / payer_companies / payment_forms) ────────────────────
export type DirTable = 'banks' | 'payer_companies' | 'payment_forms';

export async function listDir(table: DirTable, activeOnly = false): Promise<DirectoryRow[]> {
  let query = supabase.from(table).select('id, name, is_active, created_at').order('created_at', {
    ascending: true,
  });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data as DirectoryRow[]) ?? [];
}

export async function dirMap(table: DirTable): Promise<Record<string, DirectoryRow>> {
  const rows = await listDir(table);
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

export async function createDir(table: DirTable, name: string): Promise<void> {
  const { error } = await supabase.from(table).insert({ name });
  if (error) throw error;
}

export async function toggleDir(table: DirTable, id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from(table).update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

// ── Payments ─────────────────────────────────────────────────────────────────
export interface NewPaymentInput {
  amount: number;
  payer_company_id: string | null;
  payment_form_id: string | null;
  importance: Importance | null;
  purpose: string;
}

export async function listPayments(status?: PaymentStatus): Promise<Payment[]> {
  let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(authorId: string, input: NewPaymentInput): Promise<string> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      author_id: authorId,
      amount: input.amount,
      payer_company_id: input.payer_company_id,
      payment_form_id: input.payment_form_id,
      importance: input.importance,
      purpose: input.purpose,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
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

// ── Allocations, comments, attachments ───────────────────────────────────────
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

const BUCKET = 'payment-files';

export async function uploadAttachment(paymentId: string, file: File): Promise<void> {
  const safe = file.name.replace(/[^\w.\-()]+/g, '_');
  const path = `${paymentId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  const { error: e2 } = await supabase
    .from('payment_attachments')
    .insert({ payment_id: paymentId, path, name: file.name });
  if (e2) throw e2;
}

export async function listAttachments(paymentId: string): Promise<PaymentAttachment[]> {
  const { data, error } = await supabase
    .from('payment_attachments')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}
