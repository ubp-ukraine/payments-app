import { useState } from 'react';
import { CheckCircle2, Wallet } from 'lucide-react';
import { NewPaymentModal } from '../components/payments/NewPaymentModal';

/** Окрема сторінка подачі заявки за прямим посиланням (/new).
 *  Доступна лише авторизованим (гейт логіну — на рівні App). */
export function SubmitPayment({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900 leading-none block">Оплати</span>
          <span className="text-[11px] text-gray-400 leading-none">UBP Ukraine</span>
        </div>
      </div>

      {done ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Заявку надіслано</h1>
          <p className="text-gray-500 text-sm mb-6">Вона зʼявиться в колонці «На погодженні».</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setDone(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Подати ще одну
            </button>
            <button
              onClick={onDone}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              До оплат
            </button>
          </div>
        </div>
      ) : (
        <NewPaymentModal onClose={onDone} onCreated={() => setDone(true)} />
      )}
    </div>
  );
}
