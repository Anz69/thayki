import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import { subscribePrivate } from '@/utils/safeEcho'
import ChatLoadingSkeleton from '@/components/ui/ChatLoadingSkeleton'
import PhotoViewer from '@/components/ui/PhotoViewer'
import GradientBorder from '@/components/ui/GradientBorder'
import { logError } from '@/utils/logger'
import { LeadActionMenu, TypedMessageCard } from '@/views/chat/LeadChatActions'

const TYPED = new Set(['payment_request', 'verification_request', 'model_card'])

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21" fill="none">
    <path d="M14.2275 5.71149L7.31849 12.6205C6.69202 13.247 6.69202 14.2627 7.31849 14.8891C7.94495 15.5156 8.96065 15.5156 9.58712 14.8891L16.393 8.08325C17.646 6.83031 17.646 4.79891 16.393 3.54598C15.1401 2.29305 13.1087 2.29305 11.8558 3.54598L5.15297 10.2488C3.27357 12.1282 3.27357 15.1753 5.15297 17.0547C7.03237 18.9341 10.0795 18.9341 11.9589 17.0547L16.5993 12.4143" stroke="#7F7F7F" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
)

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function normalizeMsg(raw, myUserId) {
  // Side is decided ONLY by who sent it — `is_support` affects styling, never
  // the side (otherwise a manager's own messages flip to the "them" side and
  // duplicate against the optimistic copy).
  const isMe = raw.user_id === myUserId || raw.sender_id === myUserId
  return {
    id: raw.id,
    clientMessageId: raw.client_message_id ?? raw.clientMessageId ?? null,
    from: isMe ? 'user' : 'them',
    isSupport: raw.is_support === true,
    text: raw.body ?? raw.text ?? '',
    time: raw.created_at ? fmtTime(raw.created_at) : (raw.time ?? ''),
    type: raw.type ?? (raw.attachment_url ? 'image' : 'text'),
    payload: raw.payload ?? null,
    attachmentUrl: raw.attachment_url ?? raw.attachmentUrl ?? null,
  }
}

function mergeIncomingMessage(prev, incoming, myId) {
  const n = normalizeMsg(incoming, myId)
  const byServerId = prev.findIndex((m) => String(m.id) === String(n.id))
  if (byServerId !== -1) {
    const next = prev.slice(); next[byServerId] = { ...next[byServerId], ...n, uploading: false }; return next
  }
  if (n.clientMessageId) {
    const i = prev.findIndex((m) => m.clientMessageId === n.clientMessageId)
    if (i !== -1) { const next = prev.slice(); next[i] = { ...next[i], ...n, uploading: false }; return next }
  }
  if (n.from === 'user') {
    const i = prev.findIndex((m) => typeof m.id === 'string' && m.id.startsWith('opt-') && m.from === 'user'
      && String(m.text ?? '').trim() === String(n.text ?? '').trim())
    if (i !== -1) { const next = prev.slice(); next[i] = { ...next[i], ...n, uploading: false }; return next }
  }
  if (n.type === 'image' && n.attachmentUrl) {
    const i = prev.findIndex((m) => m.from === n.from && m.type === 'image' && m.attachmentUrl === n.attachmentUrl)
    if (i !== -1) { const next = prev.slice(); next[i] = { ...next[i], ...n, uploading: false }; return next }
  }
  return [...prev, n]
}

function ManagerNote({ text }) {
  return (
    <div className="flex justify-center my-3 px-2" data-msg>
      <GradientBorder radius={16} borderWidth={1.5} innerClass="px-4 py-3">
        <p className="text-[#5B5B5B] text-[12.5px]/[155%] font-medium text-center max-w-[300px]">
          {text}
        </p>
      </GradientBorder>
    </div>
  )
}

