import { useState } from 'react'
import { useCompactMode } from '@/composables/useCompactMode'

export default function ConfirmedStep({
  screenRef,
  avatarRef,
  headRef,
  subRef,
  modelAvatarUrl,
  modelName,
  title = 'Бронирование подтверждено',
  subtitle = 'Все готово для встречи, обсудите адрес и т.д.',
}) {
  const isCompact = useCompactMode()
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = !!modelAvatarUrl && !imgFailed

  return (
    <div
      ref={screenRef}
      className={`flex flex-col items-center container h-full justify-center min-h-full ${isCompact ? 'gap-4' : 'gap-7'}`}
    >
      <div
        ref={avatarRef}
        className={`rounded-full overflow-hidden shrink-0 ${isCompact ? 'w-24 h-24' : 'w-32 h-32'} ${showImg ? '' : 'bg-[#E2319B] flex items-center justify-center'}`}
      >
        {showImg ? (
          <img
            src={modelAvatarUrl}
            alt="model"
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-white text-4xl font-bold">{(modelName ?? '?')[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headRef} className="text-black text-[24px]/[100%] font-medium">
          {title}
        </h2>
        <p ref={subRef} className="text-[#7F7F7F] text-base/[100%]">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
