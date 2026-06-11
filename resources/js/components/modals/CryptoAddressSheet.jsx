import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ModalSheet from '@/layout/ModalSheet'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const COIN_COLORS = {
  BTC: '#F7931A', ETH: '#627EEA', USDT: '#26A17B', USDC: '#2775CA',
  BNB: '#F0B90B', POL: '#8247E5', LTC: '#345D9D', SOL: '#9945FF',
  TRX: '#EF0027', TON: '#0098EA', XMR: '#FF6600', BCH: '#0AC18E',
}

function CoinBadge({ code }) {
  const bg = COIN_COLORS[code] ?? '#888'
  return (
    <span
      className="shrink-0 size-9 rounded-full flex items-center justify-center text-white font-bold"
      style={{ background: bg, fontSize: code.length > 3 ? 9 : 11, letterSpacing: '-0.02em' }}
    >
      {code}
    </span>
  )
}

function CopyButton({ value }) {
  const { t } = useTranslation()
  const [done, setDone] = useState(false)
  const timer = useRef(null)
  const copy = useCallback(() => {
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).catch(fallback)
      else fallback()
    } catch { fallback() }
    setDone(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDone(false), 1600)
  }, [value])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button
      onClick={copy}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${done ? 'bg-[#E6F5EA] text-[#1E9E4E]' : 'bg-[#EFEEF3] text-[#1B1B1B] active:bg-[#E4E4E4]'}`}
    >
      {done ? t('cryptoPay.copied') : t('cryptoPay.copy')}
    </button>
  )
}

function CoinRow({ coin, t }) {
  const pending = coin.status === 'pending'
  const failed = coin.status === 'failed' || (!coin.address && !pending)
  const paid = coin.status === 'paid'
  return (
    <div className={`rounded-2xl border p-3.5 flex flex-col gap-2.5 ${paid ? 'border-[#1E9E4E]/40 bg-[#F2FBF5]' : 'border-black/[0.07] bg-white'}`}>
      <div className="flex items-center gap-2.5">
        <CoinBadge code={coin.code} />
        <div className="flex flex-col min-w-0">
          <span className="text-black text-[14px] font-semibold leading-tight">{coin.name}</span>
          <span className="text-[#9B9AA0] text-[11px] font-medium">{coin.code} · {coin.net_label}</span>
        </div>
        <span className="ml-auto text-[10px] font-semibold text-[#9B9AA0] uppercase tracking-[0.06em] bg-[#F5F5F7] rounded-full px-2 py-1">
          {t('cryptoPay.network')}: {coin.net_label}
        </span>
      </div>

      {pending ? (
        <div className="h-9 rounded-lg bg-gradient-to-r from-[#F0F0F3] via-[#E7E7EC] to-[#F0F0F3] animate-pulse" />
      ) : failed ? (
        <div className="text-[#C77A12] text-[12px] font-medium bg-[#FFF1DC] rounded-lg px-3 py-2">{t('cryptoPay.unavailable')}</div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="flex-1 min-w-0 text-black text-[12.5px] font-medium select-text break-all bg-[#F5F5F7] rounded-lg px-3 py-2 leading-snug">
            {coin.address}
          </p>
          <CopyButton value={coin.address} />
        </div>
      )}

      {!pending && !failed && coin.memo && (
        <div className="flex flex-col gap-1.5 bg-[#FFF6E5] rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[#C77A12] text-[11px] font-semibold">{t('cryptoPay.memo')}</span>
            <span className="flex-1 min-w-0 text-black text-[12.5px] font-semibold break-all">{coin.memo}</span>
            <CopyButton value={coin.memo} />
          </div>
          <span className="text-[#C77A12] text-[11px]/[140%]">{t('cryptoPay.memoWarn')}</span>
        </div>
      )}
    </div>
  )
}

export default function CryptoAddressSheet({ isOpen, onClose, leadId, messageId }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const pollRef = useRef(null)
  const aliveRef = useRef(false)

  const load = useCallback(async () => {
    if (!leadId || !messageId) return
    try {
      const r = await api.get(`/leads/${leadId}/crypto-addresses`, { params: { message_id: messageId } })
      if (!aliveRef.current) return
      setData(r?.data?.data ?? null)
      setError(false)
    } catch (e) {
      if (!aliveRef.current) return
      logError(e)
      setError(true)
    }
  }, [leadId, messageId])

  useEffect(() => {
    aliveRef.current = isOpen
    clearInterval(pollRef.current)
    if (!isOpen) return undefined
    load()
    pollRef.current = setInterval(() => {
      if (data?.ready && data?.confirmed) { clearInterval(pollRef.current); return }
      load()
    }, 2500)
    return () => { aliveRef.current = false; clearInterval(pollRef.current) }
  }, [isOpen, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const coins = data?.coins ?? []

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex flex-col h-full">
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-black text-[20px] font-bold">{t('cryptoPay.title')}</h2>
            <button onClick={onClose} className="size-8 rounded-full bg-[#EFEEF3] flex items-center justify-center active:bg-[#E4E4E4]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#111" strokeWidth="1.75" strokeLinecap="round" /></svg>
            </button>
          </div>
          {data?.confirmed ? (
            <div className="mt-3 bg-[#E6F5EA] text-[#1E9E4E] text-[14px] font-semibold rounded-xl px-4 py-3 text-center">
              {t('cryptoPay.confirmed')}
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[#9B9AA0] text-[13px] font-medium">{t('cryptoPay.amountLabel')}</span>
                <span className="text-black text-[26px] font-bold">{data?.amount_display ?? '—'}</span>
              </div>
              <p className="mt-1 text-[#9B9AA0] text-[12.5px]/[150%]">{t('cryptoPay.hint')}</p>
              {!data?.ready && (
                <p className="mt-1 text-[#E2319B] text-[12px] font-medium">{t('cryptoPay.generating')}</p>
              )}
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-8 flex flex-col gap-2.5">
          {error && coins.length === 0 && (
            <div className="text-center text-[#9B9AA0] text-sm py-10">{t('cryptoPay.generating')}</div>
          )}
          {coins.map((coin) => (
            <CoinRow key={coin.code} coin={coin} t={t} />
          ))}
        </div>
      </div>
    </ModalSheet>
  )
}
