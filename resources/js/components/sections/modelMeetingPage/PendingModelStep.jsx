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

export default function PendingModelStep({
  screenRef,
  headRef,
  cardRef,
  cardRowsRef,
  detailRows,
}) {
  const isCompact = useCompactMode()

  return (
    <div
      ref={screenRef}
      className={`flex flex-col items-center justify-center container min-h-screen ${isCompact ? 'gap-3 pt-10 pb-10' : 'gap-6 pt-[72px] pb-[100px]'}`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headRef} className="text-black text-[24px]/[120%] font-[500]">
          Ожидание вашего ответа
        </h2>
      </div>
      <div
        ref={cardRef}
        className={`w-full bg-[#F5F5F7] rounded-2xl overflow-hidden flex flex-col px-4 ${isCompact ? 'gap-3 py-4' : 'gap-5 py-6'}`}
      >
        <h3 className="text-black text-base/[100%] font-[500]">Детали встречи</h3>
        {detailRows.map((row, i) => (
          <DetailRow key={row.label} row={row} rowRef={(el) => (cardRowsRef.current[i] = el)} />
        ))}
      </div>
    </div>
  )
}
