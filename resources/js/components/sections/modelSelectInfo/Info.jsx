import { useTranslation } from 'react-i18next'
import { declAge } from '@/utils/datetime'
import { localizeEyes } from '@/utils/modelValues'

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
  const { t, i18n } = useTranslation()
  if (!model) return null

  const cm = (v) => (v ? `${v} ${t('modelInfo.cm')}` : '—')

  return (
    <div className="flex flex-col gap-6 w-full container pb-20">
      <div className="flex flex-col gap-2.5 py-1 bg-[#EFEEF3] w-full rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 w-full">
          <h1 className="text-black text-base/[100%] font-medium">{t('modelInfo.age')}</h1>
          <h2 className="text-[#7F7F7F] text-base/[100%] font-medium">{declAge(model.age)}</h2>
        </div>
      </div>

      {/* Physical info */}
      <div className="flex flex-col gap-2.5 py-1 bg-[#EFEEF3] w-full rounded-2xl">
        <Row label={t('modelInfo.height')}     value={cm(model.height_cm)} />
        <Row label={t('modelInfo.bust')}       value={cm(model.bust_cm)} />
        <Row label={t('modelInfo.waist')}      value={cm(model.waist_cm)} />
        <Row label={t('modelInfo.hips')}       value={cm(model.hips_cm)} />
        <Row label={t('modelInfo.breastSize')} value={model.breast_size ?? '—'} />
        <Row label={t('modelInfo.eyes')}       value={localizeEyes(model.eyes, i18n.language) ?? '—'} last />
      </div>
    </div>
  )
}
