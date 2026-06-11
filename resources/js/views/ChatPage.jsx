import { useState, useRef, useEffect, useLayoutEffect, useCallback, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import CopyableContacts from '@/components/ui/CopyableContacts'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useAuthStore from '@/stores/useAuthStore'
import api, { extractErrorMessage } from '@/utils/api'
import { subscribePrivate } from '@/utils/safeEcho'
import {
  formatRussianRelative,
  formatRussianDaySeparator,
  isSameDay,
  isOnlineNow,
} from '@/utils/datetime'
import PhotoViewer from '@/components/ui/PhotoViewer'

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21" fill="none">
    <path d="M14.2275 5.71149L7.31849 12.6205C6.69202 13.247 6.69202 14.2627 7.31849 14.8891C7.94495 15.5156 8.96065 15.5156 9.58712 14.8891L16.393 8.08325C17.646 6.83031 17.646 4.79891 16.393 3.54598C15.1401 2.29305 13.1087 2.29305 11.8558 3.54598L5.15297 10.2488C3.27357 12.1282 3.27357 15.1753 5.15297 17.0547C7.03237 18.9341 10.0795 18.9341 11.9589 17.0547L16.5993 12.4143" stroke="#7F7F7F" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
)

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)

function normalizeMsg(raw, myUserId) {
  const isMe = raw.user_id === myUserId || raw.sender_id === myUserId
  const time = raw.created_at
    ? (() => {
        const d = new Date(raw.created_at)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })()
    : raw.time ?? ''
  return {
    id:           raw.id,
    clientMessageId: raw.client_message_id ?? raw.clientMessageId ?? null,
    from:         isMe ? 'user' : 'them',
    text:         raw.body ?? raw.text ?? '',
    time,
    createdAt:    raw.created_at ?? null,
    type:         raw.type ?? (raw.attachment_url ? 'image' : 'text'),
    attachmentUrl: raw.attachment_url ?? raw.attachmentUrl ?? null,
    showAvatar:   raw.showAvatar ?? false,
    senderName:   raw.user?.name ?? raw.sender?.name ?? '',
    senderAvatar: raw.user?.avatar ?? raw.sender?.avatar ?? null,
    readAt:       raw.read_at ?? raw.readAt ?? null,
  }
}

function mergeIncomingMessage(prev, incoming, myId) {
  const normalized = normalizeMsg(incoming, myId)

  const byServerId = prev.findIndex((m) => String(m.id) === String(normalized.id))
  if (byServerId !== -1) {
    const next = prev.slice()
    next[byServerId] = { ...next[byServerId], ...normalized, uploading: false }
    return next
  }

  if (normalized.clientMessageId) {
    const byClientId = prev.findIndex((m) => m.clientMessageId === normalized.clientMessageId)
    if (byClientId !== -1) {
      const next = prev.slice()
      next[byClientId] = { ...next[byClientId], ...normalized, uploading: false }
      return next
    }
  }

  const normalizedText = String(normalized.text ?? '').trim()
  const normalizedTime = normalized.createdAt ? new Date(normalized.createdAt).getTime() : null
  if (normalized.from === 'user') {
    const fallbackIdx = prev.findIndex((m) => {
      if (m.from !== 'user') return false
      if (!(typeof m.id === 'string' && m.id.startsWith('opt-'))) return false
      const sameText = String(m.text ?? '').trim() === normalizedText
      if (!sameText) return false
      if (!normalizedTime) return true
      if (!m.time) return true
      return true
    })
    if (fallbackIdx !== -1) {
      const next = prev.slice()
      next[fallbackIdx] = { ...next[fallbackIdx], ...normalized, uploading: false }
      return next
    }
  }

  if (normalized.type === 'image' && normalized.attachmentUrl) {
    const incomingTs = normalized.createdAt ? new Date(normalized.createdAt).getTime() : null
    const duplicateImageIdx = prev.findIndex((m) => {
      if (m.from !== normalized.from) return false
      if (m.type !== 'image') return false
      if (!m.attachmentUrl) return false
      if (m.attachmentUrl !== normalized.attachmentUrl) return false

      if (!incomingTs || !m.createdAt) return true
      const existingTs = new Date(m.createdAt).getTime()
      return Math.abs(existingTs - incomingTs) <= 5000
    })

    if (duplicateImageIdx !== -1) {
      const next = prev.slice()
      next[duplicateImageIdx] = { ...next[duplicateImageIdx], ...normalized, uploading: false }
      return next
    }
  }

  return [...prev, normalized]
}

