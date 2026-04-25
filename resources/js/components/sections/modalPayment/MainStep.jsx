import { THB_TO_RUB, CRYPTOS } from '@/constants/payments'
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M7 5L11 9L7 13" stroke="#C4C4C4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export default function MainStep({ price, onCrypto, onSBP }) {
  const rubAmount = Math.round(price * THB_TO_RUB)
  return (
    <div className="flex flex-col gap-5 p-6 pt-2">
      <div className="flex flex-col items-center gap-1.5 text-center pt-1">
        <h2 className="text-black text-xl/[100%] font-semibold">Оплата</h2>
        <p className="text-[#7F7F7F] text-sm/[140%] font-medium">
          Оплата подзаголовок. Оплата подзаголовок.
        </p>
      </div>
      <div className="bg-[#F5F5F7] rounded-2xl px-5 py-6 flex flex-col items-center gap-1.5">
        <span className="text-[#7F7F7F] text-sm/[100%] font-medium">К оплате</span>
        <span className="text-black text-[38px]/[100%] font-semibold tracking-tight">
          ฿ {price.toLocaleString()}
        </span>
        <span className="text-[#7F7F7F] text-sm/[100%] font-medium">
          ~ {rubAmount.toLocaleString()}₽
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={onCrypto}
          className="flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-3.5 active:bg-[#ECEAEC] transition-colors duration-150"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {CRYPTOS.map((c, i) => (
                <img
                  key={c.id} src={c.icon} alt={c.name}
                  className="w-7 h-7 object-cover"
                  style={{ zIndex: CRYPTOS.length - i }}
                />
              ))}
            </div>
            <span className="text-black text-base/[100%] font-medium">Криптовалюта</span>
          </div>
          <ChevronRight />
        </button>
        <button
          onClick={onSBP}
          className="flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-3.5 active:bg-[#ECEAEC] transition-colors duration-150"
        >
          <div className="flex items-center gap-3">
            <img src="/img/payments/spb.png" alt="СБП" className="w-7 h-7 object-contain" />
            <span className="text-black text-base/[100%] font-medium">СБП</span>
          </div>
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}