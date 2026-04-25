import { useState } from 'react'
import { useCompactMode } from '@/composables/useCompactMode'

export default function WaitingPaymentStep({
  screenRef,
  avatarRef,
  headRef,
  subRef,
  clientAvatarUrl,
  clientName,
}) {
  const isCompact = useCompactMode()
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = !!clientAvatarUrl && !imgFailed

  return (
    <div
      ref={screenRef}
      className={`flex flex-col items-center container min-h-screen justify-center ${isCompact ? 'gap-4' : 'gap-7'}`}
    >
      <div
        ref={avatarRef}
        className={`rounded-full overflow-hidden shrink-0 ${isCompact ? 'w-24 h-24' : 'w-32 h-32'} ${showImg ? '' : 'bg-[#7B5BFF] flex items-center justify-center'}`}
      >
        {showImg ? (
          <img
            src={clientAvatarUrl}
            alt="client"
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-white text-4xl font-bold">
            {(clientName ?? '?')[0]?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headRef} className="text-black text-[24px]/[120%] font-[500]">
          Ожидание оплаты от клиента
        </h2>
        <p ref={subRef} className="text-[#7F7F7F] text-base/[140%] font-medium max-w-[260px]">
          Все готово для встречи, теперь подождите пока клиент оплатит вашу встречу
        </p>
      </div>
    </div>
  )
}
