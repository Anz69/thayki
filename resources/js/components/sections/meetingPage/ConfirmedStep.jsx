import { useCompactMode } from '@/composables/useCompactMode'
import LazyImg from '@/components/ui/LazyImg'

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
