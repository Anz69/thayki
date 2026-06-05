import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import CitySelect from '@/components/ui/CitySelect'
import ru from '@/locales/ru.json'

// field → { group (locale ns), labelKey, option keys }. The Russian label is
// sent to the backend so managers always read requests in Russian.
const GROUPS = [
  { field: 'hairType', group: 'hair',    labelKey: 'hairType', keys: ['any', 'blonde', 'brunette', 'brown', 'red'] },
  { field: 'ageRange', group: 'ages',    labelKey: 'age',      keys: ['a1', 'a2', 'a3', 'a4'] },
  { field: 'height',   group: 'heights', labelKey: 'height',   keys: ['any', 'upTo165', 'h165_175', 'over175'] },
  { field: 'goal',     group: 'goals',   labelKey: 'goal',     keys: ['date', 'leisure', 'travel', 'events', 'wife', 'undecided'] },
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
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()

  const [city, setCity] = useState('')
  const [values, setValues] = useState({ hairType: null, ageRange: null, height: null, goal: null })
  const [wishes, setWishes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const rootRef = useRef(null)
  const canSubmit = city.trim().length > 0 && !submitting

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
  const ruLabel = (group, key) => (key ? ru.request[group]?.[key] ?? key : null)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/leads', {
        city: city.trim(),
        wishes: wishes.trim() || null,
        hair_type: ruLabel('hair', values.hairType),
        age_range: ruLabel('ages', values.ageRange),
        height_range: ruLabel('heights', values.height),
        goal: ruLabel('goals', values.goal),
      }, { headers: { 'Idempotency-Key': `lead-${Date.now()}` } })
      navigate(`/request/chat?id=${data.data?.chat_id}&lead=${data.data?.lead_id}`, { replace: true })
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
        {/* City — required, prominent */}
        <div data-anim className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-black text-[15px]/[100%] font-semibold">
            {t('request.city')} <span className="text-[#E2319B]">*</span>
          </p>
          <CitySelect value={city} onChange={setCity} placeholder={t('request.cityPlaceholder')} />
        </div>

        {/* Option groups */}
        {GROUPS.map(({ field, group, labelKey, keys }) => (
          <div key={field} data-anim className="flex flex-col gap-3 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-black text-[15px]/[100%] font-semibold">{t(`request.${labelKey}`)}</p>
            <Chips group={group} keys={keys} value={values[field]} onChange={(v) => setVal(field, v)} t={t} />
          </div>
        ))}

        {/* Wishes */}
        <div data-anim className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-black text-[15px]/[100%] font-semibold">{t('request.wishes')}</p>
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
          {!canSubmit && !submitting && (
            <span className="text-[#ABABAB] text-xs/[100%] font-medium">{t('request.cityRequiredHint')}</span>
          )}
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
