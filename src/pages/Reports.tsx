import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DirectoryRow, Payment, PaymentAllocation, User } from '../types/database';
import { dirMap, listAllAllocations, listPayments, usersMap } from '../lib/api';
import { formatDate, formatPaymentNo, formatUAH } from '../constants/domain';
import { PaymentModal } from '../components/payments/PaymentModal';
import { ListBanner } from '../components/ui/ListBanner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField, TextInput } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';

interface AllocRow {
  allocId: string;
  bankId: string;
  bankName: string;
  payment: Payment;
  allocAmount: number;
  paidAt: string | null;
  sharePct: number; // яку частку платежу проведено через цей банк
}

interface BankGroup {
  id: string;
  name: string;
  sum: number;
  count: number;
  rows: AllocRow[];
}

export function Reports() {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment>>({});
  const [banks, setBanks] = useState<Record<string, DirectoryRow>>({});
  const [companies, setCompanies] = useState<Record<string, DirectoryRow>>({});
  const [forms, setForms] = useState<Record<string, DirectoryRow>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [invoiceQ, setInvoiceQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Payment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, pList, b, c, f, u] = await Promise.all([
        listAllAllocations(),
        listPayments(),
        dirMap('banks'),
        dirMap('payer_companies'),
        dirMap('payment_forms'),
        usersMap(),
      ]);
      setAllocations(a);
      setPayments(Object.fromEntries(pList.map((p) => [p.id, p])));
      setBanks(b);
      setCompanies(c);
      setForms(f);
      setUsers(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const userName = (id: string | null) =>
    id ? users[id]?.full_name || users[id]?.email || '—' : '—';
  const companyName = (p: Payment) =>
    p.payer_company_id ? companies[p.payer_company_id]?.name ?? '' : '';

  const { groups, total } = useMemo(() => {
    const inRange = (paidAt: string | null): boolean => {
      const d = paidAt ? paidAt.slice(0, 10) : '';
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      return true;
    };

    const iq = invoiceQ.trim().toLowerCase();
    const acc: Record<string, BankGroup> = {};
    for (const a of allocations) {
      const payment = payments[a.payment_id];
      if (!payment) continue;
      // Лише фактично оплачені заявки (розбивка по банках зʼявляється вже після
      // оплати, у стані 'allocated'; неоплачені або ще нерозподілені сюди не потраплять).
      if (!payment.paid_at) continue;
      if (!inRange(payment.paid_at)) continue;
      if (iq && !(payment.invoice_number || '').toLowerCase().includes(iq)) continue;
      const amount = Number(a.amount);
      const name = banks[a.bank_id]?.name ?? 'Невідомий банк';
      if (!acc[a.bank_id]) acc[a.bank_id] = { id: a.bank_id, name, sum: 0, count: 0, rows: [] };
      acc[a.bank_id].sum += amount;
      acc[a.bank_id].count += 1;
      acc[a.bank_id].rows.push({
        allocId: a.id,
        bankId: a.bank_id,
        bankName: name,
        payment,
        allocAmount: amount,
        paidAt: payment.paid_at,
        sharePct: payment.amount ? (amount / Number(payment.amount)) * 100 : 0,
      });
    }
    const list = Object.values(acc).sort((x, y) => y.sum - x.sum);
    for (const g of list) {
      g.rows.sort((x, y) => (y.paidAt ?? '').localeCompare(x.paidAt ?? ''));
    }
    const t = list.reduce((s, r) => s + r.sum, 0);
    return { groups: list, total: t };
  }, [allocations, payments, banks, from, to, invoiceQ]);

  const anyPaid = useMemo(
    () => allocations.some((a) => payments[a.payment_id]?.paid_at != null),
    [allocations, payments]
  );

  const max = groups.length ? groups[0].sum : 0;
  const periodLabel = from || to ? `${from || '…'} — ${to || '…'}` : 'весь час';

  const exportBank = (g: BankGroup) => {
    const data = g.rows.map((r) => ({
      '№': formatPaymentNo(r.payment.number),
      'Дата оплати': formatDate(r.paidAt),
      Призначення: r.payment.purpose ?? '',
      Підприємство: companyName(r.payment),
      Замовник: userName(r.payment.author_id),
      'Сума в банку, ₴': r.allocAmount,
      'Сума платежу, ₴': Number(r.payment.amount),
      'Частка, %': Math.round(r.sharePct * 10) / 10,
    }));
    data.push({
      '№': '',
      'Дата оплати': '',
      Призначення: '',
      Підприємство: '',
      Замовник: 'РАЗОМ',
      'Сума в банку, ₴': g.sum,
      'Сума платежу, ₴': '' as unknown as number,
      'Частка, %': '' as unknown as number,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оплати');
    const safe = g.name.replace(/[^\wа-яіїєґА-ЯІЇЄҐ.-]+/gi, '_');
    const period = from || to ? `_${from || 'x'}_${to || 'x'}` : '';
    XLSX.writeFile(wb, `Оплати_${safe}${period}.xlsx`);
  };

  const setThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    setFrom(`${y}-${m}-01`);
    setTo(`${y}-${m}-${String(last).padStart(2, '0')}`);
  };
  const clearPeriod = () => {
    setFrom('');
    setTo('');
    setInvoiceQ('');
  };

  return (
    <div className="max-w-4xl space-y-5">
      <ListBanner
        title="Звіти"
        subtitle="Скільки грошей проведено через кожен банк (за оплаченими заявками). Період — за датою оплати."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
          <FormField label="Період з" htmlFor="rep-from">
            <TextInput
              id="rep-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to || undefined}
            />
          </FormField>
          </div>
          <div className="w-40">
          <FormField label="по" htmlFor="rep-to">
            <TextInput
              id="rep-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from || undefined}
            />
          </FormField>
          </div>
          <div className="w-56">
          <FormField label="Номер рахунку" htmlFor="rep-invoice">
            <TextInput
              id="rep-invoice"
              value={invoiceQ}
              onChange={(e) => setInvoiceQ(e.target.value)}
              placeholder="Пошук за № рахунку…"
            />
          </FormField>
          </div>
          <Button variant="outline" onClick={setThisMonth}>
            Цей місяць
          </Button>
          {(from || to || invoiceQ) && (
            <Button variant="ghost" onClick={clearPeriod}>
              Очистити
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="text-gray-500">Завантаження...</div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-gray-500">
          {!anyPaid ? 'Ще немає проведених оплат.' : 'За вибраними фільтрами оплат немає.'}
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="bg-brand-600 text-white rounded-xl shadow-sm p-5">
            <div className="text-xs uppercase tracking-wide text-brand-100">
              Усього проведено · {periodLabel}
            </div>
            <div className="text-3xl font-bold tabular-nums mt-1">{formatUAH(total)}</div>
          </div>

          <div className="space-y-2">
            {groups.map((g) => {
              const isOpen = open[g.id];
              return (
                <Card key={g.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <button
                        onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                        className="flex items-center gap-1.5 font-semibold text-gray-900 hover:text-brand-700 transition-colors"
                      >
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {g.name}
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold tabular-nums text-gray-900">{formatUAH(g.sum)}</div>
                          <div className="text-xs text-gray-400">
                            {g.count} {g.count === 1 ? 'оплата' : 'оплат'} · {total ? Math.round((g.sum / total) * 100) : 0}%
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => exportBank(g)} title="Експорт у Excel">
                          <Download size={15} />
                          Excel
                        </Button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${max ? (g.sum / max) * 100 : 0}%` }} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {g.rows.map((r) => (
                        <button
                          key={r.allocId}
                          onClick={() => setSelected(r.payment)}
                          className="w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50/40 hover:bg-brand-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="brand" className="font-mono">
                                {formatPaymentNo(r.payment.number)}
                              </Badge>
                              <span className="text-gray-400 text-xs">{formatDate(r.paidAt)}</span>
                            </div>
                            <div className="text-sm text-gray-800 truncate mt-1">
                              {r.payment.purpose || companyName(r.payment) || 'Заявка'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold tabular-nums text-gray-900">{formatUAH(r.allocAmount)}</div>
                            <div className="text-[11px] text-gray-400 tabular-nums">
                              частка {Math.round(r.sharePct)}% · платіж {formatUAH(Number(r.payment.amount))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <PaymentModal
          payment={selected}
          users={users}
          companies={companies}
          forms={forms}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
