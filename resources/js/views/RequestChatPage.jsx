import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import { subscribePrivate, privateChannel } from '@/utils/safeEcho'
import ChatLoadingSkeleton from '@/components/ui/ChatLoadingSkeleton'
import PhotoViewer from '@/components/ui/PhotoViewer'
import GradientBorder from '@/components/ui/GradientBorder'
import { logError } from '@/utils/logger'
import { prepareImageFileForUpload } from '@/utils/prepareImageForUpload'
import { LeadActionMenu, TypedMessageCard } from '@/views/chat/LeadChatActions'
import { STATUS, StatusChip } from '@/views/manager/kit'

const TYPED = new Set(['payment_request', 'verification_request', 'model_card'])
const MANAGER_STATUSES = ['in_progress', 'awaiting_client', 'awaiting_payment', 'prepaid', 'completed', 'closed']

function HeaderLeadStatus({ leadId }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!leadId) return
    api.get(`/manager/leads/${leadId}`).then((r) => setStatus(r?.data?.data?.status)).catch(logError)
  }, [leadId])

  if (!status || status === 'new') return null

  const toggle = () => {
    if (open) { setOpen(false); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
    setOpen(true)
  }

  const change = async (s) => {
    setOpen(false)
    if (s === status) return
    setStatus(s)
    try { await api.patch(`/manager/leads/${leadId}/status`, { status: s }) } catch (e) { logError(e) }
  }

  return (
    <div className="absolute right-4">
      <button ref={btnRef} onClick={toggle} className="flex items-center gap-1 active:scale-95 transition-transform">
        <StatusChip status={status} />
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="m6 9 6 6 6-6" stroke="#9B9AA0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] w-[230px] rounded-2xl bg-white border border-black/[0.06] overflow-hidden shadow-[0_16px_44px_rgba(0,0,0,0.18)]"
            style={{ top: pos.top, right: pos.right }}
          >
            {MANAGER_STATUSES.map((s, i) => {
              const active = status === s
              return (
                <button
                  key={s}
                  onClick={() => change(s)}
                  className={['w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors', i > 0 ? 'border-t border-black/[0.05]' : '', active ? 'bg-[#FDE8F5]' : 'active:bg-[#F7F6FA]'].join(' ')}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full" style={{ background: STATUS[s].dot }} />
                    <span className={`text-[14px] ${active ? 'text-[#C01A7E] font-semibold' : 'text-black font-medium'}`}>{t(`requests.status.${STATUS[s].key}`)}</span>
                  </span>
                  {active && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="#E2319B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
              )
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}

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

function normalizeMsg(raw, myUserId, viewerIsStaff = false) {
  const isMe = raw.user_id === myUserId || raw.sender_id === myUserId
  const isStaffMsg = raw.is_support === true || (isMe && viewerIsStaff)
  const from = viewerIsStaff
    ? (isStaffMsg ? 'user' : 'them')
    : (isMe ? 'user' : 'them')
  return {
    id: raw.id,
    clientMessageId: raw.client_message_id ?? raw.clientMessageId ?? null,
    from,
    isSupport: isStaffMsg,
    text: raw.body ?? raw.text ?? '',
    time: raw.created_at ? fmtTime(raw.created_at) : (raw.time ?? ''),
    type: raw.type ?? (raw.attachment_url ? 'image' : 'text'),
    payload: raw.payload ?? null,
    attachmentUrl: raw.attachment_url ?? raw.attachmentUrl ?? null,
    readAt: raw.read_at ?? raw.readAt ?? null,
  }
}

function mergeIncomingMessage(prev, incoming, myId, viewerIsStaff = false) {
  const n = normalizeMsg(incoming, myId, viewerIsStaff)
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
  const backTo  = params.get('from') || '/home'

  const role     = auth.user?.role
  const isStaff  = role === 'manager' || role === 'admin'
  const isLead   = !!leadId

  const [messages, setMessages]   = useState([])
  const [leadClosed, setLeadClosed] = useState(false)
  const [leadStatus, setLeadStatus] = useState(null)
  const [accepting, setAccepting]   = useState(false)
  const [othersTyping, setOthersTyping] = useState(false)
  const typingHideRef = useRef(null)
  const lastTypingSentRef = useRef(0)
  const typingPingRef = useRef(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const oldestIdRef = useRef(null)
  const hasMoreOlderRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const prependingRef = useRef(false)
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
    api.get(`/chats/${chatId}/messages`, { params: { limit: 30 } })
      .then((res) => {
        const incoming = res.data.data ?? []
        setMessages((prev) => {
          if (!prev.length) return incoming.map((m) => normalizeMsg(m, myId, isStaff))
          let next = prev
          for (const raw of incoming) next = mergeIncomingMessage(next, raw, myId, isStaff)
          return next
        })
        setLeadClosed(!!res.data.meta?.lead?.closed)
      })
      .catch(logError)
  }, [chatId, myId])

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreOlderRef.current || !chatId || oldestIdRef.current == null) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    const scroller = messagesRef.current
    const prevH = scroller ? scroller.scrollHeight : 0
    try {
      const res = await api.get(`/chats/${chatId}/messages`, { params: { limit: 30, before_id: oldestIdRef.current } })
      const data = res.data.data ?? []
      hasMoreOlderRef.current = data.length >= 30
      if (data.length) {
        oldestIdRef.current = res.data.meta?.cursor?.next_before_id ?? data[0]?.id ?? oldestIdRef.current
        const older = data.map((m) => normalizeMsg(m, myId, isStaff))
        prependingRef.current = true
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => String(m.id)))
          return [...older.filter((m) => !ids.has(String(m.id))), ...prev]
        })
        requestAnimationFrame(() => { if (scroller) scroller.scrollTop = scroller.scrollHeight - prevH })
      }
    } catch (e) { logError(e) } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }, [chatId, myId])

  const onMessagesScroll = useCallback((e) => {
    if (e.currentTarget.scrollTop < 80) loadOlder()
  }, [loadOlder])

  useEffect(() => {
    if (!isStaff || !leadId) return undefined
    let cancelled = false
    api.get(`/manager/leads/${leadId}`)
      .then((r) => { if (!cancelled) setLeadStatus(r?.data?.data?.status ?? null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isStaff, leadId])

  const acceptLead = useCallback(async () => {
    if (accepting || !leadId) return
    setAccepting(true)
    try {
      const { data } = await api.post(`/manager/leads/${leadId}/accept`, {}, {
        headers: { 'Idempotency-Key': `accept-${leadId}` },
      })
      setLeadStatus(data?.data?.status ?? 'in_progress')
      reloadMessages()
    } catch (e) {
      logError(e)
    } finally {
      setAccepting(false)
    }
  }, [accepting, leadId, reloadMessages])

  const mustAccept = isStaff && isLead && leadStatus === 'new'

  useEffect(() => {
    if (!chatId) { navigate('/home', { replace: true }); return }
    api.get(`/chats/${chatId}/messages`, { params: { limit: 30 } })
      .then((res) => {
        const data = res.data.data ?? []
        const normalized = data.map((m) => normalizeMsg(m, myId, isStaff))
        prevMsgCount.current = normalized.length
        setMessages(normalized)
        setLeadClosed(!!res.data.meta?.lead?.closed)
        oldestIdRef.current = res.data.meta?.cursor?.next_before_id ?? data[0]?.id ?? null
        hasMoreOlderRef.current = data.length >= 30
      })
      .catch(logError)
      .finally(() => { setInitialLoad(false); loadDone.current = true; tryShowContent() })
  }, [chatId, myId, navigate])

  useEffect(() => {
    if (!chatId) return undefined
    return subscribePrivate(`chats.${chatId}`, {
      '.message.sent': (e) => {
        const incoming = e.message ?? e
        setMessages((prev) => mergeIncomingMessage(prev, incoming, myId, isStaff))
        if (String(incoming?.user_id ?? incoming?.sender_id) !== String(myId)) setOthersTyping(false)
        if (incoming?.type === 'system') setTimeout(reloadMessages, 400)
      },
      '.messages.read': (e) => {
        if (e.user_id === myId) return
        const readAt = e.read_at ?? new Date().toISOString()
        setMessages((prev) => prev.map((m) => (m.from === 'user' && !m.readAt ? { ...m, readAt } : m)))
      },
    })
  }, [chatId, myId, reloadMessages])

  useEffect(() => {
    if (!chatId) return undefined
    const ch = privateChannel(`chats.${chatId}`)
    if (!ch || typeof ch.listenForWhisper !== 'function') return undefined
    const onTyping = () => {
      setOthersTyping(true)
      clearTimeout(typingHideRef.current)
      typingHideRef.current = setTimeout(() => setOthersTyping(false), 6000)
    }
    const onStop = () => { clearTimeout(typingHideRef.current); setOthersTyping(false) }
    try { ch.listenForWhisper('typing', onTyping) } catch {}
    try { ch.listenForWhisper('typing-stop', onStop) } catch {}
    return () => {
      clearTimeout(typingHideRef.current)
      try { ch.stopListeningForWhisper('typing') } catch {}
      try { ch.stopListeningForWhisper('typing-stop') } catch {}
    }
  }, [chatId])

  const sendTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSentRef.current < 1500) return
    lastTypingSentRef.current = now
    try { privateChannel(`chats.${chatId}`)?.whisper?.('typing', { from: myId }) } catch {}
    clearTimeout(typingPingRef.current)
    typingPingRef.current = setTimeout(() => sendStopTyping(), 15000)
  }, [chatId, myId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendStopTyping = useCallback(() => {
    clearTimeout(typingPingRef.current)
    try { privateChannel(`chats.${chatId}`)?.whisper?.('typing-stop', { from: myId }) } catch {}
  }, [chatId, myId])

  useEffect(() => () => clearTimeout(typingPingRef.current), [])

  useEffect(() => {
    if (!chatId) return undefined
    const refetch = () => { if (!document.hidden) reloadMessages() }
    const poll = setInterval(refetch, 20000)
    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('focus', refetch)
    window.addEventListener('online', reloadMessages)
    try { window.Telegram?.WebApp?.onEvent?.('activated', reloadMessages) } catch {}
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('focus', refetch)
      window.removeEventListener('online', reloadMessages)
      try { window.Telegram?.WebApp?.offEvent?.('activated', reloadMessages) } catch {}
    }
  }, [chatId, reloadMessages])

  useEffect(() => {
    if (!chatId) return
    api.post(`/chats/${chatId}/read`).catch(() => {})
  }, [chatId, messages.length])

  useEffect(() => {
    if (contentState.current !== 'messages') return
    const currentCount = messages.length
    if (prependingRef.current) { prependingRef.current = false; prevMsgCount.current = currentCount; return }
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
    if (othersTyping) requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }, [othersTyping])

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

  const postMessageBody = useCallback(async (text, optimisticId, clientMessageId) => {
    try {
      const { data } = await api.post(`/chats/${chatId}/messages`, { body: text, client_message_id: clientMessageId }, {
        headers: { 'Idempotency-Key': `msg-${chatId}-${clientMessageId}` },
      })
      setMessages((prev) => mergeIncomingMessage(prev, data.data, myId, isStaff))
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, failed: true } : m)))
    }
  }, [chatId, myId])

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || !chatId) return
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticId = `opt-${clientMessageId}`
    setMessages((prev) => [...prev, { id: optimisticId, clientMessageId, from: 'user', text, type: 'text', time: fmtTime(new Date().toISOString()), failed: false }])
    postMessageBody(text, optimisticId, clientMessageId)
  }

  const retryMessage = useCallback((m) => {
    if (!m?.failed) return
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, failed: false } : x)))
    postMessageBody(m.text, m.id, m.clientMessageId)
  }, [postMessageBody])

  useEffect(() => {
    const resend = () => setMessages((prev) => {
      const failed = prev.filter((x) => x.failed && x.type === 'text' && x.clientMessageId)
      if (!failed.length) return prev
      failed.forEach((x) => postMessageBody(x.text, x.id, x.clientMessageId))
      return prev.map((x) => (x.failed ? { ...x, failed: false } : x))
    })
    window.addEventListener('online', resend)
    return () => window.removeEventListener('online', resend)
  }, [postMessageBody])

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

    const isImage = (file.type || '').startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name || '')
    let upload = file
    if (isImage) {
      try { upload = await prepareImageFileForUpload(file) } catch { upload = file }
    }

    const clientMessageId = `cmsg-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticId = `opt-${clientMessageId}`
    const previewUrl = URL.createObjectURL(upload)
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
      fd.append('attachment', upload)
      fd.append('client_message_id', clientMessageId)
      const { data } = await api.post(`/chats/${chatId}/messages`, fd, {
        headers: { 'Idempotency-Key': `att-${attachmentKey}` },
      })
      setMessages((prev) => mergeIncomingMessage(prev, data.data, myId, isStaff))
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
      <style>{`
        .typing-bubble { animation: typingIn 0.26s cubic-bezier(0.34,1.4,0.64,1); transform-origin: left bottom; }
        @keyframes typingIn { 0% { opacity: 0; transform: translateY(8px) scale(0.86) } 100% { opacity: 1; transform: none } }
        .typing-dot { width: 7px; height: 7px; border-radius: 9999px; background: #9B9AA0; display: inline-block; animation: typingDot 1.25s infinite ease-in-out; }
        @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.35 } 30% { transform: translateY(-5px); opacity: 1 } }
        .tick-anim { animation: tickPop 0.34s cubic-bezier(0.34,1.56,0.64,1); transform-origin: center; }
        @keyframes tickPop { 0% { opacity: 0; transform: scale(0.4) } 55% { opacity: 1; transform: scale(1.18) } 100% { opacity: 1; transform: scale(1) } }
      `}</style>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      <header ref={headerRef} className="w-full py-4 bg-white shrink-0">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate(backTo)}
            className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            {t('common.back')}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-black text-base/[100%] font-[500] max-w-[50%] truncate">
            {params.get('title') || `${t('requestChat.title')}${leadId ? ` #${leadId}` : ''}`}
          </span>
          {isStaff && isLead && <HeaderLeadStatus leadId={leadId} />}
        </div>
      </header>

      <div className="flex-1 relative min-h-0 container">
        {initialLoad && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col pt-4">
            <ChatLoadingSkeleton />
          </div>
        )}

        <div ref={messagesRef} className="absolute inset-0 overflow-y-auto" onScroll={onMessagesScroll}>
          <div className="flex flex-col px-4 py-4 gap-0 container">
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 rounded-full border-2 border-[#E2319B] border-t-transparent animate-spin" />
              </div>
            )}
            {messages.map((msg, idx) => {
              if (msg.type === 'system') {
                const ok = typeof msg.text === 'string' && msg.text.trimStart().startsWith('✅')
                const text = ok ? msg.text.replace(/^\s*✅\s*/, '') : msg.text
                return (
                  <div key={msg.id} data-msg data-msg-id={msg.id} className="flex justify-center my-3">
                    <span className="max-w-[300px] inline-flex items-center gap-1.5 text-center text-[#8A8A8A] text-[13px]/[140%] font-medium bg-[#F2F2F5] rounded-2xl px-4 py-2.5">
                      {ok && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="10" fill="#1E9E4E" /><path d="m7.5 12.5 3 3 6-6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                      <span>{text}</span>
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
                  <span className="text-[#ABABAB] text-xs font-medium px-1 inline-flex items-center gap-1">
                    {msg.time}
                    {isUser && msg.failed ? (
                      <button type="button" onClick={() => retryMessage(msg)} className="inline-flex items-center text-[#E5484D] active:scale-90 transition-transform" aria-label="retry">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7.5v5M12 15.6v.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" /></svg>
                      </button>
                    ) : isUser && !msg.uploading && !String(msg.id).startsWith('opt-') ? (
                      <svg key={msg.readAt ? 'read' : 'sent'} width="17" height="13" viewBox="0 0 24 24" fill="currentColor" className={`tick-anim ${msg.readAt ? 'text-[#E2319B]' : 'text-[#ABABAB]'}`} aria-hidden>
                        {msg.readAt
                          ? <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                          : <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />}
                      </svg>
                    ) : null}
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={['max-w-[260px] px-4 py-3 rounded-3xl', isUser ? 'bg-[#1C1C1E] text-[#D2D2D2]' : 'bg-[#F0F0F0] text-black'].join(' ')}>
                    <p className="text-[15px]/[148%] font-normal" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  </div>
                  <span className="text-[#ABABAB] text-xs font-medium px-1 inline-flex items-center gap-1">
                    {msg.time}
                    {isUser && msg.failed ? (
                      <button type="button" onClick={() => retryMessage(msg)} className="inline-flex items-center text-[#E5484D] active:scale-90 transition-transform" aria-label="retry">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7.5v5M12 15.6v.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" /></svg>
                      </button>
                    ) : isUser && !msg.uploading && !String(msg.id).startsWith('opt-') ? (
                      <svg key={msg.readAt ? 'read' : 'sent'} width="17" height="13" viewBox="0 0 24 24" fill="currentColor" className={`tick-anim ${msg.readAt ? 'text-[#E2319B]' : 'text-[#ABABAB]'}`} aria-hidden>
                        {msg.readAt
                          ? <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                          : <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />}
                      </svg>
                    ) : null}
                  </span>
                </div>
              )

              return (
                <div key={msg.id}>
                  <div data-msg data-msg-id={msg.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${gap}`}>
                    {bubble}
                  </div>
                  {idx === 0 && isLead && !isStaff && <ManagerNote text={t('requestChat.managerNote')} />}
                </div>
              )
            })}
            {othersTyping && (
              <div className="flex justify-start mt-2">
                <div className="typing-bubble bg-[#F0F0F0] rounded-3xl rounded-bl-lg px-4 py-3 inline-flex items-center gap-1.5" role="status" aria-label={t('requestChat.typing')}>
                  <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '180ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '360ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {isLead && leadClosed ? (
        <div ref={inputBarRef} className="bg-white px-4 py-4 pb-8 shrink-0 container">
          <div className="flex items-center justify-center gap-2 text-[#9B9AA0] text-[13px]/[140%] text-center bg-[#F4F3F7] rounded-2xl px-4 py-3.5">
            <span>🔒</span>
            <span>{t('requestChat.closedNotice')}</span>
          </div>
        </div>
      ) : mustAccept ? (
        <div ref={inputBarRef} className="bg-white px-4 py-4 pb-8 shrink-0 container flex flex-col gap-2.5">
          <p className="text-[#9B9AA0] text-[13px]/[140%] text-center">{t('requestChat.acceptToReply')}</p>
          <button
            onClick={acceptLead}
            disabled={accepting}
            className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {accepting ? '…' : t('manager.accept')}
          </button>
        </div>
      ) : (
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
              onChange={(e) => { setInputText(e.target.value); autoResize(); sendTyping() }}
              onBlur={sendStopTyping}
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
      )}
    </section>
  )
}
