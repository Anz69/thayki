import { useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useModelMeetingStore from '@/stores/useModelMeetingStore'
import FinishMeetingModal from '@/components/modals/FinishMeetingModal'
import PendingModelStep from '@/components/sections/modelMeetingPage/PendingModelStep'
import WaitingPaymentStep from '@/components/sections/modelMeetingPage/WaitingPaymentStep'
import ConfirmedModelStep from '@/components/sections/modelMeetingPage/ConfirmedModelStep'
import { subscribePrivate } from '@/utils/safeEcho'

const formatDate = (date) => {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d)) return '—'
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const day = days[d.getDay()]
    const dd  = String(d.getDate()).padStart(2, '0')
    const mm  = String(d.getMonth() + 1).padStart(2, '0')
    const isToday = new Date().toDateString() === d.toDateString()
    return `${day}, ${dd}.${mm}${isToday ? ' (Сегодня)' : ''}`
  } catch {
    return '—'
  }
}

export default function ModelMeetingPage() {
  const navigate = useTransitionNavigate()
  const meeting  = useModelMeetingStore()
  const [params] = useSearchParams()

  // ── Refs ──────────────────────────────────────────────────────────────────
  const headerRef          = useRef(null)
  const backBtnRef         = useRef(null)
  const headerTitleRef     = useRef(null)
  const headerSupportRef   = useRef(null)
  const pendingRef         = useRef(null)
  const pendingHeadRef     = useRef(null)
  const pendingCardRef     = useRef(null)
  const pendingRowsRef     = useRef([])
  const waitingRef         = useRef(null)
  const waitingAvatarRef   = useRef(null)
  const waitingHeadRef     = useRef(null)
  const waitingSubRef      = useRef(null)
  const confirmedRef       = useRef(null)
  const confirmedAvatarRef = useRef(null)
  const confirmedHeadRef   = useRef(null)
  const confirmedSubRef    = useRef(null)
  const confirmedCardRef   = useRef(null)
  const confirmedRowsRef   = useRef([])
  const prevStatus         = useRef(meeting.status)

  useEffect(() => {
    const meetingId = params.get('id')
    if (meetingId) {
      meeting.load(meetingId)
    } else {
      meeting.loadLatest()
    }
  }, [])

  useEffect(() => {
    if (meeting.errorStatus === 403 || meeting.errorStatus === 404) {
      navigate('/home')
    }
  }, [meeting.errorStatus])

  useEffect(() => {
    if (!meeting.status) return
    if (['rejected', 'expired', 'cancelled', 'completed'].includes(meeting.status)) {
      navigate('/more')
    }
  }, [meeting.status])

  // ── Echo subscription (failure-tolerant) ──────────────────────────────────
  useEffect(() => {
    const meetingId = meeting.meeting?.id
    if (!meetingId) return undefined
    return subscribePrivate(`meeting.${meetingId}`, {
      '.meeting.status_changed': (e) => {
        if (e?.status) meeting.setStatus(e.status)
      },
    })
  }, [meeting.meeting?.id])

  // ── Build detail rows from real meeting data ──────────────────────────────
  const m            = meeting.meeting
  const scheduledAt  = m?.scheduled_at ? new Date(m.scheduled_at) : null
  const formattedTime = scheduledAt
    ? `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}`
    : '—'
  const price         = m?.price_thb ?? 0
  const durationHours = m?.duration_hours
  const durationLabel = durationHours ? `${durationHours} ч` : '—'
  const clientName   = m?.client?.first_name ?? m?.client?.username ?? 'Клиент'
  const clientAvatar = m?.client?.photo_url ?? null

  const DETAIL_ROWS = [
    { label: 'Клиент',        value: clientName,                               hasAvatar: true, avatarUrl: clientAvatar },
    { label: 'Дата',          value: formatDate(scheduledAt) },
    { label: 'Время',         value: formattedTime },
    { label: 'Длительность',  value: durationLabel },
    { label: 'Клиент платит:', value: `${price.toLocaleString()} ฿`,           isBold: true },
  ]

  // ── Animations ────────────────────────────────────────────────────────────
  const animatePendingIn = useCallback((delay = 0) => {
    const rows = pendingRowsRef.current.filter(Boolean)
    const tl = gsap.timeline({ delay })
    tl.to(pendingHeadRef.current, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' })
      .to(pendingCardRef.current, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' }, 0.1)
      .to(rows, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out' }, 0.2)
    return tl
  }, [])

  const animateWaitingIn = useCallback((delay = 0) => {
    const tl = gsap.timeline({ delay })
    tl.to(waitingAvatarRef.current, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.3)' })
      .to(waitingHeadRef.current,   { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' }, 0.14)
      .to(waitingSubRef.current,    { y: 0, autoAlpha: 1, duration: 0.4,  ease: 'power3.out' }, 0.22)
    return tl
  }, [])

  const animateConfirmedIn = useCallback((delay = 0) => {
    const rows = confirmedRowsRef.current.filter(Boolean)
    const tl = gsap.timeline({ delay })
    tl.to(confirmedAvatarRef.current, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.3)' })
      .to(confirmedHeadRef.current,   { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' }, 0.14)
      .to(confirmedSubRef.current,    { y: 0, autoAlpha: 1, duration: 0.4,  ease: 'power3.out' }, 0.22)
      .to(confirmedCardRef.current,   { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' }, 0.3)
      .to(rows, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out' }, 0.42)
    return tl
  }, [])

  const startAnimations = useCallback(() => {
    const status = meeting.status
    const tl = gsap.timeline()
    tl.to(headerRef.current,      { y: 0, autoAlpha: 1, duration: 0.38, ease: 'expo.out' })
      .to(backBtnRef.current,     { x: 0, autoAlpha: 1, duration: 0.3,  ease: 'back.out(1.5)' }, 0.06)
      .to(headerTitleRef.current, { y: 0, autoAlpha: 1, duration: 0.3,  ease: 'expo.out' }, 0.1)
    if (status === 'accepted') {
      animateWaitingIn(0.18)
    } else if (status === 'paid' || status === 'confirmed') {
      animateConfirmedIn(0.18)
    } else {
      if (headerSupportRef.current) gsap.to(headerSupportRef.current, { autoAlpha: 1, duration: 0.3, delay: 0.16 })
      animatePendingIn(0.18)
    }
  }, [meeting.status, animatePendingIn, animateWaitingIn, animateConfirmedIn])

  useLayoutEffect(() => {
    gsap.set(headerRef.current,        { autoAlpha: 0, y: -44 })
    gsap.set(backBtnRef.current,       { autoAlpha: 0, x: -20 })
    gsap.set(headerTitleRef.current,   { autoAlpha: 0, y: -10 })
    gsap.set(headerSupportRef.current, { autoAlpha: 0 })
    gsap.set(pendingHeadRef.current,   { autoAlpha: 0, y: -16 })
    gsap.set(pendingCardRef.current,   { autoAlpha: 0, y: -24 })
    gsap.set(pendingRowsRef.current.filter(Boolean), { opacity: 0, y: -10 })
    gsap.set(waitingAvatarRef.current,   { autoAlpha: 0, scale: 0.8, y: -20 })
    gsap.set(waitingHeadRef.current,     { autoAlpha: 0, y: -16 })
    gsap.set(waitingSubRef.current,      { autoAlpha: 0, y: -12 })
    gsap.set(confirmedAvatarRef.current, { autoAlpha: 0, scale: 0.8, y: -20 })
    gsap.set(confirmedHeadRef.current,   { autoAlpha: 0, y: -16 })
    gsap.set(confirmedSubRef.current,    { autoAlpha: 0, y: -12 })
    gsap.set(confirmedCardRef.current,   { autoAlpha: 0, y: -24 })
    gsap.set(confirmedRowsRef.current.filter(Boolean), { opacity: 0, y: -10 })

    if (meeting.status === 'accepted') {
      gsap.set(pendingRef.current,   { display: 'none' })
      gsap.set(confirmedRef.current, { display: 'none' })
    } else if (meeting.status === 'paid' || meeting.status === 'confirmed') {
      gsap.set(pendingRef.current, { display: 'none' })
      gsap.set(waitingRef.current, { display: 'none' })
    } else {
      gsap.set(waitingRef.current,   { display: 'none' })
      gsap.set(confirmedRef.current, { display: 'none' })
    }
  }, [])

  useEffect(() => {
    return () => {
      gsap.killTweensOf([
        headerRef.current, backBtnRef.current, headerTitleRef.current, headerSupportRef.current,
        pendingHeadRef.current, pendingCardRef.current,
        waitingAvatarRef.current, waitingHeadRef.current, waitingSubRef.current,
        confirmedAvatarRef.current, confirmedHeadRef.current, confirmedSubRef.current, confirmedCardRef.current,
        ...pendingRowsRef.current.filter(Boolean),
        ...confirmedRowsRef.current.filter(Boolean),
      ])
    }
  }, [])

  useEffect(() => {
    if (meeting.status === prevStatus.current) return
    const from = prevStatus.current
    const to = meeting.status
    prevStatus.current = to
    if (!to) return

    const transition = (fromEl, toEl, initToEl, animateToEl) => {
      gsap.to(fromEl, {
        opacity: 0, y: -28, duration: 0.28, ease: 'power2.in',
        onComplete: () => {
          gsap.set(fromEl, { display: 'none' })
          gsap.set(toEl, { display: 'flex', opacity: 0 })
          initToEl()
          gsap.to(toEl, { opacity: 1, duration: 0.15, ease: 'power2.out' })
          animateToEl(0.08)
        },
      })
    }

    if (!from && to === 'accepted') {
      gsap.to(headerSupportRef.current, { opacity: 0, duration: 0.2 })
      transition(
        pendingRef.current,
        waitingRef.current,
        () => {
          gsap.set(waitingAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(waitingHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(waitingSubRef.current,    { y: -12, opacity: 0 })
        },
        animateWaitingIn,
      )
      return
    }
    if (!from && (to === 'paid' || to === 'confirmed')) {
      gsap.to(headerSupportRef.current, { opacity: 0, duration: 0.2 })
      transition(
        pendingRef.current,
        confirmedRef.current,
        () => {
          gsap.set(confirmedAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(confirmedHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(confirmedSubRef.current,    { y: -12, opacity: 0 })
          gsap.set(confirmedCardRef.current,   { y: -24, opacity: 0 })
          gsap.set(confirmedRowsRef.current.filter(Boolean), { opacity: 0, y: -10 })
        },
        animateConfirmedIn,
      )
      return
    }
    if (from === 'pending' && to === 'accepted') {
      gsap.to(headerSupportRef.current, { opacity: 0, duration: 0.2 })
      transition(
        pendingRef.current,
        waitingRef.current,
        () => {
          gsap.set(waitingAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(waitingHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(waitingSubRef.current,    { y: -12, opacity: 0 })
        },
        animateWaitingIn,
      )
      return
    }
    if (from === 'accepted' && (to === 'paid' || to === 'confirmed')) {
      transition(
        waitingRef.current,
        confirmedRef.current,
        () => {
          gsap.set(confirmedAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(confirmedHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(confirmedSubRef.current,    { y: -12, opacity: 0 })
          gsap.set(confirmedCardRef.current,   { y: -24, opacity: 0 })
          gsap.set(confirmedRowsRef.current.filter(Boolean), { opacity: 0, y: -10 })
        },
        animateConfirmedIn,
      )
      return
    }
    if (to === 'pending') {
      if (headerSupportRef.current) gsap.to(headerSupportRef.current, { autoAlpha: 1, duration: 0.2 })
      gsap.set(waitingRef.current, { display: 'none', opacity: 0 })
      gsap.set(confirmedRef.current, { display: 'none', opacity: 0 })
      gsap.set(pendingRef.current, { display: 'flex', opacity: 1 })
      animatePendingIn(0)
    }
  }, [meeting.status, animatePendingIn, animateWaitingIn, animateConfirmedIn])

  usePageReady(startAnimations)

  return (
    <section className="flex flex-col min-h-screen">
      <header ref={headerRef} className="w-full py-7 bg-white fixed top-0 z-50">
        <div className="container flex items-center relative">
          <button
            ref={backBtnRef}
            onClick={() => navigate('/home')}
            className="py-3 px-2.5 bg-[#EFEEF3] absolute left-4 text-black text-base/[90%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            На главную
          </button>
          <div className="w-full flex justify-center">
            <h1 ref={headerTitleRef} className="text-black text-base/[100%] font-medium">
              Встреча
            </h1>
          </div>
          <button
            ref={headerSupportRef}
            className="py-3 px-2.5 bg-[#EFEEF3] absolute right-4 text-black text-base/[90%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
            onClick={() => navigate('/support')}
          >
            Поддержка
          </button>
        </div>
      </header>

      <PendingModelStep
        screenRef={pendingRef}
        headRef={pendingHeadRef}
        cardRef={pendingCardRef}
        cardRowsRef={pendingRowsRef}
        detailRows={DETAIL_ROWS}
      />
      <WaitingPaymentStep
        screenRef={waitingRef}
        avatarRef={waitingAvatarRef}
        headRef={waitingHeadRef}
        subRef={waitingSubRef}
        clientAvatarUrl={clientAvatar}
        clientName={clientName}
      />
      <ConfirmedModelStep
        screenRef={confirmedRef}
        avatarRef={confirmedAvatarRef}
        headRef={confirmedHeadRef}
        subRef={confirmedSubRef}
        cardRef={confirmedCardRef}
        cardRowsRef={confirmedRowsRef}
        detailRows={DETAIL_ROWS}
        title={meeting.status === 'paid' ? 'Оплата подтверждена' : 'Встреча подтверждена'}
        subtitle={meeting.status === 'paid'
          ? 'Клиент оплатил встречу. Подтвердите старт встречи.'
          : 'Встреча активна, можете перейти в чат с клиентом.'}
      />
      <FinishMeetingModal
        isOpen={meeting.isFinishOpen}
        onClose={() => meeting.closeFinish()}
        onConfirm={async () => {
          await meeting.complete()
          meeting.reset()
          navigate('/more')
        }}
      />
    </section>
  )
}
