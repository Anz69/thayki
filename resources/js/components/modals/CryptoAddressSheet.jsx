import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const COIN_COLORS = {
  BTC: '#F7931A', ETH: '#627EEA', USDT: '#26A17B', USDC: '#2775CA',
  BNB: '#F0B90B', POL: '#8247E5', LTC: '#345D9D', SOL: '#9945FF',
  TRX: '#EF0027', TON: '#0098EA', XMR: '#FF6600', BCH: '#0AC18E',
}

const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11.6362 2.18164H9.16346C6.71959 2.18164 5.49766 2.18164 4.56423 2.65725C3.74316 3.0756 3.0756 3.74316 2.65725 4.56423C2.18164 5.49766 2.18164 6.71959 2.18164 9.16346V11.6362M8.21522 15.2725H11.7816C13.0036 15.2725 13.6145 15.2725 14.0813 15.0347C14.4918 14.8256 14.8256 14.4918 15.0347 14.0813C15.2725 13.6145 15.2725 13.0036 15.2725 11.7816V8.21522C15.2725 6.99329 15.2725 6.38232 15.0347 5.9156C14.8256 5.50507 14.4918 5.17129 14.0813 4.96211C13.6145 4.72431 13.0036 4.72431 11.7816 4.72431H8.21522C6.99329 4.72431 6.38232 4.72431 5.9156 4.96211C5.50507 5.17129 5.17129 5.50507 4.96211 5.9156C4.72431 6.38232 4.72431 6.99328 4.72431 8.21522V11.7816C4.72431 13.0036 4.72431 13.6145 4.96211 14.0813C5.17129 14.4918 5.50507 14.8256 5.9156 15.0347C6.38232 15.2725 6.99328 15.2725 8.21522 15.2725Z" stroke="#777779" strokeWidth="1.45455" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="#34C759" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function CoinIcon({ code, size = 'full' }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const bg = COIN_COLORS[code] ?? '#888'
  const box = size === 'sm' ? 'w-4 h-4' : 'w-full h-full'

  if (failed) {
    return (
      <span
        className={`${box} rounded-full flex items-center justify-center text-white font-bold select-none`}
        style={{ background: bg, fontSize: size === 'sm' ? 7 : (code.length > 3 ? 10 : 12), letterSpacing: '-0.03em' }}
      >
        {code}
      </span>
    )
  }

  return (
    <span className={`relative ${box} rounded-full overflow-hidden block`}>
      {!loaded && <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#F0F0F3] to-[#E7E7EC] animate-pulse" />}
      <img
        src={`/img/payments/crypto/${code.toLowerCase()}.svg`}
        alt={code}
        loading="lazy"
        className="w-full h-full object-cover rounded-full"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  )
}

