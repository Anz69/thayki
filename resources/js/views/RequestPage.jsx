import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { buildLeadMessage } from '@/utils/leadMessage'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import CitySelect from '@/components/ui/CitySelect'
import ru from '@/locales/ru.json'

// field → { group (locale ns), labelKey, option keys }. The Russian label is
// sent to the backend so managers always read requests in Russian.
const GROUPS = [
  { field: 'hairType', group: 'hair',    labelKey: 'hairType', keys: ['any', 'blonde', 'brunette', 'brown', 'red'] },
  { field: 'ageRange', group: 'ages',    labelKey: 'age',      keys: ['a1', 'a2', 'a3', 'a4'] },
  { field: 'height',   group: 'heights', labelKey: 'height',   keys: ['any', 'upTo165', 'h165_175', 'over175'] },
  { field: 'goal',     group: 'goals',   labelKey: 'goal',     keys: ['date', 'pastime', 'leisure', 'travel', 'events', 'wife', 'undecided'] },
]

function Chips({ group, keys, value, onChange, t }) {
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((key) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(active ? null : key)}
            className={[
              'px-3.5 py-2.5 rounded-full text-[13px]/[100%] font-medium transition-all duration-200 active:scale-95',
              active
                ? 'bg-[#E2319B] text-white shadow-[0_6px_16px_rgba(226,49,155,0.28)]'
                : 'bg-white text-black border border-black/5 active:bg-[#F0EFF4]',
            ].join(' ')}
          >
            {t(`request.${group}.${key}`)}
          </button>
        )
      })}
    </div>
  )
}

