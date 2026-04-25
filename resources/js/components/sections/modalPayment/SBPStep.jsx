export default function SBPStep({ onBack }) {
  return (
    <div className="flex flex-col gap-5 p-6 pt-2">
      <div className="flex flex-col items-center gap-2 text-center pt-1">
        <h2 className="text-black text-xl/[100%] font-semibold">Оплата через СБП</h2>
        <p className="text-[#7F7F7F] text-sm/[150%] font-medium">
          Вы будете перенаправлены на страницу оплаты.
          После оплаты вернитесь в приложение.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity">
          Далее
        </button>
        <button
          onClick={onBack}
          className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
        >
          Вернуться назад
        </button>
      </div>
    </div>
  )
}