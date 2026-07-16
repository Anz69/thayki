import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api, { extractErrorMessage } from '@/utils/api'
import useLeadsStore from '@/stores/useLeadsStore'
import useAuthStore from '@/stores/useAuthStore'
import ModalMiddle from '@/layout/ModalMiddle'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import CitySelect from '@/components/ui/CitySelect'
import RangeSlider from '@/components/ui/RangeSlider'
import LottieDiamond from '@/components/ui/LottieDiamond'
import VipModal from '@/components/modals/VipModal'
import ru from '@/locales/ru.json'

const BUST_SIZES = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6+']
const FIGURES = ['anorexic', 'slim', 'curvy', 'bodybuilder', 'fit', 'siliconeBeauty']
const HIPS = ['narrow', 'medium', 'wide']
const HAIRS = ['any', 'blonde', 'brunette', 'brown', 'red']
const EVENTS = ['oneTime', 'trip', 'relationship']

function requestTelegramContact() {
  return new Promise((resolve, reject) => {
    const tg = window.Telegram?.WebApp
    if (!tg?.requestContact) { reject(new Error('no-telegram')); return }
    try {
      tg.requestContact((ok, event) => {
        if (!ok) { reject(new Error('declined')); return }
        resolve(event?.responseUnsafe?.contact || event?.contact || null)
      })
    } catch (e) { reject(e) }
  })
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3.5 py-2.5 rounded-full text-[13px]/[100%] font-medium transition-all duration-200 active:scale-95',
        active
          ? 'bg-[#E2319B] text-white shadow-[0_6px_16px_rgba(226,49,155,0.28)]'
          : 'bg-white text-black border border-black/5 active:bg-[#F0EFF4]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Section({ title, required = true, children }) {
  return (
    <div data-anim className="flex flex-col gap-3 bg-white rounded-2xl p-4 border border-black/5">
      <p className="text-black text-[15px]/[100%] font-semibold">
        {title}{required && <span className="text-[#E2319B]"> *</span>}
      </p>
      {children}
    </div>
  )
}