export default function RequestPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()

  const [params] = useSearchParams()
  const modelId = params.get('model')
  // The flow is decided by the URL param immediately (not after the fetch), so
  // the page never first renders the generic form and then swaps.
  const isModelFlow = !!modelId

  const [model, setModel] = useState(null)
  const [city, setCity] = useState('')
  const [values, setValues] = useState({ hairType: null, ageRange: null, height: null, goal: null })
  const [wishes, setWishes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const rootRef = useRef(null)
  const canSubmit = city.trim().length > 0 && !submitting

  // When opened from a prototype ("Интересует этот типаж") — load it to show
  // the selected model and attach it to the lead.
  useEffect(() => {
    if (!modelId) { setModel(null); return undefined }
    let cancelled = false
    api.get(`/catalog/models/${modelId}`)
      .then((r) => { if (!cancelled) setModel(r?.data?.data ?? null) })
      .catch(() => { if (!cancelled) setModel(null) })
    return () => { cancelled = true }
  }, [modelId])

  const modelPhoto = (() => {
    const photos = Array.isArray(model?.photos) ? model.photos.filter(Boolean) : []
    const main = photos.find((p) => p?.is_main) ?? photos[0]
    return main?.url ? resolveMediaUrl(main.url) : null
  })()

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    gsap.fromTo(els, { y: 22, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.55,
        stagger: 0.07,
        ease: 'power3.out',
        // Clear the leftover transform so each card stops being its own
        // stacking context — otherwise the city dropdown gets trapped behind
        // the cards that follow it in the DOM.
        onComplete: () => gsap.set(els, { clearProps: 'transform,willChange' }),
      })
  })

  const setVal = (field, v) => setValues((p) => ({ ...p, [field]: v }))

  // On focus, lift the active field to the top of the scroll area so it (and the
  // next field below it) stay visible above the on-screen keyboard.
  const scrollFieldIntoView = (e) => {
    const card = e.currentTarget
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
  }
  const ruLabel = (group, key) => (key ? ru.request[group]?.[key] ?? key : null)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/leads', {
        model_profile_id: isModelFlow ? Number(modelId) : null,
        city: city.trim(),
        wishes: wishes.trim() || null,
        locale: (i18n.language || 'ru').startsWith('en') ? 'en' : 'ru',
        hair_type: isModelFlow ? null : ruLabel('hair', values.hairType),
        age_range: isModelFlow ? null : ruLabel('ages', values.ageRange),
        height_range: isModelFlow ? null : ruLabel('heights', values.height),
        goal: isModelFlow ? null : ruLabel('goals', values.goal),
        // First chat message in the user's selected language (RU/EN).
        message: buildLeadMessage({
          t,
          modelName: model ? modelName(model) : undefined,
          city: city.trim(),
          wishes,
          options: isModelFlow ? {} : { hair: values.hairType, ages: values.ageRange, heights: values.height, goals: values.goal },
        }),
      }, { headers: { 'Idempotency-Key': `lead-${Date.now()}` } })
      const from = encodeURIComponent(isModelFlow ? `/model/${modelId}` : '/home')
      navigate(`/request/chat?id=${data.data?.chat_id}&lead=${data.data?.lead_id}&from=${from}`, { replace: true })
    } catch (err) {
      logError(err)
      setSubmitting(false)
    }
  }

  return (
    <main ref={rootRef} className="flex flex-col min-h-screen bg-[#FAFAFB]">
      <header className="w-full py-4 bg-[#FAFAFB]/90 backdrop-blur-xs sticky top-0 z-50">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate(-1)}
            className="px-2.5 py-3 bg-[#EFEEF3] text-black text-base/[80%] font-medium active:bg-[#E0DEDF] transition-colors duration-200 cursor-pointer rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            {t('request.title')}
          </span>
        </div>
      </header>

      <div className="container flex flex-col gap-4 pt-3 pb-40">
        {/* Selected prototype (when arriving from «Интересует этот типаж») */}
        {isModelFlow && (
          <div data-anim className="flex items-center gap-3.5 rounded-2xl p-3 bg-white border-[1.5px] border-[#E2319B]/35">
            <div className="size-16 rounded-2xl overflow-hidden bg-[#F4EEF1] shrink-0">
              {modelPhoto
                ? <img src={modelPhoto} alt="" className="w-full h-full object-cover object-top" />
                : <div className="w-full h-full bg-[#F0E6EC] animate-pulse" />}
            </div>
            <div className="flex flex-col min-w-0 gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[#E2319B] text-[11px]/[100%] font-semibold uppercase tracking-[0.04em]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#E2319B" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {t('request.interested')}
              </span>
              {model
                ? (
                  <span className="text-black text-[18px]/[110%] font-bold truncate">
                    {modelName(model)}{model.age ? `, ${model.age}` : ''}
                  </span>
                )
                : <div className="h-[18px] w-32 rounded-md bg-[#EFE6EC] animate-pulse" />}
            </div>
          </div>
        )}

        {/* City — required, prominent */}
        <div
          data-anim
          onFocusCapture={scrollFieldIntoView}
          style={{ scrollMarginTop: 80 }}
          className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 border border-black/5"
        >
          <p className="text-black text-[15px]/[100%] font-semibold">
            {t('request.city')} <span className="text-[#E2319B]">*</span>
          </p>
          <CitySelect value={city} onChange={setCity} placeholder={t('request.cityPlaceholder')} inline overlay autoDetect />
        </div>

        {/* Option groups — only for the open "подбор" form, not the prototype flow */}
        {!isModelFlow && GROUPS.map(({ field, group, labelKey, keys }) => (
          <div key={field} data-anim className="flex flex-col gap-3 bg-white rounded-2xl p-4 border border-black/5">
            <p className="text-black text-[15px]/[100%] font-semibold">{t(`request.${labelKey}`)}</p>
            <Chips group={group} keys={keys} value={values[field]} onChange={(v) => setVal(field, v)} t={t} />
          </div>
        ))}

        {/* Wishes */}
        <div
          data-anim
          onFocusCapture={scrollFieldIntoView}
          style={{ scrollMarginTop: 80 }}
          className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 border border-black/5"
        >
          <p className="text-black text-[15px]/[100%] font-semibold">{isModelFlow ? t('request.wishesExtra') : t('request.wishes')}</p>
          <textarea
            value={wishes}
            onChange={(e) => setWishes(e.target.value)}
            rows={4}
            placeholder={t('request.wishesPlaceholder')}
            className="w-full bg-[#F5F5F7] rounded-xl px-4 py-3.5 text-black text-[15px] outline-none placeholder:text-[#ABABAB] resize-none focus:ring-2 focus:ring-[#E2319B]/30 transition-shadow"
          />
        </div>
      </div>

      {/* Submit bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 z-40 bg-gradient-to-t from-[#FAFAFB] via-[#FAFAFB] to-transparent pt-8"
        style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 16px))' }}
      >
        <div className="container flex flex-col items-center gap-2">
          <span
            className="text-[#ABABAB] text-xs/[100%] font-medium select-none transition-all duration-300 ease-out"
            style={{
              opacity: !canSubmit && !submitting ? 1 : 0,
              transform: !canSubmit && !submitting ? 'translateY(0)' : 'translateY(6px)',
              height: 12,
            }}
          >
            {t('request.cityRequiredHint')}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              'w-full py-4 rounded-full text-base/[100%] font-semibold transition-all duration-200 active:scale-[0.98]',
              canSubmit
                ? 'bg-[#E2319B] text-white active:opacity-80 shadow-[0_8px_24px_rgba(226,49,155,0.32)]'
                : 'bg-[#ECECEC] text-[#BDBDBD] cursor-not-allowed',
            ].join(' ')}
          >
            {submitting ? t('request.submitting') : t('request.submit')}
          </button>
        </div>
      </div>
    </main>
  )
}
