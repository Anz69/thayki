import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'

function botLink(botUsername) {
  return botUsername ? `https://t.me/${botUsername}` : window.location.origin
}

function botStartLink(botUsername, startToken = '') {
  if (!botUsername) return window.location.origin
  if (!startToken) return `https://t.me/${botUsername}`
  return `https://t.me/${botUsername}?start=${encodeURIComponent(startToken)}`
}

const BRAND = 'Rus-Model'

function buildShareText(t) {
  return [
    t('share.msgBotTitle', { brand: BRAND }),
    t('share.msgBotSub'),
  ].join('\n')
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none'
    document.body.appendChild(el)
    el.focus()
    el.select()
    try {
      return document.execCommand('copy')
    } finally {
      document.body.removeChild(el)
    }
  }
}

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M21 3L3 10.5l6 2.2M21 3l-2.6 15-5.4-4.8M21 3L9 12.7v5l3-2.3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
)

const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 15V3m0 0L8 7m4-4l4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11.6362 2.18164H9.16346C6.71959 2.18164 5.49766 2.18164 4.56423 2.65725C3.74316 3.0756 3.0756 3.74316 2.65725 4.56423C2.18164 5.49766 2.18164 6.71959 2.18164 9.16346V11.6362M8.21522 15.2725H11.7816C13.0036 15.2725 13.6145 15.2725 14.0813 15.0347C14.4918 14.8256 14.8256 14.4918 15.0347 14.0813C15.2725 13.6145 15.2725 13.0036 15.2725 11.7816V8.21522C15.2725 6.99329 15.2725 6.38232 15.0347 5.9156C14.8256 5.50507 14.4918 5.17129 14.0813 4.96211C13.6145 4.72431 13.0036 4.72431 11.7816 4.72431H8.21522C6.99329 4.72431 6.38232 4.72431 5.9156 4.96211C5.50507 5.17129 5.17129 5.50507 4.96211 5.9156C4.72431 6.38232 4.72431 6.99328 4.72431 8.21522V11.7816C4.72431 13.0036 4.72431 13.6145 4.96211 14.0813C5.17129 14.4918 5.50507 14.8256 5.9156 15.0347C6.38232 15.2725 6.99328 15.2725 8.21522 15.2725Z" stroke="currentColor" strokeWidth="1.45455" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="#34C759" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function ShareModelsModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const headerRef = useRef(null)
  const footerRef = useRef(null)
  const primaryBtnRef = useRef(null)
  const copyIconRef = useRef(null)
  const checkIconRef = useRef(null)
  const copyTimerRef = useRef(null)
  const [status, setStatus] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '')

  const setCopyIconRef = useCallback((el) => {
    copyIconRef.current = el
    if (el) gsap.set(el, { autoAlpha: 1, scale: 1 })
  }, [])

  const setCheckIconRef = useCallback((el) => {
    checkIconRef.current = el
    if (el) gsap.set(el, { autoAlpha: 0, scale: 0.5 })
  }, [])

  const shareText = useMemo(() => buildShareText(t), [t])

  useEffect(() => {
    if (!isOpen) return
    setStatus('')
    setInviteToken('')
    clearTimeout(copyTimerRef.current)
    if (copyIconRef.current) gsap.set(copyIconRef.current, { autoAlpha: 1, scale: 1 })
    if (checkIconRef.current) gsap.set(checkIconRef.current, { autoAlpha: 0, scale: 0.5 })

    const blocks = [headerRef.current, footerRef.current].filter(Boolean)
    if (blocks.length) {
      gsap.set(blocks, { autoAlpha: 0, y: 10 })
      gsap.to(blocks, {
        autoAlpha: 1,
        y: 0,
        duration: 0.34,
        ease: 'power3.out',
        stagger: 0.06,
      })
    }
    if (primaryBtnRef.current) {
      gsap.fromTo(primaryBtnRef.current, { scale: 0.97 }, { scale: 1, duration: 0.34, ease: 'back.out(2)' })
    }

    return () => {
      clearTimeout(copyTimerRef.current)
    }
  }, [isOpen])

  useEffect(() => () => {
    clearTimeout(copyTimerRef.current)
  }, [])

  const sharePayload = useMemo(() => ({ url: botLink(botUsername), text: shareText }), [botUsername, shareText])

  const buildPayloadWithToken = useCallback((token = inviteToken) => {
    const url = botStartLink(botUsername, token)
    return { url, text: shareText }
  }, [inviteToken, botUsername, shareText])

  const ensureInviteToken = useCallback(async () => {
    if (inviteToken) return inviteToken
    if (inviteLoading) return ''
    setInviteLoading(true)
    try {
      const res = await api.post('/invites/share', null, {
        headers: { 'Idempotency-Key': `share-modal-invite-${Date.now()}` },
      })
      const url = res?.data?.data?.url ?? ''
      let tokenFromUrl = ''
      try {
        const parsed = new URL(url)
        tokenFromUrl = parsed.searchParams.get('startapp') ?? parsed.searchParams.get('start') ?? ''
      } catch {
        tokenFromUrl = ''
      }
      if (!tokenFromUrl) {
        setStatus(t('share.inviteError'))
        return ''
      }
      setInviteToken(tokenFromUrl)
      return tokenFromUrl
    } catch {
      setStatus(t('share.inviteCreateError'))
      return ''
    } finally {
      setInviteLoading(false)
    }
  }, [inviteLoading, inviteToken, t])

  const resolvePayload = useCallback(async () => {
    const token = await ensureInviteToken()
    if (!token) return sharePayload
    return buildPayloadWithToken(token)
  }, [ensureInviteToken, buildPayloadWithToken, sharePayload])

  const shareToTelegram = async () => {
    const payload = await resolvePayload()

    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgUrl)
    } else {
      window.open(tgUrl, '_blank', 'noopener,noreferrer')
    }
    setStatus(t('share.statusInviteSent'))
  }

  const shareNative = async () => {
    const payload = await resolvePayload()
    if (!navigator.share) {
      setStatus(t('share.nativeUnavailable'))
      return
    }
    try {
      await navigator.share({
        title: BRAND,
        text: payload.url ? `${payload.url}\n${payload.text}` : payload.text,
      })
      setStatus(t('share.statusInviteSent'))
    } catch {
      setStatus(t('share.statusCancelled'))
    }
  }

  const copyText = async () => {
    try {
      const payload = await resolvePayload()
      const fullText = payload.url ? `${payload.url}\n${payload.text}` : payload.text
      const ok = await copyToClipboard(fullText)
      if (!ok) throw new Error('copy failed')
      setStatus('')
      clearTimeout(copyTimerRef.current)
      gsap.to(copyIconRef.current, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
      gsap.to(checkIconRef.current, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
      copyTimerRef.current = setTimeout(() => {
        gsap.to(checkIconRef.current, { autoAlpha: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' })
        gsap.to(copyIconRef.current, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(2)', delay: 0.1 })
      }, 1800)
    } catch {
      setStatus(t('share.copyError'))
    }
  }

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-5 sm:px-5 flex flex-col gap-4">
        <h2 ref={headerRef} className="text-black text-[20px]/[120%] font-[600] text-center pt-1">
          {t('share.title')}
        </h2>

        <div ref={footerRef} className="flex flex-col gap-2.5">
          <button
            ref={primaryBtnRef}
            onClick={shareToTelegram}
            className="py-3.5 rounded-2xl bg-[#E2319B] text-white text-sm font-[500] flex items-center justify-center gap-2.5 active:opacity-90 transition-opacity"
          >
            <IconSend />
            <span>{t('share.sendTelegram')}</span>
          </button>
          <button
            onClick={shareNative}
            className="py-3.5 rounded-2xl bg-[#F5F5F7] text-black text-sm font-[500] flex items-center justify-center gap-2.5 active:bg-[#ECEAEC] transition-colors"
          >
            <IconShare />
            <span>{t('share.share')}</span>
          </button>
          <button
            onClick={copyText}
            className="py-3.5 rounded-2xl bg-[#F5F5F7] text-black text-sm font-[500] flex items-center justify-center gap-2.5 active:bg-[#ECEAEC] transition-colors"
          >
            <div className="relative w-[18px] h-[18px]">
              <div ref={setCopyIconRef} className="absolute inset-0 flex items-center justify-center"><IconCopy /></div>
              <div ref={setCheckIconRef} className="absolute inset-0 flex items-center justify-center"><IconCheck /></div>
            </div>
            <span>{t('share.copy')}</span>
          </button>
          {status ? (
            <p className="text-xs text-[#7F7F7F] text-center pt-0.5">{status}</p>
          ) : null}
        </div>
      </div>
    </ModalMiddle>
  )
}
