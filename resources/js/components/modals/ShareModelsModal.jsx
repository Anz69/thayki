import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'

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

function modelShareLink(modelId, botUsername) {
  const path = `/model/${modelId}`
  if (!botUsername) return `${window.location.origin}${path}`
  const startApp = encodeStartPath(path)
  return `https://t.me/${botUsername}?startapp=${startApp}`
}

function botLink(botUsername) {
  return botUsername ? `https://t.me/${botUsername}` : window.location.origin
}

export default function ShareModelsModal({ isOpen, onClose, models = [] }) {
  const listRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [status, setStatus] = useState('')
  const botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '')

  const preparedModels = useMemo(() => (
    models.map((model) => {
      const mainPhoto = model.photos?.find((photo) => photo.is_main) ?? model.photos?.[0]
      const minPrice = model.price_options?.length
        ? Math.min(...model.price_options.map((price) => price.price_thb))
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
    const timer = setTimeout(() => {
      const cards = Array.from(listRef.current?.children ?? [])
      if (!cards.length) return
      gsap.set(cards, { autoAlpha: 0, y: 16, scale: 0.98 })
      gsap.to(cards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.32,
        ease: 'power3.out',
        stagger: 0.04,
      })
    }, 120)
    return () => clearTimeout(timer)
  }, [isOpen, isSingleModel, preparedModels])

  const selectedModels = useMemo(
    () => preparedModels.filter((model) => selectedIds.includes(model.id)),
    [preparedModels, selectedIds],
  )

  const shareText = useMemo(() => {
    const lines = selectedModels.map((model) => {
      const url = modelShareLink(model.id, botUsername)
      return `• ${model.name}${model.age ? `, ${model.age}` : ''}\n${url}`
    })
    return [
      'Подборка моделей в Thaiky',
      botLink(botUsername),
      '',
      ...lines,
    ].join('\n')
  }, [selectedModels, botUsername])

  const previewText = selectedModels.length === 0
    ? 'Выберите модели, и мы подготовим сообщение со ссылками.'
    : selectedModels.slice(0, 2).map((m) => `${m.name}${m.age ? `, ${m.age}` : ''}`).join(' • ')

  const toggleModel = (id) => {
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

  const canShare = selectedIds.length > 0

  const shareBotOnly = () => {
    const url = botLink(botUsername)
    const text = 'Открой бота Thaiky'
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    window.open(tgUrl, '_blank', 'noopener,noreferrer')
  }

  const shareToTelegram = () => {
    if (!canShare) return
    const url = botLink(botUsername)
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`
    window.open(tgUrl, '_blank', 'noopener,noreferrer')
  }

  const shareNative = async () => {
    if (!canShare) return
    if (!navigator.share) {
      setStatus('Системный способ «Поделиться» недоступен, используйте копирование')
      return
    }
    try {
      await navigator.share({
        title: 'Thaiky',
        text: shareText,
        url: botLink(botUsername),
      })
      setStatus('Сообщение отправлено')
    } catch {
      setStatus('Отправка отменена')
    }
  }

  const copyText = async () => {
    if (!canShare) return
    try {
      await navigator.clipboard.writeText(shareText)
      setStatus('Текст со ссылками скопирован')
    } catch {
      setStatus('Не удалось скопировать текст')
    }
  }

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-black text-xl/[100%] font-semibold">Поделиться подборкой</h2>
            <p className="text-[#7F7F7F] text-sm mt-1 leading-snug">
              Выберите модели и отправьте сообщение со ссылками, которые откроют их профили в боте.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 bg-[#EFEEF3] rounded-full text-xs font-medium text-black active:bg-[#E0DEDF] transition-colors"
          >
            Закрыть
          </button>
        </div>

        <div className="flex items-center justify-between bg-[#F6F5F9] rounded-2xl px-3 py-2.5">
          <p className="text-xs text-[#7F7F7F]">
            Выбрано <span className="text-black font-semibold">{selectedIds.length}</span> из <span className="text-black font-semibold">{totalModels}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={shareBotOnly} className="text-xs px-2.5 py-1.5 bg-[#EAF6FF] rounded-full text-[#0A77B8] font-medium">
              Поделиться ботом
            </button>
            {!isSingleModel && (
              <>
                <button onClick={selectAll} className="text-xs px-2.5 py-1.5 bg-[#EFEEF3] rounded-full text-black font-medium">
                  Выбрать все
                </button>
                <button onClick={clearSelection} className="text-xs px-2.5 py-1.5 bg-[#F0F0F3] rounded-full text-[#6B6B75] font-medium">
                  Сбросить
                </button>
              </>
            )}
          </div>
        </div>

        <div ref={listRef} className="max-h-[46dvh] overflow-y-auto grid grid-cols-1 gap-2.5 pr-1">
          {preparedModels.map((model) => (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={`w-full text-left rounded-2xl border p-2.5 flex items-center gap-3 transition-all duration-200 ${
                selectedIds.includes(model.id)
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
                <p className="text-sm font-semibold text-black truncate">
                  {model.name}{model.age ? `, ${model.age}` : ''}
                </p>
                <p className="text-xs text-[#7F7F7F] mt-0.5">
                  {model.price ? `от ฿ ${Number(model.price).toLocaleString()}/ч` : 'Цена не указана'}
                </p>
              </div>
              <div className={`size-5 rounded-full border-2 transition-colors flex items-center justify-center ${
                selectedIds.includes(model.id) ? 'border-[#E2319B] bg-[#E2319B]' : 'border-[#C9C7CF] bg-white'
              }`}>
                {selectedIds.includes(model.id) ? <span className="text-white text-[10px] font-bold leading-none">✓</span> : null}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-[#F6F5F9] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-[#8D8B97] font-semibold">Предпросмотр</p>
          <p className="text-sm text-[#434150] mt-1">
            {previewText}
            {selectedModels.length > 2 ? ` и еще ${selectedModels.length - 2}` : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={shareToTelegram}
            disabled={!canShare}
            className="py-3 rounded-2xl bg-[#E2319B] text-white text-sm font-semibold disabled:opacity-40"
          >
            Отправить в Telegram
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareNative}
              disabled={!canShare}
              className="py-3 rounded-2xl bg-[#EFEEF3] text-black text-sm font-semibold disabled:opacity-40"
            >
              Поделиться
            </button>
            <button
              onClick={copyText}
              disabled={!canShare}
              className="py-3 rounded-2xl bg-black text-white text-sm font-semibold disabled:opacity-40"
            >
              Скопировать текст
            </button>
          </div>
        </div>

        <div className="min-h-5">
          {status ? <p className="text-xs text-[#7F7F7F]">{status}</p> : null}
        </div>
      </div>
    </ModalMiddle>
  )
}