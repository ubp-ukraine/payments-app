import { DirectoryList } from '../components/directories/DirectoryList';

export function Directories() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Довідники</h1>
      <p className="text-gray-500 text-sm mb-5">Списки для форми заявки та розбивки оплат.</p>

      <div className="space-y-5">
        <DirectoryList
          table="payer_companies"
          title="Підприємства-платники"
          subtitle="Звідки йде оплата — вибір у формі заявки."
          placeholder="Назва підприємства"
        />
        <DirectoryList
          table="payment_forms"
          title="Форми оплати"
          subtitle="Напр. ПДВ, ФОП, Ф2 Картка, Імпорт $…"
          placeholder="Назва форми оплати"
        />
        <DirectoryList
          table="banks"
          title="Банки"
          subtitle="Рахунки, на які бухгалтер розкидає оплату."
          placeholder="Назва банку"
        />
      </div>
    </div>
  );
}
