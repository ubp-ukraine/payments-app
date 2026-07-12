import { useState } from 'react';
import { CheckCircle2, Wallet } from 'lucide-react';
import { NewPaymentModal } from '../components/payments/NewPaymentModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

/** Окрема сторінка подачі заявки за прямим посиланням (/new).
 *  Доступна лише авторизованим (гейт логіну — на рівні App). */
export function SubmitPayment({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900 leading-none block">Оплати</span>
          <span className="text-[11px] text-gray-400 leading-none">UBP Ukraine</span>
        </div>
      </div>

      {done ? (
        <Card className="p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Заявку надіслано</h1>
          <p className="text-gray-500 text-sm mb-6">Вона зʼявиться в колонці «На погодженні».</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setDone(false)}>
              Подати ще одну
            </Button>
            <Button variant="primary" onClick={onDone}>
              До оплат
            </Button>
          </div>
        </Card>
      ) : (
        <NewPaymentModal onClose={onDone} onCreated={() => setDone(true)} />
      )}
    </div>
  );
}