export default function RequestChatPage() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const [params] = useSearchParams()
  const auth     = useAuthStore()
  const myId     = auth.user?.id

  const chatId  = Number(params.get('id') || 0) || null
  const leadId  = params.get('lead')
  // Where the user came from (set by the opener); falls back to home.
  const backTo  = params.get('from') || '/home'

  const role     = auth.user?.role
  const isStaff  = role === 'manager' || role === 'admin'
  const isLead   = !!leadId

  const [messages, setMessages]   = useState([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [viewerSrc, setViewerSrc] = useState(null)

  const hasText = inputText.trim().length > 0

  const sendingRef     = useRef(false)
  const uploadingRef   = useRef(false)
  const fileInputRef   = useRef(null)
  const lastAttachmentKeyRef = useRef({ key: null, ts: 0 })
  const messagesEndRef = useRef(null)
  const headerRef      = useRef(null)
  const messagesRef    = useRef(null)
  const inputBarRef    = useRef(null)
  const textareaRef    = useRef(null)
  const sendWrapRef    = useRef(null)
  const prevMsgCount   = useRef(0)
  const pageReadyDone  = useRef(false)
  const loadDone       = useRef(false)
  const contentState   = useRef('idle')

  const setSendWrapRef = useCallback((el) => {
    sendWrapRef.current = el
    if (el) gsap.set(el, { width: 0, marginLeft: 0, overflow: 'hidden' })
  }, [])

  useEffect(() => {
    const root = document.getElementById('page-root')
    if (root) { root.style.overflowY = 'hidden'; return () => { root.style.overflowY = '' } }
  }, [])

  // ── Entrance + message animations ported 1:1 from the support chat ──
  useLayoutEffect(() => {
    gsap.set(headerRef.current,   { y: -40, autoAlpha: 0 })
    gsap.set(inputBarRef.current, { y: 24,  autoAlpha: 0 })
    if (messagesRef.current) gsap.set(messagesRef.current, { autoAlpha: 0 })
  }, [])

  function animateMessagesIn() {
    if (!messagesRef.current) return
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
    contentState.current = 'messages'
    if (messagesRef.current) gsap.set(messagesRef.current, { autoAlpha: 0 })
    requestAnimationFrame(() => requestAnimationFrame(animateMessagesIn))
  }

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current,   { y: 0, autoAlpha: 1, duration: 0.38, ease: 'expo.out' })
      .to(inputBarRef.current, { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power2.out' }, 0.1)
      .add(() => { pageReadyDone.current = true; tryShowContent() }, 0.12)
  })

  const reloadMessages = useCallback(() => {
    if (!chatId) return
    api.get(`/chats/${chatId}/messages`)
      .then((res) => setMessages((res.data.data ?? []).map((m) => normalizeMsg(m, myId))))
      .catch(logError)
  }, [chatId, myId])

  useEffect(() => {
    if (!chatId) { navigate('/home', { replace: true }); return }
    api.get(`/chats/${chatId}/messages`)
      .then((res) => {
        const normalized = (res.data.data ?? []).map((m) => normalizeMsg(m, myId))
        prevMsgCount.current = normalized.length
        setMessages(normalized)
      })
      .catch(logError)
      .finally(() => { setInitialLoad(false); loadDone.current = true; tryShowContent() })
  }, [chatId, myId, navigate])

  useEffect(() => {
    if (!chatId) return undefined
    return subscribePrivate(`chats.${chatId}`, {
      '.message.sent': (e) => setMessages((prev) => mergeIncomingMessage(prev, e.message ?? e, myId)),
    })
  }, [chatId, myId])

  // New-message pop — identical to the support chat (count-based, so the
  // optimistic→real swap never double-animates).
  useEffect(() => {
    if (contentState.current !== 'messages') return
    const currentCount = messages.length
    const isNewMessage = currentCount > prevMsgCount.current
    prevMsgCount.current = currentCount
    if (!isNewMessage) return

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    const els = messagesRef.current?.querySelectorAll('[data-msg]')
    if (els?.length) {
      const last = els[els.length - 1]
      gsap.fromTo(
        last,
        { y: 18, autoAlpha: 0, scale: 0.94 },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.34,
          ease: 'back.out(2)',
          clearProps: 'transform,opacity,visibility',
        },
      )
    }
  }, [messages])

  useEffect(() => {
    const el = sendWrapRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.to(el, hasText
      ? { width: 44, marginLeft: 10, duration: 0.38, ease: 'back.out(2.5)' }
      : { width: 0, marginLeft: 0, duration: 0.22, ease: 'power3.in' })
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
    setMessages((prev) => [...prev, { id: optimisticId, from: 'user', text, type: 'text', time: fmtTime(new Date().toISOString()) }])
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const { data } = await api.post(`/chats/${chatId}/messages`, { body: text, client_message_id: clientMessageId }, {
        headers: { 'Idempotency-Key': `msg-${chatId}-${optimisticId}` },
      })
      setMessages((prev) => mergeIncomingMessage(prev, data.data, myId))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
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
    if (lastAttachmentKeyRef.current.key === attachmentKey && nowTs - lastAttachmentKeyRef.current.ts < 5000) return
    lastAttachmentKeyRef.current = { key: attachmentKey, ts: nowTs }

    uploadingRef.current = true
    setUploading(true)
    const clientMessageId = `cmsg-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticId = `opt-${clientMessageId}`
    const previewUrl = URL.createObjectURL(file)
    setMessages((prev) => [...prev, {
      id: optimisticId,
      clientMessageId,
      from: 'user',
      text: '',
      type: 'image',
      attachmentUrl: previewUrl,
      uploading: true,
      time: fmtTime(new Date().toISOString()),
    }])

    try {
      const fd = new FormData()
      fd.append('attachment', file)
      fd.append('client_message_id', clientMessageId)
      const { data } = await api.post(`/chats/${chatId}/messages`, fd, {
        headers: { 'Idempotency-Key': `att-${attachmentKey}` },
      })
      setMessages((prev) => mergeIncomingMessage(prev, data.data, myId))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
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
            onClick={() => navigate(backTo)}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500] max-w-[60%] truncate">
            {params.get('title') || `${t('requestChat.title')}${leadId ? ` #${leadId}` : ''}`}
          </span>
        </div>
      </header>

      <div className="flex-1 relative min-h-0 container">
        {initialLoad && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col pt-4">
            <ChatLoadingSkeleton />
          </div>
        )}

        <div ref={messagesRef} className="absolute inset-0 overflow-y-auto">
          <div className="flex flex-col px-4 py-4 gap-0 container">
            {messages.map((msg, idx) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} data-msg data-msg-id={msg.id} className="flex justify-center my-3">
                    <span className="max-w-[300px] text-center text-[#8A8A8A] text-[13px]/[140%] font-medium bg-[#F2F2F5] rounded-2xl px-4 py-2.5">
                      {msg.text}
                    </span>
                  </div>
                )
              }

              if (TYPED.has(msg.type)) {
                return (
                  <TypedMessageCard
                    key={msg.id}
                    msg={msg}
                    isManager={isStaff}
                    leadId={leadId}
                    onPosted={reloadMessages}
                  />
                )
              }

              const isUser = msg.from === 'user'
              const prevMsg = messages[idx - 1]
              const isFirstInGroup = !prevMsg || prevMsg.from !== msg.from
              const gap = isFirstInGroup && idx > 0 ? 'mt-3' : 'mt-1'

              const bubble = msg.type === 'image' ? (
                <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className="w-[180px] h-[160px] rounded-2xl overflow-hidden bg-[#F0F0F0] relative cursor-pointer active:opacity-80 transition-opacity"
                    onClick={() => msg.attachmentUrl && !msg.uploading && setViewerSrc(msg.attachmentUrl)}
                  >
                    {msg.attachmentUrl && <img src={msg.attachmentUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />}
                    {msg.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className="text-[#ABABAB] text-xs font-medium px-1">{msg.time}</span>
                </div>
              ) : (
                <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={['max-w-[260px] px-4 py-3 rounded-3xl', isUser ? 'bg-[#1C1C1E] text-[#D2D2D2]' : 'bg-[#F0F0F0] text-black'].join(' ')}>
                    <p className="text-[15px]/[148%] font-normal" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  </div>
                  <span className="text-[#ABABAB] text-xs font-medium px-1">{msg.time}</span>
                </div>
              )

              return (
                <div key={msg.id}>
                  <div data-msg data-msg-id={msg.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${gap}`}>
                    {bubble}
                  </div>
                  {idx === 0 && <ManagerNote text={t('requestChat.managerNote')} />}
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
          {isStaff && isLead ? (
            <LeadActionMenu
              leadId={leadId}
              onPickMedia={() => fileInputRef.current?.click()}
              onPosted={reloadMessages}
            />
          ) : (
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
          )}
          <div className="flex-1 min-w-0 bg-[#EFEEF3] rounded-[22px] px-4 py-3 overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              placeholder={t('requestChat.placeholder')}
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
