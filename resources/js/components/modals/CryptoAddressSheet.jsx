import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const COIN_COLORS = {
  BTC: '#F7931A', ETH: '#627EEA', USDT: '#26A17B', USDC: '#2775CA',
  BNB: '#F0B90B', POL: '#8247E5', LTC: '#345D9D', SOL: '#9945FF',
  TRX: '#EF0027', GRAM: '#0098EA', XMR: '#FF6600', BCH: '#0AC18E',
}

const LOCAL_COINS = [
  { code: 'BTC', name: 'Bitcoin', net_label: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum', net_label: 'ERC-20' },
  { code: 'USDT', name: 'Tether', net_label: 'TRC-20', showNet: true },
  { code: 'USDC', name: 'USD Coin', net_label: 'ERC-20', showNet: true },
  { code: 'BNB', name: 'BNB', net_label: 'BEP-20' },
  { code: 'POL', name: 'Polygon', net_label: 'Polygon' },
  { code: 'LTC', name: 'Litecoin', net_label: 'Litecoin' },
  { code: 'SOL', name: 'Solana', net_label: 'Solana' },
  { code: 'TRX', name: 'TRON', net_label: 'TRC-20' },
  { code: 'GRAM', name: 'Gram', net_label: 'TON' },
  { code: 'XMR', name: 'Monero', net_label: 'Monero' },
  { code: 'BCH', name: 'Bitcoin Cash', net_label: 'Bitcoin Cash' },
]

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

function copyText(value) {
  const fallback = () => {
    const ta = document.createElement('textarea')
    ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy') } catch {}
    document.body.removeChild(ta)
  }
  try { navigator.clipboard?.writeText ? navigator.clipboard.writeText(value).catch(fallback) : fallback() } catch { fallback() }
}

function CoinIcon({ code, sm = false }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const bg = COIN_COLORS[code] ?? '#888'
  return (
    <span className="relative block w-full h-full rounded-full overflow-hidden bg-[#ECECF0]">
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold select-none" style={{ background: bg, fontSize: sm ? 7 : (code.length > 3 ? 10 : 12), letterSpacing: '-0.03em' }}>
          {code}
        </span>
      )}
      <img
        src={`/img/payments/crypto/${code.toLowerCase()}.svg?v=7`}
        alt={code}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  )
}

