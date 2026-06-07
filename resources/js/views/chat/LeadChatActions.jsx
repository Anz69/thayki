import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import ModalMiddle from '@/layout/ModalMiddle'
import api, { extractErrorMessage } from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import { localizeEyes } from '@/utils/modelValues'
import ClientPaymentSheet from '@/components/modals/PaymentSheet'

/* Stylish inline video slide: poster + glassy play button, tap to play/pause. */
function VideoSlide({ url, poster }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }
  return (
    <div className="relative w-full h-full" onClick={toggle}>
      <video
        ref={ref}
        src={url}
        poster={poster}
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover bg-black"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${playing ? 'opacity-0' : 'opacity-100 bg-black/15'}`}>
        <span className="size-16 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center ring-1 ring-white/20">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </div>
    </div>
  )
}

const CURRENCIES = [
  { code: 'RUB', symbol: '₽' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'THB', symbol: '฿' },
]
const currencySymbol = (code) => CURRENCIES.find((c) => c.code === code)?.symbol ?? code
const money = (minor, currency = 'RUB') => {
  const v = Math.round((minor || 0) / 100).toLocaleString()
  return `${currencySymbol(currency)} ${v}`
}

/* ── Telegram contact request (identity verification) ───────────────────── */
function requestTelegramContact() {
  return new Promise((resolve, reject) => {
    const tg = window.Telegram?.WebApp
    if (!tg?.requestContact) { reject(new Error('no-telegram')); return }
    try {
      tg.requestContact((ok, event) => {
        if (!ok) { reject(new Error('declined')); return }
        const c = event?.responseUnsafe?.contact || event?.contact || null
        resolve(c)
      })
    } catch (e) { reject(e) }
  })
}

/* Lets a horizontal strip scroll with a vertical mouse wheel (desktop). */
const onHWheel = (e) => {
  const el = e.currentTarget
  if (el.scrollWidth <= el.clientWidth) return
  el.scrollLeft += (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX)
}

/* ═══════════════════════════════════════════════════════════════════════
   Typed message cards (payment / verification / model selection)
   ═══════════════════════════════════════════════════════════════════════ */
