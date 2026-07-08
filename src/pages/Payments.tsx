import { Wallet } from 'lucide-react';

export function Payments() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Оплати</h1>
      <p className="text-gray-500 mb-6">Стартова сторінка системи.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
          <Wallet className="w-7 h-7 text-brand-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Розділ у розробці</h2>
        <p className="text-gray-500 max-w-md">
          Тут з'явиться список оплат. Поки що це пустий каркас з авторизацією.
        </p>
      </div>
    </div>
  );
}