export default function CryptoAddressSheet({ isOpen, onClose, leadId, messageId }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [amountCopied, setAmountCopied] = useState(false)
  const amountTimer = useRef(null)
  const amountIconTimer = useRef(null)
  const wrapRef = useRef(null)
  const prevHeightRef = useRef(null)
  const detailsRef = useRef(null)
  const copyRef = useRef(null)
  const checkRef = useRef(null)
  const amountCopyRef = useRef(null)
  const amountCheckRef = useRef(null)
  const copyTimer = useRef(null)
  const pollRef = useRef(null)
  const aliveRef = useRef(false)

  const setCopy = useCallback((el) => { copyRef.current = el; if (el) gsap.set(el, { autoAlpha: 1, scale: 1 }) }, [])
  const setCheck = useCallback((el) => { checkRef.current = el; if (el) gsap.set(el, { autoAlpha: 0, scale: 0.5 }) }, [])
  const setAmountCopy = useCallback((el) => { amountCopyRef.current = el; if (el) gsap.set(el, { autoAlpha: 1, scale: 1 }) }, [])
  const setAmountCheck = useCallback((el) => { amountCheckRef.current = el; if (el) gsap.set(el, { autoAlpha: 0, scale: 0.5 }) }, [])

  const morphCopyCheck = useCallback((copyEl, checkEl, timerRef) => {
    if (copyEl) gsap.to(copyEl, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
    if (checkEl) gsap.to(checkEl, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (checkEl) gsap.to(checkEl, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
      if (copyEl) gsap.to(copyEl, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    }, 1800)
  }, [])

  const load = useCallback(async () => {
    if (!leadId || !messageId) return
    try {
      const r = await api.get(`/leads/${leadId}/crypto-addresses`, { params: { message_id: messageId } })
      if (aliveRef.current) { setData(r?.data?.data ?? null); setLoadError(false) }
    } catch (e) {
      if (aliveRef.current) { logError(e); setLoadError(true) }
    }
  }, [leadId, messageId])

  useEffect(() => {
    clearInterval(pollRef.current)
    if (!isOpen) { aliveRef.current = false; return undefined }
    aliveRef.current = true
    setSelected(null)
    setLoadError(false)
    load()
    pollRef.current = setInterval(() => {
      if (data?.ready && data?.confirmed) { clearInterval(pollRef.current); return }
      load()
    }, 2500)
    return () => { aliveRef.current = false; clearInterval(pollRef.current); clearTimeout(copyTimer.current) }
  }, [isOpen, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const byCode = {}
  for (const c of (data?.coins ?? [])) byCode[c.code] = c
  const coins = LOCAL_COINS.map((c) => ({ ...c, ...(byCode[c.code] ?? {}), status: byCode[c.code]?.status ?? 'pending' }))
  const sel = selected ? coins.find((c) => c.code === selected) : null

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || prevHeightRef.current == null) return
    const from = prevHeightRef.current
    prevHeightRef.current = null
    const to = wrap.offsetHeight
    if (Math.abs(from - to) < 1) return
    gsap.killTweensOf(wrap)
    gsap.fromTo(wrap, { height: from }, {
      height: to, duration: 0.42, ease: 'power3.inOut',
      onComplete: () => gsap.set(wrap, { clearProps: 'height' }),
    })
  }, [selected])

  useEffect(() => {
    const root = detailsRef.current
    if (!sel || !root) return
    const kids = Array.from(root.children)
    gsap.killTweensOf([root, ...kids])
    gsap.timeline()
      .fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0)
      .fromTo(kids,
        { opacity: 0, y: 18, scale: 0.97, filter: 'blur(7px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out', stagger: 0.07, clearProps: 'filter,transform,opacity' },
        0.04,
      )
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetCopy = useCallback(() => {
    clearTimeout(copyTimer.current)
    clearTimeout(amountIconTimer.current)
    const a = [copyRef.current, checkRef.current, amountCopyRef.current, amountCheckRef.current].filter(Boolean)
    if (a.length) gsap.killTweensOf(a)
    if (copyRef.current) gsap.set(copyRef.current, { autoAlpha: 1, scale: 1 })
    if (checkRef.current) gsap.set(checkRef.current, { autoAlpha: 0, scale: 0.5 })
    if (amountCopyRef.current) gsap.set(amountCopyRef.current, { autoAlpha: 1, scale: 1 })
    if (amountCheckRef.current) gsap.set(amountCheckRef.current, { autoAlpha: 0, scale: 0.5 })
  }, [])

  const handleSelect = useCallback((code) => {
    resetCopy()
    if (wrapRef.current) prevHeightRef.current = wrapRef.current.offsetHeight
    setSelected((cur) => (cur === code ? null : code))
  }, [resetCopy])

  const copyAmount = useCallback((value) => {
    copyText(value)
    setAmountCopied(true)
    clearTimeout(amountTimer.current)
    amountTimer.current = setTimeout(() => setAmountCopied(false), 1600)
    morphCopyCheck(amountCopyRef.current, amountCheckRef.current, amountIconTimer)
  }, [morphCopyCheck])

  const handleCopy = useCallback((value) => {
    copyText(value)
    const c = copyRef.current; const k = checkRef.current
    if (c) gsap.to(c, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
    if (k) gsap.to(k, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => {
      const c2 = copyRef.current; const k2 = checkRef.current
      if (k2) gsap.to(k2, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
      if (c2) gsap.to(c2, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
    }, 1800)
  }, [])

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div ref={wrapRef} className="flex flex-col gap-5 p-6 pt-2 overflow-hidden">
        <div className="flex flex-col items-center gap-1.5 text-center pt-1">
          <h2 className="text-black text-xl/[100%] font-semibold">{t('cryptoPay.title')}</h2>
          {data?.confirmed ? (
            <p className="text-[#1E9E4E] text-sm/[140%] font-semibold">{t('cryptoPay.confirmed')}</p>
          ) : (
            <p className="text-[#7F7F7F] text-sm/[140%] font-medium">{t('cryptoPay.hint')}</p>
          )}
        </div>

        {loadError && !data && (
          <div className="flex flex-col items-center gap-3 py-5 text-center">
            <span className="size-12 rounded-full bg-[#F0F0F0] flex items-center justify-center text-2xl">⚠️</span>
            <p className="text-[#7F7F7F] text-sm">{t('cryptoPay.loadError')}</p>
            <button onClick={load} className="px-5 py-2.5 rounded-full bg-[#E2319B] text-white text-sm font-semibold active:opacity-80 transition-opacity">
              {t('common.retry')}
            </button>
          </div>
        )}

        {!(loadError && !data) && (
        <div className="grid grid-cols-6 gap-2.5">
          {coins.map((c) => {
            const isSel = selected === c.code
            const isDimmed = selected !== null && !isSel
            return (
              <button
                key={c.code}
                onClick={() => handleSelect(c.code)}
                style={{ transition: 'opacity 0.2s ease', WebkitTapHighlightColor: 'transparent' }}
                className={['rounded-full aspect-square outline-none focus:outline-none', isDimmed ? 'opacity-35' : 'opacity-100', isSel ? 'ring-2 ring-[#E2319B] ring-offset-2 ring-offset-white' : ''].join(' ')}
              >
                <CoinIcon code={c.code} />
              </button>
            )
          })}
        </div>
        )}

        {sel && (
          <div ref={detailsRef} className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <span className="text-[#7F7F7F] text-sm/[100%] font-medium">{t('payment.transferTo')}</span>
                <span className="inline-flex w-4 h-4"><CoinIcon code={sel.code} sm /></span>
                <span className="text-[#7F7F7F] text-sm/[100%] font-medium">{sel.name}</span>
              </div>
              {!data?.confirmed && (
                <>
                  {sel.crypto_amount ? (
                    <button
                      onClick={() => copyAmount(sel.crypto_amount)}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      className="relative outline-none active:scale-[0.97] transition-transform"
                    >
                      <span className="text-black text-[28px]/[100%] font-semibold tracking-tight">{sel.crypto_amount} {sel.code}</span>
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-[18px] h-[18px]">
                        <span ref={setAmountCopy} className="absolute inset-0 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11.64 2.18H9.16c-2.44 0-3.66 0-4.6.48-.82.42-1.49 1.08-1.91 1.9-.48.94-.48 2.16-.48 4.6v2.48M8.22 15.27h3.56c1.22 0 1.83 0 2.3-.24.4-.21.74-.54.95-.95.24-.47.24-1.08.24-2.3V8.22c0-1.22 0-1.83-.24-2.3a2.18 2.18 0 0 0-.95-.95c-.47-.24-1.08-.24-2.3-.24H8.22c-1.22 0-1.83 0-2.3.24-.41.21-.74.55-.95.95-.24.47-.24 1.08-.24 2.3v3.56c0 1.22 0 1.83.24 2.3.21.41.54.74.95.95.47.24 1.08.24 2.3.24Z" stroke="#C0BFC7" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <span ref={setAmountCheck} className="absolute inset-0 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#1E9E4E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                      </span>
                    </button>
                  ) : (
                    <span className="text-black text-[28px]/[100%] font-semibold tracking-tight">{data?.amount_display ?? '—'}</span>
                  )}
                  {sel.crypto_amount && (
                    <span className="relative block w-full h-[18px] text-sm/[100%] font-[500]">
                      <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out text-[#9B9AA0] ${amountCopied ? 'opacity-0 -translate-y-1.5' : 'opacity-100 translate-y-0'}`}>
                        ≈ {data?.amount_display ?? '—'}
                      </span>
                      <span className={`absolute inset-0 flex items-center justify-center gap-1 transition-all duration-300 ease-out text-[#1E9E4E] ${amountCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#1E9E4E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {t('cryptoPay.copied')}
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>

            {sel.status === 'pending' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-full h-12 rounded-full bg-gradient-to-r from-[#F0F0F3] via-[#E7E7EC] to-[#F0F0F3] animate-pulse" />
                <span className="text-[#E2319B] text-[12px] font-medium">{t('cryptoPay.generating')}</span>
              </div>
            ) : !sel.address ? (
              <div className="text-center text-[#C77A12] text-[13px] font-medium bg-[#FFF1DC] rounded-xl px-4 py-3">{t('cryptoPay.unavailable')}</div>
            ) : (
              <>
                {sel.showNet && sel.net_label && (
                  <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FFF8EC] px-3.5 py-3 ring-1 ring-inset ring-[#F1D9A6]">
                    <div className="flex items-center gap-2">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 9v4m0 3.5h.01M10.3 3.9 1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3l-8.5-14.6a2 2 0 0 0-3.4 0Z" stroke="#E0A100" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span className="text-[#8A5A00] text-[13px] font-semibold">{t('cryptoPay.network')}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F4B73D] text-white text-[12px] font-bold tracking-wide">{sel.net_label}</span>
                    </div>
                    <span className="text-[#A8762A] text-[11.5px]/[140%]">{t('cryptoPay.networkWarn')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 bg-[#F5F5F7] rounded-full px-4 py-3 min-w-0">
                    <span className="block text-black text-sm/[100%] font-semibold truncate select-text">{sel.address}</span>
                  </div>
                  <button onClick={() => handleCopy(sel.address)} className="shrink-0 size-10 bg-[#F5F5F7] rounded-full flex items-center justify-center active:bg-[#ECEAEC] transition-colors">
                    <div className="relative w-[18px] h-[18px]">
                      <div ref={setCopy} className="absolute inset-0 flex items-center justify-center"><IconCopy /></div>
                      <div ref={setCheck} className="absolute inset-0 flex items-center justify-center"><IconCheck /></div>
                    </div>
                  </button>
                </div>
                {sel.memo && (
                  <div className="flex flex-col gap-1.5 bg-[#FFF6E5] rounded-2xl px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 min-w-0">
                        <span className="block text-[#C77A12] text-[10px] font-semibold uppercase tracking-[0.06em]">{t('cryptoPay.memo')}</span>
                        <span className="block text-black text-[13px] font-semibold truncate select-text">{sel.memo}</span>
                      </div>
                      <button onClick={() => handleCopy(sel.memo)} className="shrink-0 size-8 bg-white/70 rounded-full flex items-center justify-center active:bg-white"><IconCopy /></button>
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
    </ModalMiddle>
  )
}
