import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'
import { logError } from '@/utils/logger'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

const money = (minor, currency = 'THB') => {
  const v = Math.round((minor || 0) / 100).toLocaleString()
  if (currency === 'THB') return '฿ ' + v
  if (currency === 'USD') return '$ ' + v
  return `${v} ${currency}`
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

/* ═══════════════════════════════════════════════════════════════════════
   Typed message cards (payment / verification / model selection)
   ═══════════════════════════════════════════════════════════════════════ */
export function TypedMessageCard({ msg, isManager, leadId, onPosted }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [modelView, setModelView] = useState(null)
  const p = msg.payload || {}

  if (msg.type === 'payment_request') {
    const confirmed = p.status === 'confirmed'
    return (
      <div data-msg className="flex justify-center my-3 px-2">
        <div className="w-full max-w-[320px] rounded-2xl bg-white border border-black/[0.08] overflow-hidden">
          <div className="px-4 pt-3.5 pb-3 flex flex-col gap-1.5">
            <span className="text-[#9B9AA0] text-[12px] font-medium uppercase tracking-[0.08em]">{t('leadChat.payTitle')}</span>
            <span className="text-black text-[24px]/[100%] font-bold">{money(p.amount_minor, p.currency)}</span>
            {p.requisites && (
              <div className="mt-1 bg-[#F5F5F7] rounded-xl px-3 py-2.5">
                <span className="text-[#7F7F7F] text-[11px] font-medium">{t('leadChat.payRequisites')}</span>
                <p className="text-black text-[13px]/[150%] font-medium select-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.requisites}</p>
              </div>
            )}
          </div>
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
      <div data-msg className="flex justify-center my-3 px-2">
        <div className="w-full max-w-[320px] rounded-2xl bg-white border border-black/[0.08] overflow-hidden">
          <div className="px-4 pt-3.5 pb-3 flex items-center gap-2.5">
            <span className="size-9 rounded-full bg-[#E9F0FF] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Z" stroke="#2F6BD8" strokeWidth="1.7" strokeLinejoin="round" /><path d="m8.5 12 2.2 2.2L15.5 9.5" stroke="#2F6BD8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="flex flex-col">
              <span className="text-black text-[14px] font-semibold">{t('leadChat.verifyTitle')}</span>
              <span className="text-[#9B9AA0] text-[12px]">{done ? t('leadChat.verifyDone') : t('leadChat.verifySub')}</span>
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
          {done && (
            <div className="px-4 py-2.5 text-center text-[13px] font-semibold bg-[#E6F5EA] text-[#1E9E4E]">✅ {t('leadChat.verifyDone')}</div>
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
        <div data-msg className="flex justify-center my-3 px-2 w-full">
          <div className="w-full max-w-[340px] flex flex-col gap-2">
            <span className="text-[#9B9AA0] text-[12px] font-medium px-1">{t('leadChat.modelsTitle', { n: models.length })}</span>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  useEffect(() => { if (model) { setData(model); setOpen(true) } }, [model])
  if (!data && !open) return null
  const photos = (data?.photos ?? []).map((p) => resolveMediaUrl(p)).filter(Boolean)
  const cm = (v) => (v ? `${v} ${t('modelInfo.cm')}` : null)
  return (
    <ModalMiddle isOpen={open} onClose={() => { setOpen(false); onClose?.() }} onAfterClose={() => setData(null)}>
      {data && (
        <div className="flex flex-col px-5 pt-1 pb-6 gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-black text-lg font-bold truncate">{modelName(data)}</h2>
            {data.age != null && <span className="text-[#9B9AA0] text-[14px] ml-auto">{data.age}</span>}
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
              {photos.map((src, i) => (
                <img key={i} src={src} alt="" className="h-[220px] w-[156px] rounded-2xl object-cover object-top shrink-0 bg-[#EFEAEE]" />
              ))}
            </div>
          )}
          {cm(data.height_cm) && (
            <div className="bg-[#F5F5F7] rounded-2xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-[#9B9AA0] text-[13px]">{t('modelInfo.height')}</span>
              <span className="text-black text-[14px] font-medium">{cm(data.height_cm)}</span>
            </div>
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
  const [sheet, setSheet] = useState(null) // 'payment' | 'verify' | 'models'

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
          <MenuRow icon="📷" label={t('leadChat.media')} onClick={() => { setMenuOpen(false); onPickMedia?.() }} />
          <MenuRow icon="💳" label={t('leadChat.payment')} onClick={() => open('payment')} />
          <MenuRow icon="🪪" label={t('leadChat.verification')} onClick={() => open('verify')} />
          <MenuRow icon="👤" label={t('leadChat.models')} onClick={() => open('models')} />
        </div>
      </ModalMiddle>

      <PaymentSheet open={sheet === 'payment'} onClose={() => setSheet(null)} leadId={leadId} onPosted={onPosted} />
      <VerifySheet open={sheet === 'verify'} onClose={() => setSheet(null)} leadId={leadId} onPosted={onPosted} />
      <ModelsSheet open={sheet === 'models'} onClose={() => setSheet(null)} leadId={leadId} onPosted={onPosted} />
    </>
  )
}

function MenuRow({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-3.5 active:bg-[#E4E3E8] transition-colors">
      <span className="text-[20px]">{icon}</span>
      <span className="text-black text-[15px] font-medium">{label}</span>
    </button>
  )
}

/* ── Payment requisites form ─────────────────────────────────────────── */
function PaymentSheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [requisites, setRequisites] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!amount || !requisites.trim() || busy) return
    setBusy(true)
    try {
      await api.post(`/manager/leads/${leadId}/payment-request`, { amount: Number(amount), currency: 'THB', requisites: requisites.trim() })
      onPosted?.(); onClose()
      setAmount(''); setRequisites('')
    } catch (e) { logError(e) } finally { setBusy(false) }
  }

  return (
    <ModalMiddle isOpen={open} onClose={onClose}>
      <div className="flex flex-col px-5 pt-1 pb-6 gap-3">
        <h2 className="text-black text-lg font-bold">{t('leadChat.paySheetTitle')}</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-[#9B9AA0] text-[13px]">{t('leadChat.payAmount')}</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" className="bg-[#F5F5F7] rounded-xl px-4 py-3 text-black text-[16px] font-semibold outline-none" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[#9B9AA0] text-[13px]">{t('leadChat.payRequisites')}</span>
          <textarea value={requisites} onChange={(e) => setRequisites(e.target.value)} rows={3} placeholder={t('leadChat.payRequisitesPlaceholder')} className="bg-[#F5F5F7] rounded-xl px-4 py-3 text-black text-[15px] outline-none resize-none" />
        </label>
        <button disabled={busy || !amount || !requisites.trim()} onClick={submit} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
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

/* ── Internal-catalog model picker (single or multiple) ──────────────── */
function ModelsSheet({ open, onClose, leadId, onPosted }) {
  const { t } = useTranslation()
  const [list, setList] = useState(null)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open || loadedRef.current) return
    loadedRef.current = true
    api.get('/catalog/models', { params: { per_page: 50 } })
      .then((r) => setList(Array.isArray(r?.data?.data) ? r.data.data : []))
      .catch((e) => { logError(e); setList([]) })
  }, [open])

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const send = async () => {
    if (!selected.length || busy) return
    setBusy(true)
    try { await api.post(`/manager/leads/${leadId}/send-models`, { model_profile_ids: selected }); onPosted?.(); onClose(); setSelected([]) }
    catch (e) { logError(e) } finally { setBusy(false) }
  }

  return (
    <ModalMiddle isOpen={open} onClose={onClose}>
      <div className="flex flex-col px-5 pt-1 pb-6 gap-3" style={{ maxHeight: '78dvh' }}>
        <h2 className="text-black text-lg font-bold">{t('leadChat.modelsSheetTitle')}</h2>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: '52dvh' }}>
          {list === null && [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-[3/4] rounded-xl bg-[#ECEAF0] animate-pulse" />)}
          {list?.map((m) => {
            const photo = m.photos?.[0]?.url ? resolveMediaUrl(m.photos[0].url) : null
            const on = selected.includes(m.id)
            return (
              <button key={m.id} onClick={() => toggle(m.id)} className={`relative rounded-xl overflow-hidden border-2 transition-colors ${on ? 'border-[#E2319B]' : 'border-transparent'}`}>
                <div className="aspect-[3/4] bg-[#EFEAEE]">
                  {photo && <img src={photo} alt="" className="w-full h-full object-cover object-top" />}
                </div>
                <span className="absolute bottom-1 left-1 right-1 text-white text-[11px] font-semibold truncate drop-shadow">{modelName(m)}</span>
                {on && <span className="absolute top-1 right-1 size-5 rounded-full bg-[#E2319B] flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
              </button>
            )
          })}
        </div>
        <button disabled={!selected.length || busy} onClick={send} className="w-full py-3.5 rounded-full bg-[#E2319B] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
          {busy ? '…' : t('leadChat.modelsSend', { n: selected.length })}
        </button>
      </div>
    </ModalMiddle>
  )
}
