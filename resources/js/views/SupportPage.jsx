import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import { subscribePrivate } from '@/utils/safeEcho'
import ChatLoadingSkeleton from '@/components/ui/ChatLoadingSkeleton'
import PhotoViewer from '@/components/ui/PhotoViewer'
import { logError } from '@/utils/logger'

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
  const isSupport = raw.is_support === true
  const isMe = !isSupport && (raw.user_id === myUserId || raw.sender_id === myUserId)
  const time = raw.created_at
    ? (() => {
        const d = new Date(raw.created_at)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })()
    : raw.time ?? ''
  return {
    id: raw.id,
    clientMessageId: raw.client_message_id ?? raw.clientMessageId ?? null,
    from: isMe ? 'user' : 'them',
    isSupport,
    text: raw.body ?? raw.text ?? '',
    time,
    type: raw.type ?? (raw.attachment_url ? 'image' : 'text'),
    attachmentUrl: raw.attachment_url ?? raw.attachmentUrl ?? null,
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

  if (normalized.from === 'user') {
    const fallbackIdx = prev.findIndex((m) =>
      typeof m.id === 'string'
      && m.id.startsWith('opt-')
      && m.from === 'user'
      && String(m.text ?? '').trim() === String(normalized.text ?? '').trim(),
    )
    if (fallbackIdx !== -1) {
      const next = prev.slice()
      next[fallbackIdx] = { ...next[fallbackIdx], ...normalized, uploading: false }
      return next
    }
  }

  if (normalized.type === 'image' && normalized.attachmentUrl) {
    const duplicateImageIdx = prev.findIndex((m) =>
      m.from === normalized.from
      && m.type === 'image'
      && m.attachmentUrl === normalized.attachmentUrl,
    )
    if (duplicateImageIdx !== -1) {
      const next = prev.slice()
      next[duplicateImageIdx] = { ...next[duplicateImageIdx], ...normalized, uploading: false }
      return next
    }
  }

  return [...prev, normalized]
}


