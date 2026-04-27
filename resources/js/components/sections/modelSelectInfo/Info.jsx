const scheduleLabels = {
  day: 'День',
  night: 'Ночь',
  any: 'Любое время',
}

function Row({ label, value, last }) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 w-full">
        <h1 className="text-black text-base/[100%] font-medium">{label}</h1>
        <h2 className="text-[#7F7F7F] text-base/[100%] font-medium">{value ?? '—'}</h2>
      </div>
      {!last && <div className="px-5"><div className="h-[1px] w-full bg-black/5 rounded-full" /></div>}
    </>
  )
}

export default function Info({ model }) {
  if (!model) return null

  return (
    <div className="flex flex-col gap-6 w-full container pb-20">
      <div className="flex flex-col gap-2.5 py-1 bg-[#EFEEF3] w-full rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4 w-full">
        <h1 className="text-black text-base/[100%] font-medium">Возраст</h1>
        <h2 className="text-[#7F7F7F] text-base/[100%] font-medium">{model.age ? `${model.age} лет` : '—'}</h2>
      </div>
      </div>

      {/* Physical info */}
      <div className="flex flex-col gap-2.5 py-1 bg-[#EFEEF3] w-full rounded-2xl">

        <Row label="Рост" value={model.height_cm ? `${model.height_cm} см` : '—'} />
        <Row label="Вес" value={model.weight_kg ? `${model.weight_kg} кг` : '—'} />
        <Row label="Размер попы" value={model.butt_size ?? '—'} />
        <Row label="Размер груди" value={model.bust_size ?? '—'} last />
      </div>

      <div className="flex items-center justify-between p-5 bg-[#EFEEF3] w-full rounded-xl">
        <h1 className="text-black text-base/[100%] font-medium">График</h1>
        <h2 className="text-[#7F7F7F] text-base/[100%] font-medium">
          {scheduleLabels[model.schedule] ?? model.schedule ?? '—'}
        </h2>
      </div>
    </div>
  )
}
