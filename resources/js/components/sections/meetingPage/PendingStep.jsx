import { useState } from 'react'
import { useCompactMode } from '@/composables/useCompactMode'

function DetailRow({ row, rowRef }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div ref={rowRef}>
      <div className="flex items-center justify-between">
        <span className="text-[#7F7F7F] text-base/[100%] font-medium">{row.label}</span>
        <div className="flex items-center gap-2">
          {row.hasAvatar && (
            row.avatarUrl && !imgFailed
              ? <img
                  src={row.avatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              : <div className="w-6 h-6 rounded-full bg-[#E2319B] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">{(row.value ?? '?')[0].toUpperCase()}</span>
                </div>
          )}
          <span className="text-black text-base/[100%] font-medium">{row.value}</span>
        </div>
      </div>
    </div>
  )
}

export default function PendingStep({
  screenRef,
  mascotRef,
  headRef,
  subRef,
  cardRef,
  cardRowsRef,
  detailRows,
}) {
  const isCompact = useCompactMode()

  return (
    <div
      ref={screenRef}
      className={`flex flex-col items-center container ${isCompact ? 'gap-3 pt-4 pb-10' : 'gap-6 pt-8 pb-36'}`}
    >
      <div className="translate-y-[30px]">
        <img
          ref={mascotRef}
          src="/img/timeMan.png"
          alt=""
          className={`object-contain select-none pointer-events-none ${isCompact ? 'w-32' : 'w-48'}`}
        />
      </div>
      <div className="flex flex-col items-center gap-2.5 text-center">
        <h2 ref={headRef} className="text-black text-2xl/[100%] font-medium">
          Ожидание ответа модели
        </h2>
        <p ref={subRef} className="text-[#7F7F7F] text-base/[100%] font-medium">
          Ваша модель уже едет встречаться с вами
        </p>
      </div>
      <div
        ref={cardRef}
        className={`w-full bg-[#EFEEF3] rounded-2xl overflow-hidden flex flex-col px-4 ${isCompact ? 'gap-2.5 py-3' : 'gap-4.5 py-6'}`}
      >
        <h3 className="text-black text-base/[100%] font-medium">Детали встречи</h3>
        {detailRows.map((row, i) => (
          <DetailRow key={row.label} row={row} rowRef={(el) => (cardRowsRef.current[i] = el)} />
        ))}
      </div>
    </div>
  )
}