export function TypedMessageCard({ msg, isManager, leadId, onPosted }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [modelView, setModelView] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const p = msg.payload || {}
  // Typed cards sit on the sender's side, like normal messages.
  const side = msg.from === 'user' ? 'justify-end' : 'justify-start'

  if (msg.type === 'payment_request') {
    const confirmed = p.status === 'confirmed'
    return (
      <div data-msg className={`flex ${side} my-3 px-2`}>
        <div className="w-full max-w-[320px] rounded-2xl bg-white border border-black/[0.08] overflow-hidden">
          <div className="px-4 pt-3.5 pb-3 flex flex-col gap-1.5">
            <span className="text-[#9B9AA0] text-[12px] font-medium uppercase tracking-[0.08em]">{t('leadChat.payTitle')}</span>
            <span className="text-black text-[24px] leading-tight font-bold" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>{money(p.amount_minor, p.currency)}</span>
            {p.method !== 'crypto' && p.requisites && (
              <div className="mt-1 bg-[#F5F5F7] rounded-xl px-3 py-2.5">
                <span className="text-[#7F7F7F] text-[11px] font-medium">{t('leadChat.payRequisites')}</span>
                <p className="text-black text-[13px]/[150%] font-medium select-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.requisites}</p>
              </div>
            )}
            {p.method === 'crypto' && !confirmed && !isManager && (
              <button
                onClick={() => {
                  if (p.pay_url) { window.Telegram?.WebApp?.openLink ? window.Telegram.WebApp.openLink(p.pay_url) : window.open(p.pay_url, '_blank') }
                  else setPayOpen(true)
                }}
                className="mt-1.5 w-full py-2.5 rounded-xl bg-[#1B1B1B] text-white text-[14px] font-semibold active:opacity-80 transition-opacity"
              >
                {t('leadChat.payNow')}
              </button>
            )}
            {p.method === 'crypto' && isManager && !confirmed && (
              <span className="mt-0.5 text-[#9B9AA0] text-[12px]">{t('leadChat.payCryptoHint')}</span>
            )}
          </div>
          {!isManager && (
            <ClientPaymentSheet
              isOpen={payOpen}
              onClose={() => setPayOpen(false)}
              price={(p.amount_minor || 0) / 100}
              currency={p.currency || 'RUB'}
            />
          )}
          <div className={`px-4 py-2.5 text-center text-[13px] font-semibold ${confirmed ? 'bg-[#E6F5EA] text-[#1E9E4E]' : 'bg-[#FFF1DC] text-[#C77A12]'}`}>
            {confirmed ? t('leadChat.payConfirmed') : t('leadChat.payPending')}
          </div>
          {isManager && !confirmed && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try { await api.post(`/manager/leads/${leadId}/payment-confirm`, {}, { headers: { 'Idempotency-Key': `payconf-${leadId}-${msg.id}` } }); onPosted?.() }
                catch (e) { logError(e) } finally { setBusy(false) }
              }}
              className="w-full py-3 bg-[#E2319B] text-white text-[14px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
            >
              {busy ? '…' : t('leadChat.payConfirmBtn')}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (msg.type === 'verification_request') {
    const done = p.status === 'done'
    return (
      <div data-msg className={`flex ${side} my-3 px-2`}>
        <div className="w-full max-w-[320px] rounded-2xl bg-white border border-black/[0.08] overflow-hidden">
          <div className="px-4 pt-3.5 pb-3 flex items-center gap-2.5">
            <span className={`size-9 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-[#E6F5EA]' : 'bg-[#E9F0FF]'}`}>
              {done ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Z" stroke="#1E9E4E" strokeWidth="1.7" strokeLinejoin="round" /><path d="m8.5 12 2.2 2.2L15.5 9.5" stroke="#1E9E4E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Z" stroke="#2F6BD8" strokeWidth="1.7" strokeLinejoin="round" /><path d="m8.5 12 2.2 2.2L15.5 9.5" stroke="#2F6BD8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-black text-[14px] font-semibold">{t('leadChat.verifyTitle')}</span>
              <span className={`text-[12px] ${done ? 'text-[#1E9E4E] font-medium' : 'text-[#9B9AA0]'}`}>{done ? t('leadChat.verifyDone') : t('leadChat.verifySub')}</span>
            </div>
          </div>
          {!done && !isManager && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const c = await requestTelegramContact()
                  if (!c?.phone_number) throw new Error('no-phone')
                  await api.post(`/leads/${leadId}/verify-contact`, {
                    phone_number: c.phone_number,
                    first_name: c.first_name ?? null,
                    last_name: c.last_name ?? null,
                  }, { headers: { 'Idempotency-Key': `verify-${leadId}` } })
                  onPosted?.()
                } catch (e) { logError(e) } finally { setBusy(false) }
              }}
              className="w-full py-3 bg-[#2F6BD8] text-white text-[14px] font-semibold active:opacity-80 transition-opacity disabled:opacity-50"
            >
              {busy ? '…' : t('leadChat.verifyBtn')}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (msg.type === 'model_card') {
    const models = Array.isArray(p.models) ? p.models : []
    if (!models.length) return null
    return (
      <>
        <div data-msg className={`flex ${side} my-3 px-2 w-full`}>
          <div className="w-full max-w-[340px] flex flex-col gap-2">
            <span className="text-[#9B9AA0] text-[12px] font-medium px-1">{t('leadChat.modelsTitle', { n: models.length })}</span>
            <div onWheel={onHWheel} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {models.map((m, i) => {
                const photo = m.photo ? resolveMediaUrl(m.photo) : null
                return (
                  <button key={m.id ?? i} onClick={() => setModelView(m)} className="shrink-0 w-[120px] rounded-2xl overflow-hidden bg-white border border-black/[0.08] active:opacity-80 transition-opacity">
                    <div className="w-full h-[150px] bg-[#EFEAEE]">
                      {photo && <img src={photo} alt="" className="w-full h-full object-cover object-top" />}
                    </div>
                    <div className="px-2.5 py-2 text-left">
                      <p className="text-black text-[13px] font-semibold truncate">{modelName(m)}</p>
                      {m.age != null && <p className="text-[#9B9AA0] text-[11px]">{m.age}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <ModelDetailSheet model={modelView} onClose={() => setModelView(null)} />
      </>
    )
  }

  return null
}

/* Lightweight model detail sheet (photos + params) reused by the cards. */
function ModelDetailSheet({ model, onClose }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  useEffect(() => { if (model) { setData(model); setOpen(true) } }, [model])
  if (!data && !open) return null
  // Photos and videos in one swipeable carousel (photos first, then videos).
  const media = [
    ...(data?.photos ?? []).map((p) => resolveMediaUrl(p)).filter(Boolean).map((url) => ({ type: 'image', url })),
    ...(data?.videos ?? []).filter((v) => v?.url).map((v) => ({ type: 'video', url: resolveMediaUrl(v.url), poster: v.poster ? resolveMediaUrl(v.poster) : undefined })),
  ]
  const cm = (v) => (v ? `${v} ${t('modelInfo.cm')}` : null)
  const rows = data ? [
    [t('modelInfo.height'), cm(data.height_cm)],
    [t('modelInfo.bust'), cm(data.bust_cm)],
    [t('modelInfo.waist'), cm(data.waist_cm)],
    [t('modelInfo.hips'), cm(data.hips_cm)],
    [t('modelInfo.eyes'), localizeEyes(data.eyes, i18n.language)],
  ].filter(([, v]) => v) : []
  return (
    <ModalMiddle isOpen={open} onClose={() => { setOpen(false); onClose?.() }} onAfterClose={() => setData(null)}>
      {data && (
        <div className="flex flex-col px-5 pt-1 pb-6 gap-4" style={{ maxHeight: '84dvh', overflowY: 'auto' }}>
          <div className="flex items-center gap-2">
            <h2 className="text-black text-lg font-bold truncate">{modelName(data)}</h2>
            {data.age != null && <span className="text-[#9B9AA0] text-[14px] ml-auto">{data.age}</span>}
          </div>
          {media.length > 0 && (
            <Swiper
              modules={[Pagination]}
              slidesPerView={1}
              spaceBetween={12}
              grabCursor
              pagination={{ clickable: true, dynamicBullets: true }}
              className="model-media-swiper w-full rounded-2xl"
              style={{ '--swiper-pagination-color': '#E2319B', '--swiper-pagination-bottom': '10px' }}
            >
              {media.map((m, i) => (
                <SwiperSlide key={i}>
                  <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-[#EFEAEE]">
                    {m.type === 'video'
                      ? <VideoSlide url={m.url} poster={m.poster} />
                      : <img src={m.url} alt="" className="w-full h-full object-cover object-top" />}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
          {rows.length > 0 && (
            <div className="bg-[#F5F5F7] rounded-2xl px-4 py-1.5">
              {rows.map(([label, value], i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-black/[0.06] last:border-0">
                  <span className="text-[#9B9AA0] text-[13px]">{label}</span>
                  <span className="text-black text-[14px] font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          {data.description && (
            <p className="text-[#7F7F7F] text-[13px]/[160%] whitespace-pre-line">{data.description}</p>
          )}
        </div>
      )}
    </ModalMiddle>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Manager "+" attachment menu
   ═══════════════════════════════════════════════════════════════════════ */
export function LeadActionMenu({ leadId, onPickMedia, onPosted }) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState(null) // 'payment' | 'verify' | 'models' | 'link'

  const open = (which) => { setMenuOpen(false); setSheet(which) }

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="shrink-0 size-11 bg-[#EFEEF3] rounded-full flex items-center justify-center active:opacity-60 transition-opacity mr-3"
        aria-label={t('leadChat.actions')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>

      {/* Action chooser */}
      <ModalMiddle isOpen={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col px-4 pt-1 pb-6 gap-2">
          <MenuRow icon={ICONS.media} tint="#2F6BD8" label={t('leadChat.media')} onClick={() => { setMenuOpen(false); onPickMedia?.() }} />
          <MenuRow icon={ICONS.payment} tint="#1E9E4E" label={t('leadChat.payment')} onClick={() => open('payment')} />
          <MenuRow icon={ICONS.verify} tint="#C77A12" label={t('leadChat.verification')} onClick={() => open('verify')} />
          <MenuRow icon={ICONS.models} tint="#E2319B" label={t('leadChat.models')} onClick={() => open('link')} />
        </div>
      </ModalMiddle>

      <PaymentSheet open={sheet === 'payment'} onClose={() => setSheet(null)} leadId={leadId} onPosted={onPosted} />
      <VerifySheet open={sheet === 'verify'} onClose={() => setSheet(null)} leadId={leadId} onPosted={onPosted} />
      <ParsedModelSheet open={sheet === 'link'} onClose={() => setSheet(null)} leadId={leadId} onPosted={onPosted} />
    </>
  )
}

/* ── Parse external model links (e100.club) → sequential preview editor → send.
   Supports one or many links (one per line); bulk parsing runs sequentially
   with progress, then a card-by-card preview with nav/swipe. ─────────────── */
function ParsedModelSheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [urls, setUrls] = useState('')
  const [drafts, setDrafts] = useState(null)
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(null) // {done,total} while parsing
  const [eta, setEta] = useState(null) // estimated seconds remaining
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const swipeX = useRef(null)

  const reset = () => { setUrls(''); setDrafts(null); setIdx(0); setProgress(null); setEta(null); setErr(null) }

  // Live countdown between server responses.
  useEffect(() => {
    if (!progress) return undefined
    const id = setInterval(() => setEta((e) => (e == null ? e : Math.max(2, e - 1))), 1000)
    return () => clearInterval(id)
  }, [progress])

  const parse = async () => {
    const links = urls.split(/[\s,]+/).map((l) => l.trim()).filter((l) => l.includes('e100.club') || /\?p=/.test(l))
    if (!links.length || progress) return
    const EST_PER_LINK = 30 // seconds, rough first guess
    const startedAt = Date.now()
    setErr(null); setProgress({ done: 0, total: links.length }); setEta(links.length * EST_PER_LINK)
    const out = []
    let failed = 0
    let lastErr = null
    for (let i = 0; i < links.length; i++) {
      try {
        const { data } = await api.post(`/manager/leads/${leadId}/parse-model`, { url: links[i] }, { timeout: 120000 })
        out.push({ ...data.data, photos: data.data.photos ?? [], videos: data.data.videos ?? [] })
      } catch (e) { logError(e); failed++; lastErr = e }
      const done = i + 1
      const avg = (Date.now() - startedAt) / 1000 / done
      setProgress({ done, total: links.length })
      setEta(done >= links.length ? null : Math.max(2, Math.round(avg * (links.length - done))))
    }
    setProgress(null); setEta(null)
    // Surface the real server reason (envelope puts it under error.message).
    if (!out.length) { setErr(extractErrorMessage(lastErr, t('leadChat.parseError'))); return }
    if (failed) setErr(t('leadChat.parseSomeFailed', { n: failed }))
    setDrafts(out); setIdx(0)
  }

  const patch = (fn) => setDrafts((arr) => arr.map((d, j) => (j === idx ? fn(d) : d)))
  const setField = (k, v) => patch((d) => ({ ...d, [k]: v }))
  const removePhoto = (i) => patch((d) => ({ ...d, photos: d.photos.filter((_, j) => j !== i) }))
  const removeVideo = (i) => patch((d) => ({ ...d, videos: d.videos.filter((_, j) => j !== i) }))

  const go = (dir) => setIdx((i) => Math.min(drafts.length - 1, Math.max(0, i + dir)))
  const onSwipeStart = (e) => { swipeX.current = e.clientX }
  const onSwipeEnd = (e) => {
    if (swipeX.current == null) return
    const dx = e.clientX - swipeX.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    swipeX.current = null
  }

  const send = async () => {
    if (!drafts?.length || busy) return
    setBusy(true)
    try {
      await api.post(`/manager/leads/${leadId}/send-parsed`, { models: drafts })
      onPosted?.(); onClose(); reset()
    } catch (e) { logError(e) } finally { setBusy(false) }
  }

  const cur = drafts?.[idx]
  const numField = (k, label) => (
    <label className="flex flex-col gap-1">
      <span className="text-[#9B9AA0] text-[12px]">{label}</span>
      <input value={cur[k] ?? ''} onChange={(e) => setField(k, e.target.value.replace(/[^0-9]/g, '') || null)} inputMode="numeric" className="bg-[#F5F5F7] rounded-lg px-3 py-2 text-black text-[14px] font-medium outline-none" />
    </label>
  )

  return (
    <ModalMiddle isOpen={open} onClose={onClose} onAfterClose={reset}>
      <div className="flex flex-col px-5 pt-1 pb-6 gap-3" style={{ maxHeight: '82dvh' }}>
        {!drafts ? (
          <>
            <h2 className="text-black text-lg font-bold">{t('leadChat.linkSheetTitle')}</h2>
            <p className="text-[#9B9AA0] text-[13px]/[150%]">{t('leadChat.linkSheetHint')}</p>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              onFocus={(e) => { const el = e.target; setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320) }}
              rows={3}
              placeholder={'https://e100.club/?p=…\nhttps://e100.club/?p=…'}
              className="bg-[#F5F5F7] rounded-xl px-4 py-3 text-black text-[14px] outline-none resize-none"
            />
            {err && <span className="text-[#E2314C] text-[13px]">{err}</span>}
            {progress && (
              <span className="text-[#9B9AA0] text-[12px] text-center -mb-1">
                {t('leadChat.parsingN', { done: progress.done, total: progress.total })}
                {eta != null && ` · ${t('leadChat.parseEta', { s: eta > 99 ? `~${Math.ceil(eta / 60)} ${t('leadChat.minShort')}` : `${eta} ${t('leadChat.secShort')}` })}`}
              </span>
            )}
            <button disabled={!!progress || !urls.trim()} onClick={parse} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
              {progress ? t('leadChat.parsing') : t('leadChat.parseBtn')}
            </button>
          </>
        ) : (
          <>
            {/* Card navigation header (counter + arrows + swipe) */}
            <div
              className="flex items-center justify-between select-none"
              onPointerDown={onSwipeStart}
              onPointerUp={onSwipeEnd}
              style={{ touchAction: 'pan-y' }}
            >
              <button onClick={() => setDrafts(null)} className="text-[#9B9AA0] text-[13px] font-medium active:opacity-60">{t('common.back')}</button>
              <div className="flex items-center gap-3">
                <button disabled={idx === 0} onClick={() => go(-1)} className="size-7 rounded-full bg-[#EFEEF3] flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m14 6-6 6 6 6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <span className="text-black text-[14px] font-semibold tabular-nums">{idx + 1} / {drafts.length}</span>
                <button disabled={idx === drafts.length - 1} onClick={() => go(1)} className="size-7 rounded-full bg-[#EFEEF3] flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m10 6 6 6-6 6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: '60dvh' }}>
              {/* Photos with delete */}
              {cur.photos.length > 0 && (
                <div>
                  <span className="text-[#9B9AA0] text-[12px] mb-1 block">{t('leadChat.photosCount', { n: cur.photos.length })}</span>
                  <div onWheel={onHWheel} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {cur.photos.map((src, i) => (
                      <div key={i} className="relative shrink-0">
                        <img src={resolveMediaUrl(src)} alt="" className="h-[140px] w-[100px] rounded-xl object-cover object-top bg-[#EFEAEE]" />
                        <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 size-6 rounded-full bg-black/55 text-white flex items-center justify-center active:scale-90 transition-transform">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos with delete */}
              {cur.videos?.length > 0 && (
                <div>
                  <span className="text-[#9B9AA0] text-[12px] mb-1 block">{t('leadChat.videosCount', { n: cur.videos.length })}</span>
                  <div onWheel={onHWheel} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {cur.videos.map((v, i) => (
                      <div key={i} className="relative shrink-0 h-[80px] w-[110px] rounded-xl overflow-hidden bg-black/80 flex items-center justify-center">
                        {v.poster && <img src={resolveMediaUrl(v.poster)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
                        <svg className="relative" width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                        <button onClick={() => removeVideo(i)} className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-transform">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-[#9B9AA0] text-[12px]">{t('leadChat.fieldName')}</span>
                <input value={cur.display_name ?? ''} onChange={(e) => setField('display_name', e.target.value)} className="bg-[#F5F5F7] rounded-lg px-3 py-2 text-black text-[14px] font-medium outline-none" />
              </label>

              <div className="grid grid-cols-3 gap-2">
                {numField('age', t('modelInfo.age'))}
                {numField('height_cm', t('modelInfo.height'))}
                {numField('bust_cm', t('modelInfo.bust'))}
                {numField('waist_cm', t('modelInfo.waist'))}
                {numField('hips_cm', t('modelInfo.hips'))}
                <label className="flex flex-col gap-1">
                  <span className="text-[#9B9AA0] text-[12px]">{t('modelInfo.eyes')}</span>
                  <input value={cur.eyes ?? ''} onChange={(e) => setField('eyes', e.target.value)} className="bg-[#F5F5F7] rounded-lg px-3 py-2 text-black text-[14px] font-medium outline-none" />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[#9B9AA0] text-[12px]">{t('leadChat.fieldDesc')}</span>
                <textarea value={cur.description ?? ''} onChange={(e) => setField('description', e.target.value)} rows={2} className="bg-[#F5F5F7] rounded-lg px-3 py-2 text-black text-[14px] outline-none resize-none" />
              </label>
            </div>

            <button disabled={busy} onClick={send} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
              {busy ? '…' : t('leadChat.sendAll', { n: drafts.length })}
            </button>
          </>
        )}
      </div>
    </ModalMiddle>
  )
}

const ICONS = {
  media: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><circle cx="12" cy="12.5" r="3.2" /><path d="M8 6l1.2-2h5.6L16 6" /></>,
  payment: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><path d="M7 14.5h3" /></>,
  verify: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="8.5" cy="11" r="2" /><path d="M13.5 9.5h4M13.5 13h4M5.5 15.2c.4-1.3 1.6-2 3-2s2.6.7 3 2" /></>,
  models: <><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5" /></>,
  link: <><path d="M9.5 14.5l5-5M8 12l-1.6 1.6a3.1 3.1 0 0 0 4.4 4.4L12.5 16M16 12l1.6-1.6a3.1 3.1 0 0 0-4.4-4.4L11.5 8" /></>,
}

function MenuRow({ icon, label, tint = '#7F7F7F', onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 bg-[#F5F5F7] rounded-2xl px-3.5 py-3 active:bg-[#ECEAF0] transition-colors">
      <span className="size-9 rounded-full flex items-center justify-center shrink-0" style={{ background: tint + '1A' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span className="text-black text-[15px] font-medium">{label}</span>
      <svg className="ml-auto text-[#C4C4C4]" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}

/* ── Payment request: manual requisites or crypto button ─────────────── */
function PaymentSheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [method, setMethod] = useState('manual') // 'manual' | 'crypto'
  const [currency, setCurrency] = useState('RUB')
  const [amount, setAmount] = useState('')
  const [requisites, setRequisites] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => { setMethod('manual'); setCurrency('RUB'); setAmount(''); setRequisites('') }
  const valid = amount && (method === 'crypto' || requisites.trim())

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    try {
      await api.post(`/manager/leads/${leadId}/payment-request`, {
        amount: Number(amount),
        currency,
        method,
        requisites: method === 'manual' ? requisites.trim() : null,
      })
      onPosted?.(); onClose(); reset()
    } catch (e) { logError(e) } finally { setBusy(false) }
  }

  return (
    <ModalMiddle isOpen={open} onClose={onClose} onAfterClose={reset}>
      <div className="flex flex-col px-5 pt-1 pb-6 gap-3">
        <h2 className="text-black text-lg font-bold">{t('leadChat.paySheetTitle')}</h2>

        {/* Method toggle */}
        <div className="flex gap-1 bg-[#EFEEF3] rounded-full p-1">
          {[['manual', t('leadChat.payMethodManual')], ['crypto', t('leadChat.payMethodCrypto')]].map(([k, label]) => (
            <button key={k} onClick={() => setMethod(k)} className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-colors ${method === k ? 'bg-[#E2319B] text-white' : 'text-[#9B9AA0]'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Currency picker */}
        <div className="flex gap-1.5">
          {CURRENCIES.map((c) => (
            <button key={c.code} onClick={() => setCurrency(c.code)} className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${currency === c.code ? 'bg-[#1B1B1B] text-white' : 'bg-[#F5F5F7] text-[#7F7F7F]'}`}>
              {c.symbol} {c.code}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[#9B9AA0] text-[13px]">{t('leadChat.payAmount')}, {currencySymbol(currency)}</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="0"
            style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}
            className="bg-[#F5F5F7] rounded-xl px-4 py-3 text-black text-[16px] font-semibold outline-none"
          />
        </label>

        {method === 'manual' ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[#9B9AA0] text-[13px]">{t('leadChat.payRequisites')}</span>
            <textarea value={requisites} onChange={(e) => setRequisites(e.target.value)} rows={3} placeholder={t('leadChat.payRequisitesPlaceholder')} className="bg-[#F5F5F7] rounded-xl px-4 py-3 text-black text-[15px] outline-none resize-none" />
          </label>
        ) : (
          <p className="text-[#9B9AA0] text-[13px]/[150%]">{t('leadChat.payCryptoSheetHint')}</p>
        )}

        <button disabled={busy || !valid} onClick={submit} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
          {busy ? '…' : t('leadChat.paySend')}
        </button>
      </div>
    </ModalMiddle>
  )
}

/* ── Verification request confirm ────────────────────────────────────── */
function VerifySheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  return (
    <ModalMiddle isOpen={open} onClose={onClose}>
      <div className="flex flex-col px-5 pt-1 pb-6 gap-3">
        <h2 className="text-black text-lg font-bold">{t('leadChat.verifySheetTitle')}</h2>
        <p className="text-[#7F7F7F] text-[14px]/[150%]">{t('leadChat.verifySheetText')}</p>
        <button disabled={busy} onClick={async () => {
          setBusy(true)
          try { await api.post(`/manager/leads/${leadId}/verification-request`); onPosted?.(); onClose() }
          catch (e) { logError(e) } finally { setBusy(false) }
        }} className="w-full py-3.5 rounded-full bg-[#2F6BD8] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
          {busy ? '…' : t('leadChat.verifySheetBtn')}
        </button>
      </div>
    </ModalMiddle>
  )
}
