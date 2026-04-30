import { useCompactMode } from '@/composables/useCompactMode'
import LazyImg from '@/components/ui/LazyImg'

const PayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.1731 4.219C17.0921 4.16846 16.9996 4.13936 16.9043 4.13444C16.809 4.12952 16.714 4.14894 16.6282 4.19088C13.6097 5.66744 11.4539 4.97557 9.17508 4.24572C6.77813 3.48283 4.30313 2.69182 0.878203 4.36385C0.783616 4.41003 0.703885 4.48182 0.648075 4.57107C0.592266 4.66032 0.562617 4.76343 0.5625 4.86869V13.3013C0.562487 13.3967 0.586757 13.4906 0.633026 13.5741C0.679296 13.6575 0.746044 13.7279 0.826987 13.7784C0.907931 13.829 1.00041 13.8581 1.09572 13.8631C1.19103 13.8681 1.28603 13.8487 1.3718 13.8068C4.39031 12.3303 6.54609 13.0221 8.82844 13.752C10.1813 14.1844 11.5594 14.6253 13.1175 14.6253C14.3191 14.6253 15.6298 14.3637 17.119 13.6367C17.2136 13.5905 17.2933 13.5187 17.3491 13.4294C17.4049 13.3402 17.4346 13.2371 17.4347 13.1318V4.69924C17.4355 4.60355 17.412 4.50923 17.3662 4.4252C17.3204 4.34116 17.254 4.27019 17.1731 4.219ZM3.375 10.6878C3.375 10.8369 3.31574 10.98 3.21025 11.0855C3.10476 11.191 2.96168 11.2503 2.8125 11.2503C2.66332 11.2503 2.52024 11.191 2.41475 11.0855C2.30926 10.98 2.25 10.8369 2.25 10.6878V6.18775C2.25 6.03857 2.30926 5.89549 2.41475 5.79001C2.52024 5.68452 2.66332 5.62525 2.8125 5.62525C2.96168 5.62525 3.10476 5.68452 3.21025 5.79001C3.31574 5.89549 3.375 6.03857 3.375 6.18775V10.6878ZM9 11.2503C8.55499 11.2503 8.11998 11.1183 7.74997 10.8711C7.37996 10.6238 7.09157 10.2724 6.92127 9.86129C6.75097 9.45016 6.70642 8.99776 6.79323 8.5613C6.88005 8.12484 7.09434 7.72393 7.40901 7.40926C7.72368 7.09459 8.12459 6.8803 8.56105 6.79349C8.99751 6.70667 9.4499 6.75123 9.86104 6.92152C10.2722 7.09182 10.6236 7.38021 10.8708 7.75022C11.118 8.12023 11.25 8.55524 11.25 9.00025C11.25 9.59699 11.0129 10.1693 10.591 10.5912C10.169 11.0132 9.59674 11.2503 9 11.2503ZM15.75 11.8128C15.75 11.9619 15.6907 12.105 15.5852 12.2105C15.4798 12.316 15.3367 12.3753 15.1875 12.3753C15.0383 12.3753 14.8952 12.316 14.7898 12.2105C14.6843 12.105 14.625 11.9619 14.625 11.8128V7.31275C14.625 7.16357 14.6843 7.02049 14.7898 6.91501C14.8952 6.80952 15.0383 6.75025 15.1875 6.75025C15.3367 6.75025 15.4798 6.80952 15.5852 6.91501C15.6907 7.02049 15.75 7.16357 15.75 7.31275V11.8128Z" fill="white" />
  </svg>
)

export default function AcceptedStep({
  screenRef,
  avatarRef,
  headRef,
  subRef,
  payBtnRef,
  onPayment,
  modelAvatarUrl,
  modelName,
}) {
  const isCompact = useCompactMode()

  return (
    <div
      ref={screenRef}
      className={`flex flex-col items-center container h-full justify-center min-h-full ${isCompact ? 'gap-4' : 'gap-7'}`}
    >
      <div ref={avatarRef} className={`rounded-full shrink-0 overflow-hidden ${isCompact ? 'w-24 h-24' : 'w-32 h-32'}`}>
        {modelAvatarUrl ? (
          <LazyImg src={modelAvatarUrl} alt="model" className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-[#E2319B] flex items-center justify-center">
            <span className="text-white text-4xl font-bold">{(modelName ?? '?')[0]?.toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headRef} className="text-black text-2xl/[100%] font-medium max-w-[260px]">
          Ваша модель приняла запрос на встречу
        </h2>
        <p ref={subRef} className="text-[#7F7F7F] text-base/[100%] font-medium">
          Все готово для встречи, теперь все за вами
        </p>
      </div>
      <button
        ref={payBtnRef}
        onClick={onPayment}
        className="flex items-center gap-2.5 bg-[#E2319B] text-white p-4.5 rounded-full text-base/[100%] font-medium active:scale-[0.96] transition-transform duration-100 will-change-transform shadow-[0_4px_20px_rgba(226,49,155,0.35)]"
      >
        <PayIcon />
        Оплатить встречу
      </button>
    </div>
  )
}