function AvatarImg({ src, name, size, className = '' }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const letter = (String(name || '?').trim()[0] ?? '?').toUpperCase()

  useEffect(() => { setLoaded(false); setFailed(false) }, [src])

  if (!src || failed) {
    return (
      <div
        style={{ width: size, height: size, background: '#E5E5EA', flexShrink: 0 }}
        className={`rounded-full flex items-center justify-center text-[#7F7F7F] font-semibold ${className}`}
      >
        <span style={{ fontSize: Math.round(size * 0.42) }}>{letter}</span>
      </div>
    )
  }

  return (
    <div className={`relative rounded-full overflow-hidden ${className}`} style={{ width: size, height: size, flexShrink: 0, background: '#F0F0F0' }}>
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(110deg, #F0F0F0 30%, #E5E5EA 50%, #F0F0F0 70%)', backgroundSize: '200% 100%', animation: 'avatar-shimmer 1.4s linear infinite' }}
      />
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className={`absolute inset-0 object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      <style>{`@keyframes avatar-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  )
}

export default function ChatPage() {
  const { t }       = useTranslation()
  const navigate    = useTransitionNavigate()
  const [params]    = useSearchParams()
  const chatId      = params.get('id')
  const auth        = useAuthStore()
  const myId        = auth.user?.id

  const [messages, setMessages]     = useState([])
  const [chatInfo, setChatInfo]     = useState(null)
  const [inputText, setInputText]   = useState('')
  const [loading, setLoading]       = useState(!!chatId)
  const [sending, setSending]       = useState(false)
  const [loadError, setLoadError]   = useState(null)
  const [reloadKey, setReloadKey]   = useState(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const hasText         = inputText.trim().length > 0
  const messagesEndRef  = useRef(null)
  const headerRef       = useRef(null)
  const listRef         = useRef(null)
  const inputBarRef     = useRef(null)
  const textareaRef     = useRef(null)
  const sendWrapRef     = useRef(null)
  const isFirstRender     = useRef(true)
  const prevMsgCount      = useRef(0)
  const entranceComplete  = useRef(false)
  const pageReadyDone     = useRef(false)
  const loadDoneRef       = useRef(false)

  const setSendWrapRef = useCallback((el) => {
    sendWrapRef.current = el
    if (el) gsap.set(el, { width: 0, marginLeft: 0, overflow: 'hidden' })
  }, [])

  useEffect(() => {
    const pageRoot = document.getElementById('page-root')
    if (pageRoot) {
      pageRoot.style.overflowY = 'hidden'
      return () => { pageRoot.style.overflowY = '' }
    }
  }, [])

  useEffect(() => {
    if (!chatId) { setLoading(false); setInitialLoad(false); setLoadError(null); return }

    setLoading(true)
    setLoadError(null)
    setMessages([])
    setChatInfo(null)

    let cancelled = false

    Promise.all([
      api.get(`/chats/${chatId}/messages`),
      api.get('/chats').catch(() => ({ data: { data: [] } })),
    ]).then(([msgsRes, chatsRes]) => {
      if (cancelled || !isMountedRef.current) return
      const rawMsgs = msgsRes.data.data ?? []
      setMessages(rawMsgs.map(m => normalizeMsg(m, myId)))

      const chats = chatsRes.data.data ?? []
      const info  = chats.find(c => String(c.id) === String(chatId))
      if (info) setChatInfo(info)
    }).catch((err) => {
      if (cancelled || !isMountedRef.current) return
      setLoadError(extractErrorMessage(err, t('chat.loadError')))
    }).finally(() => {
      if (cancelled || !isMountedRef.current) return
      setLoading(false)
    })

    const pollInterval = setInterval(() => {
      api.get('/chats').then(res => {
        if (cancelled || !isMountedRef.current) return
        const chats = res.data.data ?? []
        const info = chats.find(c => String(c.id) === String(chatId))
        if (info) setChatInfo(info)
      }).catch(() => {})
    }, 30_000)

    return () => { cancelled = true; clearInterval(pollInterval) }
  }, [chatId, myId, reloadKey])

  useEffect(() => {
    if (!chatId) return undefined
    const unsub = subscribePrivate(`chats.${chatId}`, {
      '.message.sent': (e) => {
        if (!isMountedRef.current) return
        const msg = e.message ?? e
        setMessages(prev => mergeIncomingMessage(prev, msg, myId))
      },
      '.messages.read': (e) => {
        if (!isMountedRef.current) return
        if (e.user_id === myId) return
        setMessages(prev => prev.map(m =>
          m.from === 'user' && !m.readAt ? { ...m, readAt: e.read_at } : m
        ))
      },
    })
    return unsub
  }, [chatId, myId])

  useEffect(() => {
    if (!chatId) return
    api.post(`/chats/${chatId}/read`).catch(() => {})
  }, [chatId])

  const runListEntrance = useCallback(() => {
    if (!listRef.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    const msgs = listRef.current.querySelectorAll('[data-msg]')
    if (!msgs.length) {
      gsap.set(listRef.current, { autoAlpha: 1 })
      entranceComplete.current = true
      return
    }
    gsap.set(msgs, { y: 10, autoAlpha: 0 })
    gsap.set(listRef.current, { autoAlpha: 1 })
    gsap.to(msgs, {
      y: 0,
      autoAlpha: 1,
      duration: 0.3,
      stagger: 0.025,
      ease: 'power3.out',
      clearProps: 'transform,opacity,visibility',
      onComplete: () => {
        const n = listRef.current?.querySelectorAll('[data-msg]')?.length ?? 0
        prevMsgCount.current = n
        entranceComplete.current = true
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
      },
    })
  }, [])

  const tryShowContent = useCallback(() => {
    if (!pageReadyDone.current || !loadDoneRef.current) return
    if (entranceComplete.current) return
    requestAnimationFrame(() => requestAnimationFrame(() => runListEntrance()))
  }, [runListEntrance])

  useLayoutEffect(() => {
    if (headerRef.current) gsap.set(headerRef.current, { y: -44, autoAlpha: 0 })
    if (inputBarRef.current) gsap.set(inputBarRef.current, { y: 32, autoAlpha: 0 })
    if (listRef.current) gsap.set(listRef.current, { autoAlpha: 0 })
  }, [])

  usePageReady(() => {
    const head = headerRef.current
    const bar = inputBarRef.current
    if (head && bar) {
      gsap.timeline()
        .to(head, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'expo.out' })
        .to(bar, { y: 0, autoAlpha: 1, duration: 0.38, ease: 'power2.out' }, 0.1)
    }
    pageReadyDone.current = true
    tryShowContent()
  })

  useEffect(() => {
    entranceComplete.current = false
    loadDoneRef.current = false
    prevMsgCount.current = 0
    isFirstRender.current = true
    if (listRef.current) gsap.set(listRef.current, { autoAlpha: 0 })
  }, [chatId])

  useEffect(() => {
    if (loading) return
    if (!chatId) {
      entranceComplete.current = true
      loadDoneRef.current = true
      if (listRef.current) gsap.set(listRef.current, { autoAlpha: 1 })
      return
    }
    loadDoneRef.current = true
    tryShowContent()
  }, [loading, chatId, tryShowContent])

  useEffect(() => {
    const currentCount = messages.length
    const isNew = entranceComplete.current
      && currentCount > prevMsgCount.current
      && !loading

    if (isNew) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      if (listRef.current) {
        const msgs = listRef.current.querySelectorAll('[data-msg]')
        if (msgs.length) {
          const last = msgs[msgs.length - 1]
          const prev = msgs.length > 1 ? msgs[msgs.length - 2] : null
          const targets = prev ? [prev, last] : [last]
          gsap.fromTo(
            targets,
            { y: 18, autoAlpha: 0, scale: 0.94 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              duration: 0.32,
              stagger: 0.04,
              ease: 'back.out(2)',
              clearProps: 'transform,opacity,visibility',
            },
          )
        }
      }
      prevMsgCount.current = currentCount
    }
    isFirstRender.current = false
  }, [messages, loading])

  useEffect(() => {
    const el = sendWrapRef.current
    if (!el) return
    gsap.killTweensOf(el)
    if (hasText) {
      gsap.to(el, { width: 44, marginLeft: 10, duration: 0.38, ease: 'back.out(2.5)' })
    } else {
      gsap.to(el, { width: 0, marginLeft: 0, duration: 0.22, ease: 'power3.in' })
    }
  }, [hasText])

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const sendingRef = useRef(false)
  const uploadingRef = useRef(false)
  const lastAttachmentKeyRef = useRef({ key: null, ts: 0 })
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [viewerSrc, setViewerSrc] = useState(null)

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || sendingRef.current || !chatId) return

    sendingRef.current = true
    setSending(true)

    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticId = `opt-${clientMessageId}`
    const optimistic = {
      id:   optimisticId,
      clientMessageId,
      from: 'user',
      text,
      type: 'text',
      status: 'pending',
      time: (() => {
        const now = new Date()
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      })(),
    }
    setMessages(prev => [...prev, optimistic])
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const idempotencyKey = `msg-${chatId}-${optimisticId}`
    try {
      const { data } = await api.post(`/chats/${chatId}/messages`, { body: text, client_message_id: clientMessageId }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      if (!isMountedRef.current) return
      setMessages(prev => mergeIncomingMessage(prev, data.data, myId))
    } catch {
      if (isMountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        setInputText((prev) => prev || text)
      }
    } finally {
      sendingRef.current = false
      if (isMountedRef.current) setSending(false)
    }
  }

  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !chatId || uploadingRef.current) return

    const attachmentKey = `${chatId}:${file.name}:${file.size}:${file.lastModified}`
    const nowTs = Date.now()
    if (
      lastAttachmentKeyRef.current.key === attachmentKey
      && nowTs - lastAttachmentKeyRef.current.ts < 5000
    ) {
      return
    }
    lastAttachmentKeyRef.current = { key: attachmentKey, ts: nowTs }

    uploadingRef.current = true
    setUploading(true)
    const clientMessageId = `cmsg-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticId = `opt-${clientMessageId}`
    const previewUrl = URL.createObjectURL(file)
    setMessages(prev => [...prev, {
      id: optimisticId,
      clientMessageId,
      from: 'user',
      text: '',
      type: 'image',
      attachmentUrl: previewUrl,
      attachmentMime: file.type,
      uploading: true,
      status: 'pending',
      time: (() => {
        const now = new Date()
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      })(),
    }])

    try {
      const fd = new FormData()
      fd.append('attachment', file)
      fd.append('client_message_id', clientMessageId)
      const { data } = await api.post(`/chats/${chatId}/messages`, fd, {
        headers: { 'Idempotency-Key': `att-${attachmentKey}` },
      })
      if (!isMountedRef.current) return
      setMessages(prev => mergeIncomingMessage(prev, data.data, myId))
    } catch {
      if (isMountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
      }
    } finally {
      try { URL.revokeObjectURL(previewUrl) } catch {}
      uploadingRef.current = false
      if (isMountedRef.current) setUploading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const contactName   = chatInfo?.other_user?.name ?? chatInfo?.name ?? messages.find(m => m.from === 'them')?.senderName ?? t('chat.title')
  const contactAvatar = chatInfo?.other_user?.avatar ?? chatInfo?.avatar ?? messages.find(m => m.from === 'them')?.senderAvatar ?? null

  return (
    <section className="flex flex-col bg-white overflow-hidden" style={{ height: '100dvh' }}>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
      <header ref={headerRef} className="w-full py-5 bg-white shrink-0">
        <div className="container flex items-center justify-between relative">
          <button
            onClick={() => navigate(-1) ? navigate('/home') : null}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-base/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('chat.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-medium truncate max-w-[140px]">
            {contactName}
          </span>
          <button
            onClick={() => navigate('/support')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-base/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('chat.support')}
          </button>
        </div>
      </header>

      <div className="flex-1 relative min-h-0">
        <div ref={listRef} className="absolute inset-0 overflow-y-auto">
          <div className="flex flex-col px-4 py-4 gap-0 container min-h-0">

            <div data-msg className="flex flex-col items-center gap-3 mb-6">
              <AvatarImg src={contactAvatar} name={contactName} size={80} />
              <div className="inline-flex items-center justify-center bg-[#F5F5F7] rounded-full px-4 py-2">
                <span className="text-[#7F7F7F] text-sm font-medium leading-normal text-center">
                  {chatInfo?.other_user?.last_seen_at
                    ? isOnlineNow(chatInfo.other_user.last_seen_at)
                      ? t('chat.online')
                      : formatRussianRelative(chatInfo.other_user.last_seen_at, { feminine: true })
                    : contactName}
                </span>
              </div>
            </div>

            {!loading && loadError && (
              <div data-msg className="flex flex-col items-center gap-3 py-8">
                <div className="text-[#7F7F7F] text-sm text-center max-w-[260px]">
                  {loadError}
                </div>
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="px-4 py-2.5 bg-[#EFEEF3] text-black text-sm font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
                >
                  {t('chat.retry')}
                </button>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isUser        = msg.from === 'user'
              const prevMsg       = messages[idx - 1]
              const nextMsg       = messages[idx + 1]
              const isLastInGroup = !nextMsg || nextMsg.from !== msg.from
              const gap           = idx > 0 ? 'mt-3' : ''
              const showDaySep = msg.createdAt && (
                idx === 0 || !isSameDay(prevMsg?.createdAt, msg.createdAt)
              )
              const daySepEl = showDaySep
                ? (
                  <div data-msg key={`sep-${msg.id}`} className="flex justify-center my-5">
                    <span className="text-[#7F7F7F] text-sm/[100%] font-medium">
                      {formatRussianDaySeparator(msg.createdAt)}
                    </span>
                  </div>
                )
                : null

              if (msg.type === 'image') {
                const imgSrc = msg.attachmentUrl
                return (
                  <Fragment key={msg.id}>
                    {daySepEl}
                    <div data-msg className={`flex items-end gap-4 ${isUser ? 'justify-end' : 'justify-start'} ${gap}`}>
                      {!isUser && (
                        <div className="w-9 shrink-0 self-end">
                          {isLastInGroup && (
                            contactAvatar
                              ? <img src={contactAvatar} alt="" className="size-10 min-w-10 rounded-3xl object-cover" />
                              : <div className="size-10 min-w-10 rounded-3xl bg-[#E5E5EA] flex items-center justify-center">
                                  <span className="text-[#7F7F7F] text-sm font-bold">{contactName[0]?.toUpperCase()}</span>
                                </div>
                          )}
                        </div>
                      )}
                      <div
                        className="w-[180px] h-[160px] rounded-2xl overflow-hidden bg-[#F0F0F0] relative cursor-pointer active:opacity-80 transition-opacity"
                        onClick={() => imgSrc && !msg.uploading && setViewerSrc(imgSrc)}
                      >
                        {imgSrc && (
                          <img
                            src={imgSrc}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        {msg.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Fragment>
                )
              }

              return (
                <Fragment key={msg.id}>
                  {daySepEl}
                  <div
                    data-msg
                    className={`flex items-end gap-4 ${isUser ? 'justify-end' : 'justify-start'} ${gap}`}
                  >
                    {!isUser && (
                      <div className="w-9 shrink-0 self-end">
                        {isLastInGroup && (
                          contactAvatar
                            ? <img src={contactAvatar} alt="" className="size-10 min-w-10 rounded-3xl object-cover" />
                            : <div className="size-10 min-w-10 rounded-3xl bg-[#E5E5EA] flex items-center justify-center">
                                <span className="text-[#7F7F7F] text-sm font-bold">{contactName[0]?.toUpperCase()}</span>
                              </div>
                        )}
                      </div>
                    )}
                    <div
                      className={[
                        'max-w-[72%] p-4.5 py-3',
                        isUser
                          ? 'bg-[#232323] text-[#D8D8D8] rounded-3xl'
                          : 'bg-[#F0F0F0] text-[#3E3C3C] rounded-3xl',
                      ].join(' ')}
                      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    >
                      <p className="text-[16px]/[100%] font-normal whitespace-pre-wrap"><CopyableContacts text={msg.text} /></p>
                    </div>
                  </div>
                </Fragment>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div ref={inputBarRef} className="bg-white px-4 py-3 pb-8 shrink-0 container">
        {['completed', 'cancelled', 'rejected', 'expired'].includes(chatInfo?.meeting_status) ? (
          <div className="w-full py-3 px-4 bg-[#F5F5F7] rounded-2xl text-center text-sm text-[#7F7F7F] font-medium">
            {t('chat.meetingClosed')}
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAttachmentChange}
            />
            <div className="flex items-end">
              <button
                type="button"
                disabled={uploading || !chatId}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 size-11 bg-[#EFEEF3] rounded-full flex items-center justify-center active:opacity-60 transition-opacity mr-3 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#7F7F7F] border-t-transparent animate-spin" />
                ) : (
                  <PaperclipIcon />
                )}
              </button>

              <div className="flex-1 min-w-0 bg-[#EFEEF3] rounded-[22px] px-4 py-3 overflow-hidden">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => { setInputText(e.target.value); autoResize() }}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder')}
                  className="w-full bg-transparent text-black text-[16px]/[145%] font-normal outline-none placeholder:text-[#ABABAB] resize-none"
                  style={{ maxHeight: 120, display: 'block', overflowY: 'auto', wordBreak: 'break-word', overflowWrap: 'break-word' }}
                />
              </div>

              <div ref={setSendWrapRef} className="shrink-0 overflow-hidden">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="size-11 rounded-full bg-[#E2319B] text-white flex items-center justify-center active:scale-90 transition-transform shrink-0"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