function CopyControl({ value }) {
  const copyRef = useRef(null)
  const checkRef = useRef(null)
  const timer = useRef(null)
  const setCopy = useCallback((el) => { copyRef.current = el; if (el) gsap.set(el, { autoAlpha: 1, scale: 1 }) }, [])
  const setCheck = useCallback((el) => { checkRef.current = el; if (el) gsap.set(el, { autoAlpha: 0, scale: 0.5 }) }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  const onCopy = useCallback(() => {
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    try { navigator.clipboard?.writeText ? navigator.clipboard.writeText(value).catch(fallback) : fallback() } catch { fallback() }
    const c = copyRef.current; const k = checkRef.current
    if (c) gsap.to(c, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
    if (k) gsap.to(k, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const c2 = copyRef.current; const k2 = checkRef.current
      if (k2) gsap.to(k2, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
      if (c2) gsap.to(c2, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    }, 1800)
  }, [value])
  return (
    <button onClick={onCopy} className="shrink-0 size-10 bg-[#F5F5F7] rounded-full flex items-center justify-center active:bg-[#ECEAEC] transition-colors">
      <div className="relative w-[18px] h-[18px]">
        <div ref={setCopy} className="absolute inset-0 flex items-center justify-center"><IconCopy /></div>
        <div ref={setCheck} className="absolute inset-0 flex items-center justify-center"><IconCheck /></div>
      </div>
    </button>
  )
}

export default function CryptoAddressSheet({ isOpen, onClose, leadId, messageId }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const detailsRef = useRef(null)
  const pollRef = useRef(null)
  const aliveRef = useRef(false)

  const load = useCallback(async () => {
    if (!leadId || !messageId) return
    try {
      const r = await api.get(`/leads/${leadId}/crypto-addresses`, { params: { message_id: messageId } })
      if (aliveRef.current) setData(r?.data?.data ?? null)
    } catch (e) { if (aliveRef.current) logError(e) }
  }, [leadId, messageId])

  useEffect(() => {
    aliveRef.current = isOpen
    clearInterval(pollRef.current)
    if (!isOpen) { setSelected(null); return undefined }
    load()
    pollRef.current = setInterval(() => {
      if (data?.ready && data?.confirmed) { clearInterval(pollRef.current); return }
      load()
    }, 2500)
    return () => { aliveRef.current = false; clearInterval(pollRef.current) }
  }, [isOpen, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const coins = data?.coins ?? []
  const sel = selected !== null ? coins.find((c) => c.code === selected) : null

  useEffect(() => {
    if (sel && detailsRef.current) {
      gsap.fromTo(detailsRef.current,
        { opacity: 0, y: 16, scale: 0.97, filter: 'blur(4px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.38, ease: 'power3.out', clearProps: 'filter,scale' },
      )
    }
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const gridItems = coins.length ? coins : Array.from({ length: 12 }, (_, i) => ({ code: '', skeleton: true, key: i }))

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="auto">
      <div className="flex flex-col gap-5 p-6 pt-2">
        <div className="flex flex-col items-center gap-1.5 text-center pt-1">
          <h2 className="text-black text-xl/[100%] font-semibold">{t('cryptoPay.title')}</h2>
          {data?.confirmed ? (
            <p className="text-[#1E9E4E] text-sm/[140%] font-semibold">{t('cryptoPay.confirmed')}</p>
          ) : (
            <p className="text-[#7F7F7F] text-sm/[140%] font-medium">{t('cryptoPay.hint')}</p>
          )}
        </div>

        {!data?.confirmed && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[#9B9AA0] text-[12px] font-medium uppercase tracking-[0.06em]">{t('cryptoPay.amountLabel')}</span>
            <span className="text-black text-[28px]/[100%] font-bold tracking-tight">{data?.amount_display ?? '—'}</span>
          </div>
        )}

        <div className="grid grid-cols-6 gap-2.5">
          {gridItems.map((c, i) => {
            if (c.skeleton) {
              return <div key={`sk-${i}`} className="rounded-full aspect-square bg-gradient-to-br from-[#F0F0F3] to-[#E7E7EC] animate-pulse" />
            }
            const isSel = selected === c.code
            const isDimmed = selected !== null && !isSel
            const pending = c.status === 'pending'
            return (
              <button
                key={c.code}
                onClick={() => setSelected(isSel ? null : c.code)}
                style={{ transition: 'opacity 0.2s ease' }}
                className={[
                  'relative rounded-full aspect-square p-0.5',
                  isDimmed ? 'opacity-35' : 'opacity-100',
                  isSel ? 'ring-2 ring-[#E2319B] ring-offset-1' : '',
                ].join(' ')}
              >
                <CoinIcon code={c.code} />
                {pending && <span className="absolute inset-0 rounded-full bg-white/55 animate-pulse" />}
              </button>
            )
          })}
        </div>

        {sel && (
          <div ref={detailsRef} className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[#7F7F7F] text-sm/[100%] font-medium">{t('cryptoPay.address')}</span>
                <span className="inline-flex items-center"><CoinIcon code={sel.code} size="sm" /></span>
                <span className="text-[#7F7F7F] text-sm/[100%] font-medium">{sel.name}</span>
              </div>
              <span className="text-[11px] font-semibold text-[#9B9AA0] uppercase tracking-[0.06em] bg-[#F5F5F7] rounded-full px-2.5 py-1">
                {t('cryptoPay.network')}: {sel.net_label}
              </span>
            </div>

            {sel.status === 'pending' ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-full h-12 rounded-full bg-gradient-to-r from-[#F0F0F3] via-[#E7E7EC] to-[#F0F0F3] animate-pulse" />
                <span className="text-[#E2319B] text-[12px] font-medium">{t('cryptoPay.generating')}</span>
              </div>
            ) : !sel.address ? (
              <div className="text-center text-[#C77A12] text-[13px] font-medium bg-[#FFF1DC] rounded-xl px-4 py-3">{t('cryptoPay.unavailable')}</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#F5F5F7] rounded-2xl px-4 py-3 min-w-0">
                    <span className="block text-black text-[13px]/[150%] font-semibold break-all select-text">{sel.address}</span>
                  </div>
                  <CopyControl value={sel.address} />
                </div>
                {sel.memo && (
                  <div className="flex flex-col gap-1.5 bg-[#FFF6E5] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="block text-[#C77A12] text-[11px] font-semibold">{t('cryptoPay.memo')}</span>
                        <span className="block text-black text-[13px] font-semibold break-all select-text">{sel.memo}</span>
                      </div>
                      <CopyControl value={sel.memo} />
                    </div>
                    <span className="text-[#C77A12] text-[11px]/[140%]">{t('cryptoPay.memoWarn')}</span>
                  </div>
                )}
                <p className="text-[#7F7F7F] text-xs/[150%] font-medium text-center">{t('cryptoPay.afterPay')}</p>
              </>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity">
          {t('common.close')}
        </button>
      </div>
    </ModalSheet>
  )
}
