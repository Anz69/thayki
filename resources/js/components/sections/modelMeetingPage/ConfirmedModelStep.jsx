import { useState } from 'react'
import { useCompactMode } from '@/composables/useCompactMode'

function DetailRow({ row, rowRef }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div ref={rowRef}>
      <div className="flex items-center justify-between">
        <span className="text-[#7F7F7F] text-base/[100%] font-[500]">{row.label}</span>
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

export default function ConfirmedModelStep({
  screenRef,
  avatarRef,
  headRef,
  subRef,
  cardRef,
  cardRowsRef,
  detailRows,
  title = 'Бронирование подтверждено',
  subtitle = 'Клиент оплатил вашу встречу, теперь вы можете перейти в чат',
}) {
  const isCompact = useCompactMode()
  const [headerImgFailed, setHeaderImgFailed] = useState(false)

  const avatarRow = detailRows?.find(r => r.hasAvatar)
  const showHeaderImg = !!avatarRow?.avatarUrl && !headerImgFailed

  return (
    <div
      ref={screenRef}
      className={`flex flex-col items-center container min-h-screen justify-center ${isCompact ? 'gap-3' : 'gap-6'}`}
    >
      <div
        ref={avatarRef}
        className={`rounded-full overflow-hidden shrink-0 ${isCompact ? 'w-24 h-24' : 'w-32 h-32'} ${showHeaderImg ? '' : 'bg-[#E2319B] flex items-center justify-center'}`}
      >
        {showHeaderImg ? (
          <img
            src={avatarRow.avatarUrl}
            alt="client"
            className="w-full h-full object-cover"
            onError={() => setHeaderImgFailed(true)}
          />
        ) : (
          <span className="text-white text-4xl font-bold">
            {(avatarRow?.value ?? '?')[0]?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headRef} className="text-black text-[24px]/[120%] font-[500]">
          {title}
        </h2>
        <p ref={subRef} className="text-[#7F7F7F] text-sm/[140%] font-medium">
          {subtitle}
        </p>
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
