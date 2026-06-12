import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import ModalMiddle from '@/layout/ModalMiddle'
import CopyableContacts from '@/components/ui/CopyableContacts'
import api, { extractErrorMessage } from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import CryptoAddressSheet from '@/components/modals/CryptoAddressSheet'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useModelPreview from '@/stores/useModelPreview'

const CURRENCIES = [
  { code: 'RUB', symbol: '₽' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
]
const currencySymbol = (code) => CURRENCIES.find((c) => c.code === code)?.symbol ?? code
const money = (minor, currency = 'RUB') => {
  const v = Math.round((minor || 0) / 100).toLocaleString()
  return `${currencySymbol(currency)} ${v}`
}

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

const onHWheel = (e) => {
  const el = e.currentTarget
  if (el.scrollWidth <= el.clientWidth) return
  el.scrollLeft += (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX)
}

export function TypedMessageCard({ msg, isManager, leadId, leadClosed = false, onPosted }) {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const setPreviewModel = useModelPreview((s) => s.setModel)
  const [busy, setBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const p = msg.payload || {}

  useEffect(() => {
    if (msg.type === 'model_card') import('@/views/ModelPage').catch(() => {})
  }, [msg.type])

  const openModel = (m) => { setPreviewModel(m); navigate('/model-view') }
  const side = msg.from === 'user' ? 'justify-end' : 'justify-start'

  if (msg.type === 'payment_request') {
    const confirmed = p.status === 'confirmed'
    const PAY_TTL_MS = 3 * 60 * 60 * 1000
    const expired = !confirmed && msg.createdAt
      && (Date.now() - new Date(msg.createdAt).getTime() > PAY_TTL_MS)
    return (
      <div data-msg className={`flex ${side} my-3 px-2`}>
        <div className="w-full max-w-[320px] rounded-2xl bg-white border border-black/[0.08] overflow-hidden">
          <div className="px-4 pt-3.5 pb-3 flex flex-col gap-1.5">
            <span className="text-[#9B9AA0] text-[12px] font-medium uppercase tracking-[0.08em]">{t('leadChat.payTitle')}</span>
            <span className="text-black text-[24px] leading-tight font-bold" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>{money(p.amount_minor, p.currency)}</span>
            {p.method !== 'crypto' && p.requisites && (
              <div className="mt-1 bg-[#F5F5F7] rounded-xl px-3 py-2.5">
                <span className="text-[#7F7F7F] text-[11px] font-medium">{t('leadChat.payRequisites')}</span>
                <p className="text-black text-[13px]/[150%] font-medium select-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><CopyableContacts text={p.requisites} /></p>
              </div>
            )}
            {p.method === 'crypto' && !confirmed && !isManager && !expired && (
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
            {p.method === 'crypto' && !confirmed && !isManager && expired && (
              <div className="mt-1.5 w-full py-2.5 rounded-xl bg-[#F0F0F0] text-[#9B9AA0] text-[14px] font-semibold text-center cursor-not-allowed select-none">
                {t('leadChat.payExpired')}
              </div>
            )}
            {p.method === 'crypto' && isManager && !confirmed && (
              <span className="mt-0.5 text-[#9B9AA0] text-[12px]">{t('leadChat.payCryptoHint')}</span>
            )}
          </div>
          {!isManager && p.method === 'crypto' && (
            <CryptoAddressSheet
              isOpen={payOpen}
              onClose={() => setPayOpen(false)}
              leadId={leadId}
              messageId={msg.id}
            />
          )}
          <div className={`px-4 py-2.5 text-center text-[13px] font-semibold ${confirmed ? 'bg-[#E6F5EA] text-[#1E9E4E]' : 'bg-[#FFF1DC] text-[#C77A12]'}`}>
            {confirmed ? t('leadChat.payConfirmed') : t('leadChat.payPending')}
          </div>
          {isManager && !confirmed && !leadClosed && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try { await api.post(`/manager/leads/${leadId}/payment-confirm`, { message_id: msg.id }, { headers: { 'Idempotency-Key': `payconf-${leadId}-${msg.id}` } }); onPosted?.() }
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
      <div data-msg className={`flex ${side} my-3 px-2 w-full`}>
        <div className="w-full max-w-[340px] flex flex-col gap-2">
          <span className="text-[#9B9AA0] text-[12px] font-medium px-1">{t('leadChat.modelsTitle', { n: models.length })}</span>
          <div onWheel={onHWheel} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {models.map((m, i) => {
              const photo = m.photo ? resolveMediaUrl(m.photo) : null
              return (
                <button key={m.id ?? i} onClick={() => openModel(m)} className="shrink-0 w-[120px] rounded-2xl overflow-hidden bg-white border border-black/[0.08] active:opacity-80 transition-opacity">
                  <div className="w-full h-[150px] bg-[#EFEAEE]">
                    {photo && <img src={photo} alt="" className="w-full h-full object-cover object-top" />}
                  </div>
                  <div className="px-2.5 py-2 text-left">
                    <p className="text-black text-[13px] font-semibold truncate">{modelName(m)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export function LeadActionMenu({ leadId, onPickMedia, onPosted }) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState(null)

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

function ParsedModelSheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [urls, setUrls] = useState('')
  const [drafts, setDrafts] = useState(null)
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(null)
  const [eta, setEta] = useState(null)
  const [overtime, setOvertime] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const swipeX = useRef(null)

  const reset = () => { setUrls(''); setDrafts(null); setIdx(0); setProgress(null); setEta(null); setOvertime(false); setErr(null) }

  useEffect(() => {
    if (!progress) { setOvertime(false); return undefined }
    const id = setInterval(() => setEta((e) => {
      if (e == null) return e
      if (e <= 1) { setOvertime(true); return 0 }
      return e - 1
    }), 1000)
    return () => clearInterval(id)
  }, [progress])

  const parse = async () => {
    const links = urls.split(/[\s,]+/).map((l) => l.trim()).filter((l) => l.includes('e100.club') || /\?p=/.test(l))
    if (!links.length || progress) return
    const EST_PER_LINK = 30
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
      const nextEta = done >= links.length ? null : Math.max(2, Math.round(avg * (links.length - done)))
      setEta(nextEta)
      if (nextEta != null) setOvertime(false)
    }
    setProgress(null); setEta(null); setOvertime(false)
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
                {overtime
                  ? ` · ${t('leadChat.parseAlmost')}`
                  : (eta != null && eta > 0 ? ` · ${t('leadChat.parseEta', { s: eta > 99 ? `~${Math.ceil(eta / 60)} ${t('leadChat.minShort')}` : `${eta} ${t('leadChat.secShort')}` })}` : '')}
              </span>
            )}
            <button disabled={!!progress || !urls.trim()} onClick={parse} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
              {progress ? t('leadChat.parsing') : t('leadChat.parseBtn')}
            </button>
          </>
        ) : (
          <>
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

function PaymentSheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [method, setMethod] = useState('manual')
  const [currency, setCurrency] = useState('RUB')
  const [amount, setAmount] = useState('')
  const [requisites, setRequisites] = useState('')
  const [busy, setBusy] = useState(false)
  const submitRef = useRef(null)

  const scrollToSubmit = (e) => {
    const sc = e.currentTarget.closest('.modal-middle-scroll')
    setTimeout(() => { if (sc) sc.scrollTop = sc.scrollHeight + 9999 }, 300)
  }

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
      <style>{`@keyframes pmSwap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div className="flex flex-col px-5 pt-1 pb-6 gap-3" onFocus={scrollToSubmit}>
        <h2 className="text-black text-lg font-bold">{t('leadChat.paySheetTitle')}</h2>

        <div className="relative grid grid-cols-2 bg-[#EFEEF3] rounded-full p-1">
          <span
            className="absolute top-1 bottom-1 left-1 rounded-full bg-[#E2319B] shadow-sm"
            style={{
              width: 'calc(50% - 4px)',
              transform: method === 'crypto' ? 'translateX(100%)' : 'translateX(0)',
              transition: 'transform 0.38s cubic-bezier(0.34,1.45,0.5,1)',
            }}
          />
          {[['manual', t('leadChat.payMethodManual')], ['crypto', t('leadChat.payMethodCrypto')]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMethod(k)}
              className="relative z-10 py-2 text-[13px] font-semibold transition-colors duration-200"
              style={{ color: method === k ? '#fff' : '#9B9AA0' }}
            >
              {label}
            </button>
          ))}
        </div>

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

        <div key={method} style={{ animation: 'pmSwap 0.32s cubic-bezier(0.22,1,0.36,1)' }}>
          {method === 'manual' ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[#9B9AA0] text-[13px]">{t('leadChat.payRequisites')}</span>
              <textarea value={requisites} onChange={(e) => setRequisites(e.target.value)} rows={3} placeholder={t('leadChat.payRequisitesPlaceholder')} className="bg-[#F5F5F7] rounded-xl px-4 py-3 text-black text-[15px] outline-none resize-none" />
            </label>
          ) : (
            <p className="text-[#9B9AA0] text-[13px]/[150%]">{t('leadChat.payCryptoSheetHint')}</p>
          )}
        </div>

        <button ref={submitRef} disabled={busy || !valid} onClick={submit} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
          {busy ? '…' : t('leadChat.paySend')}
        </button>
      </div>
    </ModalMiddle>
  )
}

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