export default function RequestPage() {
  const { t, i18n } = useTranslation()
  const navigate = useTransitionNavigate()

  const [params] = useSearchParams()
  const modelId = params.get('model')
  const isModelFlow = !!modelId

  const isEn = (i18n.language || '').toLowerCase().startsWith('en')

  const [model, setModel] = useState(null)
  const [city, setCity] = useState('')
  const [age, setAge] = useState({ from: 20, to: 30 })
  const [height, setHeight] = useState({ from: 160, to: 175 })
  const [bustType, setBustType] = useState(null)
  const [bustSize, setBustSize] = useState({ from: 2, to: 6 })
  const [weight, setWeight] = useState({ from: 50, to: 65 })
  const [figure, setFigure] = useState(null)
  const [hips, setHips] = useState(null)
  const [hair, setHair] = useState(null)
  const [eventType, setEventType] = useState(null)
  const [eventHours, setEventHours] = useState({ from: 2, to: 6 })
  const [tripDays, setTripDays] = useState({ from: 3, to: 7 })
  const [tripCity, setTripCity] = useState('')
  const [comments, setComments] = useState('')
  const [meetingDate, setMeetingDate] = useState(null)
  const [meetingTime, setMeetingTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyError, setVerifyError] = useState(null)
  const authUser = useAuthStore((s) => s.user)
  const patchUser = useAuthStore((s) => s.patchUser)
  const [vipOpen, setVipOpen] = useState(false)
  const [vipMode, setVipMode] = useState(false)

  const rootRef = useRef(null)
  const submitKeyRef = useRef(null)
  const vipBtnRef = useRef(null)
  const vipShineRef = useRef(null)
  const vipGlowRef = useRef(null)
  const vipSparkRef = useRef(null)
  const vipBadgeRef = useRef(null)
  const vipGemRef = useRef(null)

  const eventOk = eventType === 'oneTime' || eventType === 'relationship'
    || (eventType === 'trip' && tripCity.trim().length > 0)
  const paramsOk = !!bustType && !!hips && !!figure && !!hair && !!eventType && eventOk
  const allSelected = isModelFlow || paramsOk
  const meetingOk = !!meetingDate && !!meetingTime
  const canSubmit = city.trim().length > 0 && allSelected && meetingOk && !submitting
  const formHint = city.trim().length === 0
    ? t('request.cityRequiredHint')
    : (!allSelected ? t('request.allRequiredHint') : (!meetingOk ? t('request.meetingRequiredHint') : ''))

  // Next two weeks as day chips — "Сегодня / Завтра", then weekday + date.
  const dayOptions = useMemo(() => {
    const lang = i18n.language || 'ru'
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dow = i === 0 ? t('request.today') : (i === 1 ? t('request.tomorrow') : d.toLocaleDateString(lang, { weekday: 'short' }))
      return { value, dow, day: d.getDate(), mon: d.toLocaleDateString(lang, { month: 'short' }) }
    })
  }, [i18n.language, t])

  const meetingDayLabel = useMemo(() => {
    const o = dayOptions.find((x) => x.value === meetingDate)
    return o ? `${o.dow}, ${o.day} ${o.mon}` : ''
  }, [dayOptions, meetingDate])

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

  // Pre-hide the entry elements before first paint so the reveal animation never
  // flashes content at full opacity and then jumps to hidden (the janky stutter).
  useLayoutEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    if (els.length) gsap.set(els, { y: 22, autoAlpha: 0, willChange: 'transform,opacity' })
  }, [])

  usePageReady(() => {
    const els = rootRef.current?.querySelectorAll('[data-anim]') ?? []
    if (!els.length) return
    gsap.to(els, {
      y: 0,
      autoAlpha: 1,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power3.out',
      onComplete: () => gsap.set(els, { clearProps: 'transform,willChange' }),
    })
  })

  useEffect(() => {
    if (isModelFlow) return undefined
    const shine = vipShineRef.current
    const glow = vipGlowRef.current
    const spark = vipSparkRef.current
    const anims = []

    if (shine) {
      const sweep = gsap.timeline({ repeat: -1, repeatDelay: 3.6 })
      sweep.fromTo(shine, { xPercent: -220, opacity: 0 },
        { xPercent: 360, opacity: 1, duration: 1.1, ease: 'power2.inOut' })
        .to(shine, { opacity: 0, duration: 0.2 }, '-=0.2')
      anims.push(sweep)
    }
    if (glow) {
      gsap.set(glow, { autoAlpha: 0, y: 8, scale: 0.85 })
      const tl = gsap.timeline({ delay: 0.25 })
      tl.to(glow, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' })
        .to(glow, { autoAlpha: 0.55, scale: 0.92, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      anims.push(tl)
    }
    if (spark) {
      anims.push(gsap.to(spark, { scale: 0.7, rotate: 18, autoAlpha: 0.6, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
    }
    return () => anims.forEach((a) => a.kill())
  }, [isModelFlow])

  useEffect(() => {
    if (!vipMode) return undefined
    const badge = vipBadgeRef.current
    const gem = vipGemRef.current
    if (!badge) return undefined
    gsap.killTweensOf([badge, gem])
    gsap.fromTo(badge,
      { y: -12, autoAlpha: 0, scale: 0.96 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' })
    let float
    if (gem) {
      gsap.fromTo(gem, { scale: 0.3, rotate: -18 },
        { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.6)', delay: 0.12 })
      float = gsap.to(gem, { y: -3, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.7 })
    }
    return () => { gsap.killTweensOf([badge, gem]); float?.kill() }
  }, [vipMode])

  const cancelVip = () => {
    const el = vipBadgeRef.current
    if (!el) { setVipMode(false); return }
    gsap.killTweensOf(el)
    el.style.overflow = 'hidden'
    gsap.to(el, {
      autoAlpha: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, scale: 0.97, y: -6,
      duration: 0.34, ease: 'power2.inOut',
      onComplete: () => setVipMode(false),
    })
  }

  const scrollFieldIntoView = (e) => {
    const card = e.currentTarget
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
  }

  const U = (k) => t(`request.${k}`)
  const inch = (cm) => Math.round(cm / 2.54)
  const lb = (kg) => Math.round(kg * 2.2046)
  const fmtAge = (v) => `${v} ${U('unitYear')}`
  const fmtHeight = (v) => (isEn ? `${v} ${U('unitCm')} (${inch(v)}${U('unitInch')})` : `${v} ${U('unitCm')}`)
  const fmtWeight = (v) => (isEn ? `${v} ${U('unitKg')} (${lb(v)} ${U('unitLb')})` : `${v} ${U('unitKg')}`)
  const fmtHours = (v) => `${v} ${U('unitHour')}`
  const fmtDays = (v) => `${v} ${U('unitDay')}`
  const rangeAge = (a, b) => `${a}–${b} ${U('unitYear')}`
  const rangeHeight = (a, b) => (isEn ? `${a}–${b} ${U('unitCm')} (${inch(a)}–${inch(b)}${U('unitInch')})` : `${a}–${b} ${U('unitCm')}`)
  const rangeWeight = (a, b) => (isEn ? `${a}–${b} ${U('unitKg')} (${lb(a)}–${lb(b)} ${U('unitLb')})` : `${a}–${b} ${U('unitKg')}`)
  const rangeHours = (a, b) => `${a}–${b} ${U('unitHour')}`
  const rangeDays = (a, b) => `${a}–${b} ${U('unitDay')}`
  const sizeLabel = (s) => (s === '6+' ? U('size6plus') : s)
  const bustSizeStr = bustSize.from === bustSize.to
    ? sizeLabel(BUST_SIZES[bustSize.from])
    : `${sizeLabel(BUST_SIZES[bustSize.from])}–${sizeLabel(BUST_SIZES[bustSize.to])}`

  const heightRangeStr = isEn
    ? `${height.from}–${height.to} ${U('unitCm')} (${inch(height.from)}–${inch(height.to)}${U('unitInch')})`
    : `${height.from}–${height.to} ${U('unitCm')}`
  const weightRangeStr = isEn
    ? `${weight.from}–${weight.to} ${U('unitKg')} (${lb(weight.from)}–${lb(weight.to)} ${U('unitLb')})`
    : `${weight.from}–${weight.to} ${U('unitKg')}`

  const eventStr = () => {
    if (eventType === 'oneTime') return `${U('events.oneTime')} · ${eventHours.from}–${eventHours.to} ${U('unitHour')}`
    if (eventType === 'trip') return `${U('events.trip')} · ${tripDays.from}–${tripDays.to} ${U('unitDay')} · ${tripCity.trim()}`
    if (eventType === 'relationship') return U('events.relationship')
    return null
  }

  const buildMessage = () => {
    const rows = [[t('leadMsg.title'), null]]
    if (model) rows.push([t('leadMsg.interested'), modelName(model)])
    rows.push([t('leadMsg.city'), city.trim()])
    if (!isModelFlow) {
      rows.push([t('leadMsg.age'), `${age.from}–${age.to} ${U('unitYear')}`])
      rows.push([t('leadMsg.height'), heightRangeStr])
      rows.push([t('leadMsg.bust'), `${U(`bustTypes.${bustType}`)} · ${bustSizeStr}`])
      rows.push([t('leadMsg.hips'), U(`hipsTypes.${hips}`)])
      rows.push([t('leadMsg.weight'), weightRangeStr])
      rows.push([t('leadMsg.figure'), U(`figures.${figure}`)])
      rows.push([t('leadMsg.hair'), U(`hair.${hair}`)])
      rows.push([t('leadMsg.event'), eventStr()])
    }
    if (meetingDayLabel) rows.push([t('leadMsg.meetingDate'), meetingDayLabel])
    if (meetingTime) rows.push([t('leadMsg.meetingTime'), meetingTime])
    if (comments.trim()) rows.push([t('leadMsg.comments'), comments.trim()])

    const lines = rows.map(([label, value]) => (value == null ? label : `${label}: ${value}`))
    lines.splice(1, 0, '')
    return lines.join('\n')
  }

  const ruEventStr = () => {
    const e = ru.request.events
    if (eventType === 'oneTime') return `${e.oneTime} · ${eventHours.from}–${eventHours.to} ${ru.request.unitHour}`
    if (eventType === 'trip') return `${e.trip} · ${tripDays.from}–${tripDays.to} ${ru.request.unitDay} · ${tripCity.trim()}`
    return e.relationship
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    // "Select model" flow requires the client to be verified (shared contact) first.
    if (isModelFlow && authUser?.phone_verified === false) {
      setVerifyError(null)
      setVerifyOpen(true)
      return
    }
    doSubmit()
  }

  const doVerify = async () => {
    if (verifyBusy) return
    setVerifyBusy(true)
    setVerifyError(null)
    try {
      const c = await requestTelegramContact()
      if (!c?.phone_number) throw new Error('no-phone')
      await api.post('/me/verify-contact', { phone_number: c.phone_number })
      patchUser({ phone_verified: true })
      setVerifyOpen(false)
      doSubmit()
    } catch (e) {
      logError(e)
      setVerifyError(t('request.verifyFailed'))
    } finally {
      setVerifyBusy(false)
    }
  }

  const doSubmit = async () => {
    if (!canSubmit) return
    setSubmitError(null)
    setSubmitting(true)
    if (!submitKeyRef.current) submitKeyRef.current = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      let message = buildMessage()
      if (vipMode) message = `🌟 ${t('vip.title')}\n${message}`

      const base = {
        model_profile_id: isModelFlow ? Number(modelId) : null,
        city: city.trim(),
        meeting_date: meetingDate,
        meeting_time: meetingTime || null,
        wishes: comments.trim() || null,
        locale: (i18n.language || 'ru').toLowerCase().startsWith('ru')
          ? 'ru'
          : (isEn ? 'en' : 'zh'),
        message,
      }

      const typage = isModelFlow ? {} : {
        hair_type: ru.request.hair[hair],
        age_range: `${age.from}–${age.to} ${ru.request.unitYear}`,
        height_range: `${height.from}–${height.to} ${ru.request.unitCm}`,
        goal: vipMode ? 'V.I.P модели' : ruEventStr(),
        age_from: age.from,
        age_to: age.to,
        height_from: height.from,
        height_to: height.to,
        bust_type: bustType,
        bust_size: bustSizeStr,
        weight_from: weight.from,
        weight_to: weight.to,
        figure,
        hips,
        event_type: eventType === 'oneTime' ? 'one_time' : eventType,
        event_hours_from: eventType === 'oneTime' ? eventHours.from : null,
        event_hours_to: eventType === 'oneTime' ? eventHours.to : null,
        trip_days_from: eventType === 'trip' ? tripDays.from : null,
        trip_days_to: eventType === 'trip' ? tripDays.to : null,
        trip_city: eventType === 'trip' ? tripCity.trim() : null,
        trip_purpose: null,
      }

      const { data } = await api.post('/leads', { ...base, ...typage },
        { headers: { 'Idempotency-Key': submitKeyRef.current } })
      // Refresh the active-leads cache so the new request is already in "Ещё".
      try { useLeadsStore.getState().fetchActiveLeads() } catch {}
      const from = encodeURIComponent(isModelFlow ? `/model/${modelId}` : '/home')
      navigate(`/request/chat?id=${data.data?.chat_id}&lead=${data.data?.lead_id}&from=${from}`, { replace: true })
    } catch (err) {
      logError(err)
      setSubmitError(extractErrorMessage(err, t('request.submitError')))
      // Reset the idempotency key so a retry isn't deduped against the failed attempt.
      submitKeyRef.current = null
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
          {!isModelFlow && (
            <span className="ml-auto relative inline-flex">
              <span
                ref={vipGlowRef}
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -bottom-2 rounded-full pointer-events-none -z-10"
                style={{ width: '94%', height: 30, background: 'radial-gradient(ellipse at center, rgba(226,49,155,0.85), rgba(226,49,155,0) 70%)', filter: 'blur(9px)' }}
              />
            <button
              ref={vipBtnRef}
              onClick={() => setVipOpen(true)}
              className="relative flex items-center gap-1.5 pl-3.5 pr-4 py-2.5 rounded-full text-white active:scale-95 transition-transform"
              style={{ background: '#161616', boxShadow: '0 6px 14px rgba(0,0,0,0.18)' }}
            >
              <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <span
                  ref={vipShineRef}
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1/4 -skew-x-[20deg]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)', opacity: 0 }}
                />
              </span>
              <span className="relative z-10 inline-flex shrink-0">
                <LottieDiamond size={20} style={{ filter: 'sepia(0.55) saturate(2.6) hue-rotate(5deg) brightness(1.1) contrast(1.05)' }} />
              </span>
              <span
                className="relative z-10 text-sm/[80%] font-bold tracking-wide"
                style={{ background: 'linear-gradient(90deg, #A9791B 0%, #E9B84B 35%, #F8E08C 50%, #E9B84B 65%, #A9791B 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}
              >
                VIP
              </span>
              <svg ref={vipSparkRef} className="absolute -top-1.5 -right-1.5 w-4 h-4 z-10" viewBox="0 0 24 24" fill="#E2319B" aria-hidden>
                <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
              </svg>
            </button>
            </span>
          )}
        </div>
      </header>

      <div className="container flex flex-col gap-4 pt-3 pb-40">
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

        {!isModelFlow && vipMode && (
          <div
            ref={vipBadgeRef}
            className="relative flex items-center gap-3.5 rounded-2xl p-4 border border-[#E7C66B]/60 overflow-hidden"
            style={{ background: 'linear-gradient(120deg, #FFFDF6 0%, #FCF4DD 100%)' }}
          >
            <span
              ref={vipGemRef}
              className="shrink-0 size-11 flex items-center justify-center"
            >
              <LottieDiamond size={44} style={{ filter: 'sepia(0.55) saturate(2.6) hue-rotate(5deg) brightness(1.08) contrast(1.05) drop-shadow(0 4px 10px rgba(208,158,40,0.5))' }} />
            </span>

            <div className="flex-1 min-w-0 flex flex-col">
              <span className="flex items-center gap-1.5">
                <span
                  className="text-[16px]/[110%] font-extrabold tracking-wide"
                  style={{ background: 'linear-gradient(90deg, #A9791B 0%, #E9B84B 35%, #F8E08C 50%, #E9B84B 65%, #A9791B 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}
                >
                  {t('vip.button')}
                </span>
              </span>
              <span className="text-[#9A7B33] text-[13px]/[135%] mt-1">{t('vip.teaser')}</span>
            </div>
            <button
              type="button"
              onClick={cancelVip}
              aria-label={t('vip.cancel')}
              className="shrink-0 size-7 rounded-full bg-[#F3EACB] text-[#A9791B] flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <div data-anim className="flex items-start gap-3 rounded-2xl p-4 bg-[#FBF2F8] border border-[#E2319B]/15">
          <span className="shrink-0 mt-0.5 flex items-center justify-center size-9 rounded-full bg-[#E2319B]/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="#E2319B" strokeWidth="1.6" />
              <path d="M12 7v.5M11.2 10.5h1.1v6M10.6 16.5h2.8" stroke="#E2319B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-black text-[15px]/[110%] font-semibold">{t('request.priceTitle')}</p>
            <p className="text-[#7C7C82] text-[13px]/[140%] whitespace-pre-line">{t(vipMode ? 'request.priceInfoVip' : 'request.priceInfo')}</p>
          </div>
        </div>

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

        {!isModelFlow && (
          <>
            <Section title={t('request.age')}>
              <RangeSlider min={18} max={60} from={age.from} to={age.to}
                onChange={(f, to) => setAge({ from: f, to })} format={fmtAge} formatRange={rangeAge} />
            </Section>

            <Section title={t('request.height')}>
              <RangeSlider min={150} max={195} from={height.from} to={height.to}
                onChange={(f, to) => setHeight({ from: f, to })} format={fmtHeight} formatRange={rangeHeight} />
            </Section>

            <Section title={t('request.bust')}>
              <div className="flex flex-wrap gap-2">
                {['any', 'natural', 'silicone'].map((k) => (
                  <Chip key={k} active={bustType === k} onClick={() => setBustType(bustType === k ? null : k)}>
                    {t(`request.bustTypes.${k}`)}
                  </Chip>
                ))}
              </div>
              {bustType && (
                <>
                  <p className="text-[#9B9AA0] text-[12.5px]/[100%] font-medium mt-1.5 mb-1">{t('request.bustSizeLabel')}</p>
                  <RangeSlider min={0} max={BUST_SIZES.length - 1} from={bustSize.from} to={bustSize.to}
                    onChange={(f, to) => setBustSize({ from: f, to })}
                    format={(i) => sizeLabel(BUST_SIZES[i])}
                    formatRange={(f, to) => `${sizeLabel(BUST_SIZES[f])} – ${sizeLabel(BUST_SIZES[to])}`} />
                </>
              )}
            </Section>

            <Section title={t('request.hipsLabel')}>
              <div className="flex flex-wrap gap-2">
                {HIPS.map((k) => (
                  <Chip key={k} active={hips === k} onClick={() => setHips(hips === k ? null : k)}>
                    {t(`request.hipsTypes.${k}`)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={t('request.weight')}>
              <RangeSlider min={40} max={150} from={weight.from} to={weight.to}
                onChange={(f, to) => setWeight({ from: f, to })} format={fmtWeight} formatRange={rangeWeight} />
            </Section>

            <Section title={t('request.figure')}>
              <div className="flex flex-wrap gap-2">
                {FIGURES.map((k) => (
                  <Chip key={k} active={figure === k} onClick={() => setFigure(figure === k ? null : k)}>
                    {t(`request.figures.${k}`)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={t('request.hairLabel')}>
              <div className="flex flex-wrap gap-2">
                {HAIRS.map((k) => (
                  <Chip key={k} active={hair === k} onClick={() => setHair(hair === k ? null : k)}>
                    {t(`request.hair.${k}`)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={t('request.event')}>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map((k) => (
                  <Chip key={k} active={eventType === k} onClick={() => setEventType(eventType === k ? null : k)}>
                    {t(`request.events.${k}`)}
                  </Chip>
                ))}
              </div>

                {eventType === 'oneTime' && (
                  <div className="mt-1.5 rounded-xl bg-[#F8F7FA] p-3.5">
                    <p className="text-[#9B9AA0] text-[12.5px]/[100%] font-medium mb-2.5">{t('request.duration')}</p>
                    <RangeSlider min={1} max={24} from={eventHours.from} to={eventHours.to}
                      onChange={(f, to) => setEventHours({ from: f, to })} format={fmtHours} formatRange={rangeHours} />
                  </div>
                )}

                {eventType === 'trip' && (
                  <div className="mt-1.5 flex flex-col gap-3 rounded-xl bg-[#F8F7FA] p-3.5">
                    <div>
                      <p className="text-[#9B9AA0] text-[12.5px]/[100%] font-medium mb-2.5">{t('request.tripDaysLabel')}</p>
                      <RangeSlider min={1} max={30} from={tripDays.from} to={tripDays.to}
                        onChange={(f, to) => setTripDays({ from: f, to })} format={fmtDays} formatRange={rangeDays} />
                    </div>
                    <div onFocusCapture={scrollFieldIntoView} style={{ scrollMarginTop: 80 }}>
                      <p className="text-[#9B9AA0] text-[12.5px]/[100%] font-medium mb-2">
                        {t('request.tripCity')} <span className="text-[#E2319B]">*</span>
                      </p>
                      <CitySelect value={tripCity} onChange={setTripCity} placeholder={t('request.tripCityPlaceholder')} inline overlay />
                    </div>
                  </div>
                )}
              </Section>
          </>
        )}

        <div
          data-anim
          onFocusCapture={scrollFieldIntoView}
          style={{ scrollMarginTop: 80 }}
          className="flex flex-col gap-3 bg-white rounded-2xl p-4 border border-black/5"
        >
          <p className="text-black text-[15px]/[100%] font-semibold">
            {t('request.meetingDay')} <span className="text-[#E2319B]">*</span>
          </p>
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {dayOptions.map((d) => {
              const active = meetingDate === d.value
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setMeetingDate(active ? null : d.value)}
                  className={[
                    'shrink-0 w-[72px] flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-colors duration-200 active:scale-95',
                    active ? 'bg-[#E2319B]' : 'bg-[#F5F5F7]',
                  ].join(' ')}
                >
                  <span className={`w-full text-center truncate px-1 text-[10.5px]/[110%] font-medium ${active ? 'text-white/85' : 'text-[#9B9AA0]'}`}>{d.dow}</span>
                  <span className={`text-[16px]/[110%] font-bold ${active ? 'text-white' : 'text-black'}`}>{d.day}</span>
                  <span className={`w-full text-center truncate px-1 text-[10px]/[110%] ${active ? 'text-white/85' : 'text-[#9B9AA0]'}`}>{d.mon}</span>
                </button>
              )
            })}
          </div>

          <p className="text-black text-[15px]/[100%] font-semibold mt-1">
            {t('request.meetingTime')} <span className="text-[#E2319B]">*</span>
          </p>
          <input
            type="time"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            className="w-full bg-[#F5F5F7] rounded-xl px-4 py-3.5 text-black text-[15px] outline-none focus:ring-2 focus:ring-[#E2319B]/30 transition-shadow"
          />
        </div>

        <div
          data-anim
          onFocusCapture={scrollFieldIntoView}
          style={{ scrollMarginTop: 80 }}
          className="flex flex-col gap-2.5 bg-white rounded-2xl p-4 border border-black/5"
        >
          <p className="text-black text-[15px]/[100%] font-semibold">{t('request.comments')}</p>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder={t('request.commentsPlaceholder')}
            className="w-full bg-[#F5F5F7] rounded-xl px-4 py-3.5 text-black text-[15px] outline-none placeholder:text-[#ABABAB] resize-none focus:ring-2 focus:ring-[#E2319B]/30 transition-shadow"
          />
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-5 z-40 bg-gradient-to-t from-[#FAFAFB] via-[#FAFAFB] to-transparent pt-8"
        style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 16px))' }}
      >
        <div className="container flex flex-col items-center gap-2">
          <span
            className="text-[#ABABAB] text-xs/[100%] font-medium select-none transition-all duration-300 ease-out"
            style={{
              opacity: formHint && !submitting ? 1 : 0,
              transform: formHint && !submitting ? 'translateY(0)' : 'translateY(6px)',
              height: 12,
            }}
          >
            {formHint || t('request.cityRequiredHint')}
          </span>
          {submitError && (
            <span className="text-[#E2483B] text-[12.5px] font-medium text-center -mt-1">{submitError}</span>
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

      <VipModal
        isOpen={vipOpen}
        onClose={() => setVipOpen(false)}
        onContinue={() => { setVipMode(true); setVipOpen(false) }}
      />

      <ModalMiddle isOpen={verifyOpen} onClose={verifyBusy ? undefined : () => setVerifyOpen(false)}>
        <div className="flex flex-col gap-3.5 px-5 pt-1 pb-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="size-11 rounded-full bg-[#E9F0FF] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Z" stroke="#2F6BD8" strokeWidth="1.7" strokeLinejoin="round" /><path d="m8.5 12 2.2 2.2L15.5 9.5" stroke="#2F6BD8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h2 className="text-black text-[18px]/[120%] font-semibold">{t('leadChat.verifyTitle')}</h2>
            <p className="text-[#8A8A8A] text-[13px]/[135%] font-medium">{t('leadChat.verifySub')}</p>
            {verifyError && <p className="text-[#E5484D] text-[13px]/[135%] font-medium">{verifyError}</p>}
          </div>
          <button
            onClick={doVerify}
            disabled={verifyBusy}
            className="w-full py-3.5 rounded-full bg-[#2F6BD8] text-white text-[15px]/[100%] font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
          >
            {verifyBusy ? '…' : t('leadChat.verifyBtn')}
          </button>
        </div>
      </ModalMiddle>
    </main>
  )
}