export default function SupportPage() {
  const navigate = useTransitionNavigate()
  const auth     = useAuthStore()
  const myId     = auth.user?.id

  const [messages,  setMessages]  = useState([])
  const [inputText, setInputText] = useState('')
  const [chatId,    setChatId]    = useState(null)
  const [sending,   setSending]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [viewerSrc, setViewerSrc] = useState(null)

  const hasText = inputText.trim().length > 0

  const contentState  = useRef('idle')
  const pageReadyDone = useRef(false)
  const loadDone      = useRef(false)
  const initMsgs      = useRef([])
  const prevMsgCount  = useRef(0)
  const sendingRef       = useRef(false)
  const uploadingRef     = useRef(false)
  const fileInputRef     = useRef(null)
  const lastAttachmentKeyRef = useRef({ key: null, ts: 0 })

  const messagesEndRef = useRef(null)
  const headerRef      = useRef(null)
  const emptyRef       = useRef(null)
  const messagesRef    = useRef(null)
  const inputBarRef    = useRef(null)
  const textareaRef    = useRef(null)
  const sendWrapRef    = useRef(null)
  const titleRef       = useRef(null)
  const subtitleRef    = useRef(null)

  const setSendWrapRef = useCallback((el) => {
    sendWrapRef.current = el
    if (el) gsap.set(el, { width: 0, marginLeft: 0, overflow: 'hidden' })
  }, [])

  useEffect(() => {
    const root = document.getElementById('page-root')
    if (root) {
      root.style.overflowY = 'hidden'
      return () => { root.style.overflowY = '' }
    }
  }, [])

  function animateEmptyIn() {
    gsap.set(emptyRef.current, { autoAlpha: 1 })
    gsap.fromTo(titleRef.current,
      { y: 14, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.44, ease: 'power3.out', delay: 0.08 },
    )
    gsap.fromTo(subtitleRef.current,
      { y: 10, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.38, ease: 'power3.out', delay: 0.18 },
    )
  }

  function animateEmptyOut(onComplete) {
    gsap.to([titleRef.current, subtitleRef.current], {
      y: -12, autoAlpha: 0, duration: 0.20, ease: 'power2.in', stagger: 0.04,
      onComplete: () => {
        gsap.set(emptyRef.current, { autoAlpha: 0 })
        onComplete?.()
      },
    })
  }

  function animateMessagesIn() {
    if (!messagesRef.current) return
    // Keep initial viewport pinned to the latest message to avoid
    // top flash before the list settles to bottom.
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    gsap.set(messagesRef.current, { autoAlpha: 1 })
    const els = messagesRef.current.querySelectorAll('[data-msg]')
    if (els.length) {
      gsap.set(els, { y: 8, autoAlpha: 0 })
      gsap.to(els, {
        y: 0,
        autoAlpha: 1,
        duration: 0.28,
        stagger: 0.03,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      })
    }
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }))
  }

  function tryShowContent() {
    if (!pageReadyDone.current || !loadDone.current) return
    if (contentState.current !== 'idle') return

    if (initMsgs.current.length > 0) {
      contentState.current = 'messages'
      gsap.set(emptyRef.current, { autoAlpha: 0 })
      requestAnimationFrame(() => {
        requestAnimationFrame(animateMessagesIn)
      })
    } else {
      contentState.current = 'empty'
      animateEmptyIn()
    }
  }

  useLayoutEffect(() => {
    gsap.set(headerRef.current,   { y: -40, autoAlpha: 0 })
    gsap.set(inputBarRef.current, { y: 24,  autoAlpha: 0 })
    gsap.set(emptyRef.current,    { autoAlpha: 0 })
    if (messagesRef.current) gsap.set(messagesRef.current, { autoAlpha: 0 })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current,   { y: 0, autoAlpha: 1, duration: 0.38, ease: 'expo.out' })
      .to(inputBarRef.current, { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power2.out' }, 0.1)
      .add(() => {
        pageReadyDone.current = true
        tryShowContent()
      }, 0.12)
  })

  useEffect(() => {
    api.get('/chats/support')
      .then(({ data }) => {
        const id = data.data?.id
        setChatId(id)
        return id ? api.get(`/chats/${id}/messages`) : null
      })
      .then((res) => {
        if (!res) return
        const normalized = (res.data.data ?? []).map(m => normalizeMsg(m, myId))
        initMsgs.current = normalized
        prevMsgCount.current = normalized.length
        setMessages(normalized)
      })
      .catch(logError)
      .finally(() => {
        loadDone.current = true
        setInitialLoad(false)
        tryShowContent()
      })
  }, [myId])

  useEffect(() => {
    if (!chatId) return undefined
    return subscribePrivate(`chats.${chatId}`, {
      '.message.sent': (e) => {
        setMessages(prev => mergeIncomingMessage(prev, e.message ?? e, myId))
      },
      '.messages.read': (e) => {
        if (e.user_id === myId) return
        setMessages(prev => prev.map(m =>
          m.from === 'user' && !m.readAt ? { ...m, readAt: e.read_at } : m
        ))
      },
    })
  }, [chatId, myId])

  useEffect(() => {
    const state = contentState.current
    if (state === 'idle') return

    const currentCount = messages.length
    const isNewMessage = currentCount > prevMsgCount.current
    prevMsgCount.current = currentCount

    if (state === 'empty' && currentCount > 0) {
      contentState.current = 'messages'
      prevMsgCount.current = currentCount
      animateEmptyOut(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(animateMessagesIn)
        })
      })
      return
    }

    if (state === 'messages' && isNewMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      const els = messagesRef.current?.querySelectorAll('[data-msg]')
      if (els?.length) {
        const last = els[els.length - 1]
        const prev = els.length > 1 ? els[els.length - 2] : null
        const targets = prev ? [prev, last] : [last]
        gsap.fromTo(
          targets,
          { y: 18, autoAlpha: 0, scale: 0.94 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.34,
            stagger: 0.05,
            ease: 'back.out(2)',
            clearProps: 'transform,opacity,visibility',
          },
        )
      }
    }
  }, [messages])

  useEffect(() => {
    const el = sendWrapRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.to(el, hasText
      ? { width: 44, marginLeft: 10, duration: 0.38, ease: 'back.out(2.5)' }
      : { width: 0,  marginLeft: 0,  duration: 0.22, ease: 'power3.in'    }
    )
  }, [hasText])

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || sendingRef.current || !chatId) return

    sendingRef.current = true
    setSending(true)

    const optimisticId = `opt-${Date.now()}`
    const optimistic = {
      id: optimisticId, from: 'user', text,
      type: 'text',
      time: (() => {
        const now = new Date()
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      })(),
    }
    setMessages(prev => [...prev, optimistic])
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const idempotencyKey = `msg-${chatId}-${optimisticId}`
    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const { data } = await api.post(`/chats/${chatId}/messages`, { body: text, client_message_id: clientMessageId }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      setMessages(prev => mergeIncomingMessage(prev, data.data, myId))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    } finally {
      sendingRef.current = false
      setSending(false)
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
      uploading: true,
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
      setMessages(prev => mergeIncomingMessage(prev, data.data, myId))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    } finally {
      try { URL.revokeObjectURL(previewUrl) } catch {}
      uploadingRef.current = false
      setUploading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <section className="flex flex-col bg-white overflow-hidden" style={{ height: '100dvh' }}>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      <header ref={headerRef} className="w-full py-4 bg-white shrink-0">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate(-1) ? navigate('/home') : null}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            Назад
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500]">
            Поддержка
          </span>
        </div>
      </header>

      <div className="flex-1 relative min-h-0 container">
        {initialLoad && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col pt-4">
            <ChatLoadingSkeleton />
          </div>
        )}

        <div
          ref={emptyRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center pointer-events-none"
          style={{ visibility: 'hidden' }}
        >
          <span ref={titleRef} className="text-black text-2xl/[100%] font-semibold">
            У вас возник вопрос?
          </span>
          <span ref={subtitleRef} className="text-[#777779] text-base/[130%] font-medium">
            Напишите нам — мы ответим в ближайшее время
          </span>
        </div>

        <div
          ref={messagesRef}
          className="absolute inset-0 overflow-y-auto"
          style={{ visibility: 'hidden' }}
        >
          <div className="flex flex-col px-4 py-4 gap-0 container">
            {messages.map((msg, idx) => {
              const isUser         = msg.from === 'user'
              const prevMsg        = messages[idx - 1]
              const isFirstInGroup = !prevMsg || prevMsg.from !== msg.from
              const gap            = isFirstInGroup && idx > 0 ? 'mt-3' : 'mt-1'

              if (msg.type === 'image') {
                const imgSrc = msg.attachmentUrl
                return (
                  <div
                    key={msg.id}
                    data-msg
                    className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${gap}`}
                  >
                    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
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
                      <span className="text-[#ABABAB] text-xs font-medium px-1">{msg.time}</span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  data-msg
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${gap}`}
                >
                  <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={[
                      'max-w-[260px] px-4 py-3',
                      isUser
                        ? 'bg-[#1C1C1E] text-[#D2D2D2] rounded-3xl '
                        : 'bg-[#F0F0F0] text-black rounded-3xl ',
                    ].join(' ')}>
                      <p className="text-[15px]/[148%] font-normal" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </p>
                    </div>
                    <span className="text-[#ABABAB] text-xs font-medium px-1">{msg.time}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div ref={inputBarRef} className="bg-white px-4 py-3 pb-8 shrink-0 container">
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
              placeholder="Сообщение..."
              className="w-full bg-transparent text-black text-[15px]/[145%] font-normal outline-none placeholder:text-[#ABABAB] resize-none"
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
      </div>
    </section>
  )
}
