import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'

const MAX_SELECTED = 8

function encodeStartPath(path) {
  try {
    const bytes = new TextEncoder().encode(path)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  } catch {
    return ''
  }
}

function modelShareLink(modelId, botUsername, inviteToken = '') {
  const path = inviteToken
    ? `/model/${modelId}?invite_token=${encodeURIComponent(inviteToken)}`
    : `/model/${modelId}`
  if (!botUsername) return `${window.location.origin}${path}`
  const startApp = encodeStartPath(path)
  return `https://t.me/${botUsername}?startapp=${startApp}`
}

function botLink(botUsername) {
  return botUsername ? `https://t.me/${botUsername}` : window.location.origin
}

function botStartLink(botUsername, startToken = '') {
  if (!botUsername) return window.location.origin
  if (!startToken) return `https://t.me/${botUsername}`
  return `https://t.me/${botUsername}?start=${encodeURIComponent(startToken)}`
}

function buildShareText(selectedModels, botUsername, inviteToken = '') {
  if (selectedModels.length === 0) {
    return [
      '🤖 Thaiky — бот с моделями',
      '✨ Открой и выбери подходящую модель в боте',
    ].join('\n')
  }

  const blocks = selectedModels.map((model) => {
    const startLink = modelShareLink(model.id, botUsername, inviteToken)
    return [
      `👤 ${model.name}${model.age ? `, ${model.age}` : ''}`,
      `🔗 посмотреть → ${startLink}`,
    ].join('\n')
  }).join('\n\n')

  return [
    '☝️ Открывай и выбирай',
    '',
    '🔥 Подборка моделей в Thaiky',
    '',
    blocks,
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

export default function ShareModelsModal({ isOpen, onClose, models = [] }) {
  const { t } = useTranslation()
  const headerRef = useRef(null)
  const counterRef = useRef(null)
  const listRef = useRef(null)
  const footerRef = useRef(null)
  const primaryBtnRef = useRef(null)
  const copyIconRef = useRef(null)
  const checkIconRef = useRef(null)
  const copyTimerRef = useRef(null)
  const listViewportRef = useRef(null)
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
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

  const preparedModels = useMemo(() => (
    models.map((model) => {
      const photos = Array.isArray(model?.photos) ? model.photos.filter(Boolean) : []
      const priceOptions = Array.isArray(model?.price_options) ? model.price_options.filter(Boolean) : []
      const mainPhoto = photos.find((photo) => photo?.is_main) ?? photos[0]
      const numericPrices = priceOptions
        .map((price) => Number(price?.price_thb))
        .filter((value) => Number.isFinite(value))
      const minPrice = numericPrices.length
        ? Math.min(...numericPrices)
        : model.hourly_rate_thb
      return {
        id: model.id,
        name: model.display_name ?? 'Модель',
        age: model.age ?? null,
        price: minPrice ?? null,
        photoUrl: mainPhoto?.url ?? null,
      }
    })
  ), [models])

  const totalModels = preparedModels.length
  const effectiveMax = Math.min(MAX_SELECTED, Math.max(totalModels, 1))
  const isSingleModel = totalModels === 1

  useEffect(() => {
    if (!isOpen) return
    setSelectedIds(isSingleModel ? preparedModels.map((model) => model.id) : [])
    setStatus('')
    setInviteToken('')
    clearTimeout(copyTimerRef.current)
    if (copyIconRef.current) gsap.set(copyIconRef.current, { autoAlpha: 1, scale: 1 })
    if (checkIconRef.current) gsap.set(checkIconRef.current, { autoAlpha: 0, scale: 0.5 })

    const cards = Array.from(listRef.current?.children ?? [])
    const topBlocks = [headerRef.current, counterRef.current, footerRef.current].filter(Boolean)
    if (topBlocks.length) {
      gsap.set(topBlocks, { autoAlpha: 0, y: 10 })
      gsap.to(topBlocks, {
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

    const timer = setTimeout(() => {
      if (!cards.length) return
      gsap.set(cards, { autoAlpha: 0, y: 16, scale: 0.98 })
      gsap.to(cards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.38,
        ease: 'power3.out',
        stagger: 0.06,
      })
    }, 120)
    return () => {
      clearTimeout(timer)
      clearTimeout(copyTimerRef.current)
    }
  }, [isOpen, isSingleModel, preparedModels])

  const updateScrollFade = useCallback(() => {
    const el = listViewportRef.current
    if (!el) return
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 2) {
      setShowTopFade(false)
      setShowBottomFade(false)
      return
    }
    setShowTopFade(el.scrollTop > 2)
    setShowBottomFade(el.scrollTop < maxScroll - 2)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const rafId = requestAnimationFrame(updateScrollFade)
    return () => cancelAnimationFrame(rafId)
  }, [isOpen, preparedModels.length, updateScrollFade])

  const selectedModels = useMemo(
    () => preparedModels.filter((model) => selectedIds.includes(model.id)),
    [preparedModels, selectedIds],
  )
  const isBotFallback = selectedModels.length === 0

  const shareText = useMemo(
    () => buildShareText(selectedModels, botUsername, inviteToken),
    [selectedModels, botUsername, inviteToken],
  )

  useEffect(() => {
    if (!isOpen || !counterRef.current) return
    gsap.fromTo(counterRef.current, { scale: 0.98 }, { scale: 1, duration: 0.22, ease: 'power2.out' })
  }, [selectedIds.length, isOpen])

  useEffect(() => () => {
    clearTimeout(copyTimerRef.current)
  }, [])

  const toggleModel = (id, el) => {
    if (el) {
      gsap.fromTo(el, { scale: 0.985 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' })
    }
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      if (prev.length >= effectiveMax) {
        setStatus(`Можно выбрать максимум ${effectiveMax} ${effectiveMax === 1 ? 'модель' : 'моделей'}`)
        return prev
      }
      return [...prev, id]
    })
  }

  const selectAll = () => {
    const next = preparedModels.slice(0, effectiveMax).map((model) => model.id)
    setSelectedIds(next)
    if (preparedModels.length > effectiveMax) {
      setStatus(`Выбраны первые ${effectiveMax} моделей`)
    } else {
      setStatus('')
    }
  }

  const clearSelection = () => {
    setSelectedIds([])
    setStatus('')
  }

  const sharePayload = useMemo(() => ({ url: botLink(botUsername), text: shareText }), [botUsername, shareText])

  const buildPayloadWithToken = useCallback((token = inviteToken) => {
    const text = buildShareText(selectedModels, botUsername, token)
    // По плану: home-шаринг идет через `start` (бот сначала открывается как бот, а не mini app).
    const url = botStartLink(botUsername, token)
    return { url, text }
  }, [inviteToken, selectedModels, botUsername])

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
        setStatus('Не удалось получить инвайт. Попробуйте еще раз.')
        return ''
      }
      setInviteToken(tokenFromUrl)
      return tokenFromUrl
    } catch {
      setStatus('Не удалось создать инвайт-ссылку')
      return ''
    } finally {
      setInviteLoading(false)
    }
  }, [inviteLoading, inviteToken])

  const shareToTelegram = async () => {
    let payload = sharePayload
    if (selectedModels.length > 0) {
      const token = await ensureInviteToken()
      if (!token) return
      payload = buildPayloadWithToken(token)
    }
  
    // Важно: Telegram ожидает `url=`. Иначе иногда происходит редирект/неверный результат.
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgUrl)
    } else {
      window.open(tgUrl, '_blank', 'noopener,noreferrer')
    }
    setStatus(isBotFallback ? 'Отправлена ссылка на бота' : 'Сообщение с моделями отправлено')
  }

  const shareNative = async () => {
    let payload = sharePayload
    if (selectedModels.length > 0) {
      const token = await ensureInviteToken()
      if (!token) return
      payload = buildPayloadWithToken(token)
    }
    if (!navigator.share) {
      setStatus('Системный способ «Поделиться» недоступен, используйте копирование')
      return
    }
    try {
      await navigator.share({
        title: 'Thaiky',
        text: payload.url ? `${payload.url}\n${payload.text}` : payload.text,
      })
      setStatus(isBotFallback ? 'Ссылка на бота отправлена' : 'Сообщение отправлено')
    } catch {
      setStatus('Отправка отменена')
    }
  }

  const copyText = async () => {
    try {
      let payload = sharePayload
      if (selectedModels.length > 0) {
        const token = await ensureInviteToken()
        if (!token) return
        payload = buildPayloadWithToken(token)
      }
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
      setStatus('Не удалось скопировать текст')
    }
  }

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex flex-col gap-3.5">
        <div ref={headerRef} className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-black text-xl/[100%] font-[500]">{t('share.title')}</h2>
            <p className="text-[#7F7F7F] text-sm mt-1 leading-snug">
              {t('share.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 bg-[#EFEEF3] rounded-full text-xs font-medium text-black active:bg-[#E0DEDF] transition-colors"
          >
            {t('common.close')}
          </button>
        </div>

        <div ref={counterRef} className="flex items-center justify-between bg-[#F6F5F9] rounded-2xl px-3 py-2.5">
          <p className="text-xs text-[#7F7F7F]">
            <Trans
              i18nKey="share.selected"
              values={{ n: selectedIds.length, total: totalModels }}
              components={{ b: <span className="text-black font-[500]" /> }}
            />
          </p>
          <div className="flex items-center gap-1.5">
            {!isSingleModel && (
              <>
                <button onClick={selectAll} className="text-xs px-2.5 py-1.5 bg-[#EFEEF3] rounded-full text-black font-[500] active:bg-[#E6E4EB] transition-colors">
                  {t('share.selectAll')}
                </button>
                <button onClick={clearSelection} className="text-xs px-2.5 py-1.5 bg-[#F0F0F3] rounded-full text-[#6B6B75] font-[500] active:bg-[#E8E8ED] transition-colors">
                  {t('share.reset')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <div
            ref={listViewportRef}
            onScroll={updateScrollFade}
            className="max-h-[34dvh] overflow-y-auto pr-1"
          >
            <div ref={listRef} className="grid grid-cols-1 gap-2.5">
              {preparedModels.map((model) => (
                <button
                  key={model.id}
                  onClick={(event) => toggleModel(model.id, event.currentTarget)}
                  className={`w-full text-left rounded-2xl border p-2.5 flex items-center gap-3 transition-all duration-200 ${selectedIds.includes(model.id)
                    ? 'border-[#E2319B] bg-[#FDF0F8] shadow-[0_4px_14px_rgba(226,49,155,0.12)]'
                    : 'border-black/10 bg-white active:bg-[#F7F7FA]'
                    }`}
                >
                  <div className="size-12 rounded-xl overflow-hidden bg-[#EFEEF3] shrink-0">
                    {model.photoUrl ? (
                      <img src={model.photoUrl} alt={model.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-[500] text-black truncate">
                      {model.name}{model.age ? `, ${model.age}` : ''}
                    </p>
                  </div>
                  <div className={`size-5 rounded-full border-2 transition-colors flex items-center justify-center ${selectedIds.includes(model.id) ? 'border-[#E2319B] bg-[#E2319B]' : 'border-[#C9C7CF] bg-white'
                    }`}>
                    {selectedIds.includes(model.id) ? <span className="text-white text-[10px] font-bold leading-none">✓</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div
            className={`pointer-events-none absolute top-0 left-0 right-1 h-8 rounded-t-2xl bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`pointer-events-none absolute bottom-0 left-0 right-1 h-8 rounded-b-2xl bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        <div ref={footerRef} className="grid grid-cols-1 gap-2 pt-1">
          <button
            ref={primaryBtnRef}
            onClick={shareToTelegram}
            className="py-3 rounded-2xl bg-[#E2319B] text-white text-sm font-[500] active:opacity-90 transition-opacity"
          >
            {t('share.sendTelegram')}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareNative}
              className="py-3 rounded-2xl bg-[#F5F5F7] text-black text-sm font-[500] active:bg-[#ECEAEC] transition-colors"
            >
              {t('share.share')}
            </button>
            <button
              onClick={copyText}
              className="py-2.5 rounded-2xl bg-[#F5F5F7] text-black text-sm font-[500] active:bg-[#ECEAEC] transition-colors flex items-center justify-center gap-2"
            >
              <span>{t('share.copy')}</span>
              <div className="relative w-[18px] h-[18px]">
                <div ref={setCopyIconRef} className="absolute inset-0 flex items-center justify-center"><IconCopy /></div>
                <div ref={setCheckIconRef} className="absolute inset-0 flex items-center justify-center"><IconCheck /></div>
              </div>
            </button>
          </div>
          {status ? (
            <p className="text-xs text-[#7F7F7F] text-center pt-0.5">{status}</p>
          ) : null}
        </div>
      </div>
    </ModalMiddle>
  )
}