import { useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import { useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import useBookingStore from '@/stores/useBookingStore'
import useMeetingStore from '@/stores/useMeetingStore'
import PaymentSheet    from '@/components/modals/PaymentSheet'
import PendingStep     from '@/components/sections/meetingPage/PendingStep'
import AcceptedStep    from '@/components/sections/meetingPage/AcceptedStep'
import ConfirmedStep   from '@/components/sections/meetingPage/ConfirmedStep'
import { subscribePrivate } from '@/utils/safeEcho'
import { useStatusPolling } from '@/composables/useStatusPolling'

const TERMINAL_STATUSES = ['rejected', 'expired', 'cancelled', 'completed']
const formatDate = (date) => {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d)) return '—'
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const day  = days[d.getDay()]
    const dd   = String(d.getDate()).padStart(2, '0')
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const isToday = new Date().toDateString() === d.toDateString()
    return `${day}, ${dd}.${mm}${isToday ? ' (Сегодня)' : ''}`
  } catch {
    return '—'
  }
}
export default function MeetingPage() {
  const navigate     = useTransitionNavigate()
  const [params]     = useSearchParams()
  const booking      = useBookingStore()
  const meeting      = useMeetingStore()
  const headerRef      = useRef(null)
  const backBtnRef     = useRef(null)
  const headerTitleRef = useRef(null)
  const pendingRef     = useRef(null)
  const mascotRef      = useRef(null)
  const pendingHeadRef = useRef(null)
  const pendingSubRef  = useRef(null)
  const cardRef        = useRef(null)
  const cardRowsRef    = useRef([])
  const mascotLoopRef  = useRef(null)
  const acceptedRef       = useRef(null)
  const acceptedAvatarRef = useRef(null)
  const acceptedHeadRef   = useRef(null)
  const acceptedSubRef    = useRef(null)
  const payBtnRef         = useRef(null)
  const confirmedRef       = useRef(null)
  const confirmedAvatarRef = useRef(null)
  const confirmedHeadRef   = useRef(null)
  const confirmedSubRef    = useRef(null)
  const prevStatus = useRef(meeting.status)
  const m           = meeting.meeting
  const scheduledAt = m?.scheduled_at ? new Date(m.scheduled_at) : null
  const formattedTime = scheduledAt
    ? `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}`
    : `${String(booking.selectedHour).padStart(2, '0')}:${String(booking.selectedMinute).padStart(2, '0')}`
  const price = m?.price_thb ?? booking.selectedDuration?.price ?? 0
  const durationHours = m?.duration_hours ?? booking.selectedDuration?.hours
  const durationLabel = durationHours ? `${durationHours} ч` : (booking.selectedDuration?.label ?? '—')

  const modelName   = m?.model_profile?.display_name ?? booking.modelName ?? '—'
  const modelAvatar = m?.model_profile?.photos?.find(p => p.is_main)?.url
    ?? m?.model_profile?.photos?.[0]?.url
    ?? null

  const DETAIL_ROWS = [
    { label: 'Модель',        value: modelName, hasAvatar: true, avatarUrl: modelAvatar },
    { label: 'Дата',          value: formatDate(scheduledAt ?? booking.selectedDate) },
    { label: 'Время',         value: formattedTime },
    { label: 'Длительность',  value: durationLabel },
    { label: 'Вы заплатите:', value: `${price.toLocaleString()} ฿`, isBold: true },
  ]
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
    if (!meeting.isPaymentOpen) return
    if (meeting.status !== 'accepted') {
      meeting.closePayment()
    }
  }, [meeting.status, meeting.isPaymentOpen])

  useEffect(() => {
    if (!meeting.status) return
    if (TERMINAL_STATUSES.includes(meeting.status)) {
      navigate('/home')
    }
  }, [meeting.status])

  // Subscribe to Reverb for real-time status updates.
  // subscribePrivate swallows WebSocket failures so a flaky connection
  // never crashes the page — the polling fallback below covers that case.
  useEffect(() => {
    const meetingId = meeting.meeting?.id
    if (!meetingId) return undefined
    return subscribePrivate(`meeting.${meetingId}`, {
      '.meeting.status_changed': (e) => {
        if (e?.status) meeting.setStatus(e.status)
        // Re-fetch full meeting payload so derived fields (paid_at,
        // confirmed_at, etc.) stay in sync with the new status.
        if (meetingId) meeting.load(meetingId)
      },
    })
  }, [meeting.meeting?.id])

  // Polling fallback: if WebSocket events don't arrive (Reverb down, channel
  // auth failure, network filtering), the page still catches up to server
  // state every few seconds and immediately on tab refocus.
  const pollMeetingId = meeting.meeting?.id
  const pollEnabled   = !!pollMeetingId && !TERMINAL_STATUSES.includes(meeting.status)
  useStatusPolling(
    () => pollMeetingId && meeting.load(pollMeetingId),
    { enabled: pollEnabled, intervalMs: 5000 },
  )
  const animatePendingIn = useCallback((delay = 0) => {
    const rows = cardRowsRef.current.filter(Boolean)
    const tl = gsap.timeline({ delay })
    tl.to(mascotRef.current,      { y: 0, scale: 1, autoAlpha: 1, duration: 0.6,  ease: 'back.out(1.4)'  })
      .to(pendingHeadRef.current, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out'                  }, 0.15)
      .to(pendingSubRef.current,  { y: 0, autoAlpha: 1, duration: 0.4,  ease: 'power3.out'                }, 0.22)
      .to(cardRef.current,        { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out'                  }, 0.28)
      .to(rows, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out'                    }, 0.4)
      .call(() => {
        if (!mascotRef.current) return
        mascotLoopRef.current = gsap.to(mascotRef.current, {
          y: -3, duration: 1, ease: 'sine.inOut', yoyo: true, repeat: -1,
        })
      })
    return tl
  }, [])
  const animateAcceptedIn = useCallback((delay = 0) => {
    const tl = gsap.timeline({ delay })
    tl.to(acceptedAvatarRef.current, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.3)'    })
      .to(acceptedHeadRef.current,   { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out'              }, 0.14)
      .to(acceptedSubRef.current,    { y: 0, autoAlpha: 1, duration: 0.4,  ease: 'power3.out'            }, 0.22)
      .to(payBtnRef.current,         { y: 0, autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2)' }, 0.3)
    return tl
  }, [])
  const animateConfirmedIn = useCallback((delay = 0) => {
    const tl = gsap.timeline({ delay })
    tl.to(confirmedAvatarRef.current, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.3)'  })
      .to(confirmedHeadRef.current,   { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out'            }, 0.14)
      .to(confirmedSubRef.current,    { y: 0, autoAlpha: 1, duration: 0.4,  ease: 'power3.out'          }, 0.22)
    return tl
  }, [])
  const startAnimations = useCallback(() => {
    const status = meeting.status
    const tl = gsap.timeline()
    tl.to(headerRef.current,      { y: 0, autoAlpha: 1, duration: 0.38, ease: 'expo.out'      })
      .to(backBtnRef.current,     { x: 0, autoAlpha: 1, duration: 0.3,  ease: 'back.out(1.5)' }, 0.06)
      .to(headerTitleRef.current, { y: 0, autoAlpha: 1, duration: 0.3,  ease: 'expo.out'      }, 0.1)
    if (status === 'accepted') {
      animateAcceptedIn(0.18)
    } else if (status === 'paid' || status === 'confirmed') {
      animateConfirmedIn(0.18)
    } else {
      animatePendingIn(0.18)
    }
  }, [meeting.status, animatePendingIn, animateAcceptedIn, animateConfirmedIn])
  useLayoutEffect(() => {
    gsap.set(headerRef.current,      { autoAlpha: 0, y: -44 })
    gsap.set(backBtnRef.current,     { autoAlpha: 0, x: -20 })
    gsap.set(headerTitleRef.current, { autoAlpha: 0, y: -10 })
    gsap.set(mascotRef.current,      { autoAlpha: 0, y: -20, scale: 0.8 })
    gsap.set(pendingHeadRef.current, { autoAlpha: 0, y: -16 })
    gsap.set(pendingSubRef.current,  { autoAlpha: 0, y: -12 })
    gsap.set(cardRef.current,        { autoAlpha: 0, y: -24 })
    gsap.set(cardRowsRef.current.filter(Boolean), { opacity: 0, y: -10 })
    gsap.set(acceptedAvatarRef.current, { autoAlpha: 0, scale: 0.8, y: -20 })
    gsap.set(acceptedHeadRef.current,   { autoAlpha: 0, y: -16 })
    gsap.set(acceptedSubRef.current,    { autoAlpha: 0, y: -12 })
    gsap.set(payBtnRef.current,         { autoAlpha: 0, y: -16, scale: 0.88 })
    gsap.set(confirmedAvatarRef.current, { autoAlpha: 0, scale: 0.8, y: -20 })
    gsap.set(confirmedHeadRef.current,   { autoAlpha: 0, y: -16 })
    gsap.set(confirmedSubRef.current,    { autoAlpha: 0, y: -12 })
    if (meeting.status === 'accepted') {
      gsap.set(pendingRef.current,   { display: 'none' })
      gsap.set(confirmedRef.current, { display: 'none' })
    } else if (meeting.status === 'paid' || meeting.status === 'confirmed') {
      gsap.set(pendingRef.current,  { display: 'none' })
      gsap.set(acceptedRef.current, { display: 'none' })
    } else {
      gsap.set(acceptedRef.current,  { display: 'none' })
      gsap.set(confirmedRef.current, { display: 'none' })
    }
  }, [])

  useEffect(() => {
    return () => {
      mascotLoopRef.current?.kill()
      gsap.killTweensOf([
        headerRef.current, backBtnRef.current, headerTitleRef.current,
        mascotRef.current, pendingHeadRef.current, pendingSubRef.current, cardRef.current,
        acceptedAvatarRef.current, acceptedHeadRef.current, acceptedSubRef.current, payBtnRef.current,
        confirmedAvatarRef.current, confirmedHeadRef.current, confirmedSubRef.current,
        ...cardRowsRef.current.filter(Boolean),
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
      mascotLoopRef.current?.kill()
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
      transition(
        pendingRef.current,
        acceptedRef.current,
        () => {
          gsap.set(acceptedAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(acceptedHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(acceptedSubRef.current,    { y: -12, opacity: 0 })
          gsap.set(payBtnRef.current,         { y: -16, scale: 0.88, opacity: 0 })
        },
        animateAcceptedIn,
      )
      return
    }
    if (!from && (to === 'paid' || to === 'confirmed')) {
      transition(
        pendingRef.current,
        confirmedRef.current,
        () => {
          gsap.set(confirmedAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(confirmedHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(confirmedSubRef.current,    { y: -12, opacity: 0 })
        },
        animateConfirmedIn,
      )
      return
    }
    if (from === 'pending' && to === 'accepted') {
      transition(
        pendingRef.current,
        acceptedRef.current,
        () => {
          gsap.set(acceptedAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(acceptedHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(acceptedSubRef.current,    { y: -12, opacity: 0 })
          gsap.set(payBtnRef.current,         { y: -16, scale: 0.88, opacity: 0 })
        },
        animateAcceptedIn,
      )
      return
    }
    if (from === 'accepted' && (to === 'paid' || to === 'confirmed')) {
      transition(
        acceptedRef.current,
        confirmedRef.current,
        () => {
          gsap.set(confirmedAvatarRef.current, { scale: 0.8, opacity: 0, y: -20 })
          gsap.set(confirmedHeadRef.current,   { y: -16, opacity: 0 })
          gsap.set(confirmedSubRef.current,    { y: -12, opacity: 0 })
        },
        animateConfirmedIn,
      )
      return
    }
    if (to === 'pending') {
      gsap.set(acceptedRef.current, { display: 'none', opacity: 0 })
      gsap.set(confirmedRef.current, { display: 'none', opacity: 0 })
      gsap.set(pendingRef.current, { display: 'flex', opacity: 1 })
      animatePendingIn(0)
    }
  }, [meeting.status, animatePendingIn, animateAcceptedIn, animateConfirmedIn])
  usePageReady(startAnimations)

  const handleCancel = async () => {
    await meeting.cancel()
    navigate('/home')
  }

  const handleGoToChat = async () => {
    const meetingId = meeting.meeting?.id
    if (!meetingId) { navigate('/chat'); return }
    try {
      const { data } = await (await import('@/utils/api')).default.get(`/chats/meetings/${meetingId}`)
      const chatId = data.data?.id
      navigate(chatId ? `/chat?id=${chatId}` : '/chat')
    } catch {
      navigate('/chat')
    }
  }
  return (
    <section className="flex flex-col min-h-screen justify-center">
      <header ref={headerRef} className="w-full py-7 bg-white fixed top-0 z-50">
        <div className="container flex items-center relative">
          <button
            ref={backBtnRef}
            onClick={handleCancel}
            className="px-3.5 py-2.5 bg-[#EFEEF3] absolute left-4 text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            На главную
          </button>
          <div className="w-full flex justify-center">
            <h1 ref={headerTitleRef} className="text-black text-base/[100%] font-[500]">
              Встреча
            </h1>
          </div>
        </div>
      </header>
      <PendingStep
        screenRef={pendingRef}
        mascotRef={mascotRef}
        headRef={pendingHeadRef}
        subRef={pendingSubRef}
        cardRef={cardRef}
        cardRowsRef={cardRowsRef}
        detailRows={DETAIL_ROWS}
      />
      <AcceptedStep
        screenRef={acceptedRef}
        avatarRef={acceptedAvatarRef}
        headRef={acceptedHeadRef}
        subRef={acceptedSubRef}
        payBtnRef={payBtnRef}
        onPayment={meeting.openPayment}
        modelAvatarUrl={modelAvatar}
        modelName={modelName}
      />
      <ConfirmedStep
        screenRef={confirmedRef}
        avatarRef={confirmedAvatarRef}
        headRef={confirmedHeadRef}
        subRef={confirmedSubRef}
        onGoToChat={handleGoToChat}
        modelAvatarUrl={modelAvatar}
        modelName={modelName}
        title={meeting.status === 'paid' ? 'Оплата отправлена' : 'Бронирование подтверждено'}
        subtitle={meeting.status === 'paid'
          ? 'Ожидаем подтверждение модели. Скоро встреча станет активной.'
          : 'Все готово для встречи, обсудите адрес и детали в чате.'}
      />
      <PaymentSheet
        isOpen={meeting.isPaymentOpen}
        onClose={meeting.closePayment}
        price={price}
      />
    </section>
  )
}