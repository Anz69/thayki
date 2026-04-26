import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useMeetingStore from '@/stores/useMeetingStore'
import useModelMeetingStore from '@/stores/useModelMeetingStore'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import gsap from 'gsap'

const TABS = [
  { label: 'Главная', path: '/home', match: ['/home'] },
  { label: 'Еще',     path: '/more', match: ['/more'] },
]

function getSlot(pathname, clientStatus, modelStatus, isModel) {
  if (['/home', '/more'].includes(pathname)) return 'tabs'
  if (pathname === '/meeting') {
    if (isModel) {
      if (!modelStatus || ['rejected', 'expired', 'cancelled', 'completed'].includes(modelStatus)) return null
      if (modelStatus === 'pending')         return 'model-pending'
      if (modelStatus === 'accepted')        return 'model-waiting'
      if (modelStatus === 'paid')            return 'model-ready'
      if (modelStatus === 'confirmed')       return 'model-confirmed'
      return null
    }
    if (!clientStatus || ['rejected', 'expired', 'cancelled', 'completed'].includes(clientStatus)) return null
    return clientStatus === 'confirmed' ? 'client-chat' : 'client-default'
  }
  return null
}

function getTabsForSlot(slot) {
  if (slot === 'tabs') return TABS
  return null
}

const BASE   = 'px-4 py-2.5 rounded-full text-base/[80%] font-medium select-none'
const WHITE  = `${BASE} bg-white text-black active:bg-[#DFDBDF] transition-colors`
const GHOST  = `${BASE} text-[#7F7F7F]`
const CANCEL = `${BASE} bg-white text-black active:bg-white/90 transition-colors`
const PINK   = `${BASE} bg-[#E2319B] text-white active:opacity-80 transition-opacity`

export default function BottomNav() {
  const location     = useLocation()
  const nav          = useTransitionNavigate()
  const meeting      = useMeetingStore()
  const modelMeeting = useModelMeetingStore()
  const auth         = useAuthStore()

  const { pathname } = location

  const isModel = auth.isModel()
  const targetSlot  = getSlot(pathname, meeting.status, modelMeeting.status, isModel)
  const targetTabs  = getTabsForSlot(targetSlot)
  const activeIndex = targetTabs
    ? targetTabs.findIndex(t => t.match.includes(pathname))
    : -1

  const [renderedSlot, setRenderedSlot] = useState(targetSlot)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const renderedTabs = getTabsForSlot(renderedSlot)

  const wrapperRef   = useRef(null)
  const containerRef = useRef(null)
  const innerRef     = useRef(null)
  const indicatorRef = useRef(null)
  const btnRefs      = useRef([])

  const widthSnap  = useRef(null)
  const skipFirst3 = useRef(true)
  const skipFirst5 = useRef(true)

  useEffect(() => {
    if (!auth.isModel() && !meeting.meeting) {
      meeting.loadLatest()
    }
  }, [])

  const clientCancel  = () => meeting.openCancel()
  const modelCancel   = () => modelMeeting.openCancel()
  const goSupport     = () => nav('/support')
  const confirmModel  = () => modelMeeting.accept()
  const confirmPaid   = () => modelMeeting.confirm()
  const finishMeeting = () => modelMeeting.openFinish()

  const goChat = async () => {
    // client-side meeting takes priority, then model-side
    const meetingId = meeting.meeting?.id ?? modelMeeting.meeting?.id
    if (!meetingId) { nav('/chat'); return }
    try {
      const { data } = await api.get(`/chats/meetings/${meetingId}`)
      const chatId   = data.data?.id
      nav(chatId ? `/chat?id=${chatId}` : '/chat')
    } catch {
      nav('/chat')
    }
  }

  function renderMeetingButtons(slot) {
    switch (slot) {
      case 'client-default': return (
        <><button onClick={clientCancel} className={CANCEL}>Отменить</button>
          <button onClick={goSupport}    className={GHOST}>Поддержка</button></>
      )
      case 'client-chat': return (
        <button onClick={goChat} className={WHITE}>Перейти в чат</button>
      )
      case 'model-pending': return (
        <><button onClick={modelCancel}  className={WHITE}>Отменить</button>
          <button onClick={confirmModel} className={PINK}>Подтвердить</button></>
      )
      case 'model-waiting': return (
        <><button onClick={modelCancel} className={CANCEL}>Отменить</button>
          <button onClick={goSupport}   className={GHOST}>Поддержка</button></>
      )
      case 'model-ready': return (
        <><button onClick={modelCancel} className={WHITE}>Отменить</button>
          <button onClick={confirmPaid} className={PINK}>Подтвердить встречу</button></>
      )
      case 'model-confirmed': return (
        <><button onClick={goChat}        className={WHITE}>Перейти в чат</button>
          <button onClick={finishMeeting} className={PINK}>Завершить встречу</button></>
      )
      default: return null
    }
  }

  function measureBtn(idx) {
    const btn = btnRefs.current[idx]
    const con = containerRef.current
    if (!btn || !con) return null
    const cr = con.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    return { left: br.left - cr.left, width: br.width }
  }

  function animateIndicatorTo(idx) {
    const pos = measureBtn(idx)
    const ind = indicatorRef.current
    if (!pos || !ind) return
    gsap.to(ind, { left: pos.left, width: pos.width, opacity: 1, duration: 0.38, ease: 'expo.out', overwrite: true })
  }

  function handleTabClick(idx, path) {
    const destSlot = getSlot(path, meeting.status, modelMeeting.status, isModel)
    if (destSlot === renderedSlot) animateIndicatorTo(idx)
    nav(path)
  }

  useLayoutEffect(() => {
    const w = wrapperRef.current
    if (!w) return
    gsap.set(w, targetSlot ? { autoAlpha: 1, y: 0 } : { autoAlpha: 0, y: 20 })

  }, [])

  useEffect(() => {
    if (!renderedTabs || activeIndex < 0) return
    const place = () => {
      const pos = measureBtn(activeIndex)
      const ind = indicatorRef.current
      if (!pos || !ind) return
      gsap.set(ind, { left: pos.left, width: pos.width, opacity: 1 })
    }
    const raf = requestAnimationFrame(() => {
      place()
      document.fonts?.ready.then(place)
    })
    return () => cancelAnimationFrame(raf)

  }, [])

  useEffect(() => {
    if (skipFirst3.current) { skipFirst3.current = false; return }

    const wrapper   = wrapperRef.current
    const inner     = innerRef.current
    const container = containerRef.current
    const indicator = indicatorRef.current

    const showWrapper = () => gsap.to(wrapper, { y: 0, autoAlpha: 1, duration: 0.32, ease: 'expo.out', overwrite: true })

    if (!renderedSlot && targetSlot) {
      setRenderedSlot(targetSlot)
      gsap.fromTo(wrapper, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32, ease: 'expo.out' })
      return
    }

    if (renderedSlot && !targetSlot) {
      gsap.to(wrapper, {
        y: 20, autoAlpha: 0, duration: 0.22, ease: 'power2.in', overwrite: true,
        onComplete: () => setRenderedSlot(null),
      })
      return
    }

    if (targetSlot === renderedSlot) {
      widthSnap.current = null
      gsap.killTweensOf(inner)
      gsap.to(inner, { opacity: 1, y: 0, duration: 0.18, ease: 'expo.out', overwrite: true })
      showWrapper()
      return
    }

    showWrapper()

    const leavingTabs = renderedSlot === 'tabs'
    if (leavingTabs && indicator) {
      gsap.to(indicator, { opacity: 0, duration: 0.14, ease: 'power2.in', overwrite: true })
    }

    widthSnap.current = container?.offsetWidth ?? null
    gsap.killTweensOf(inner)
    gsap.to(inner, {
      opacity: 0, y: 8, duration: 0.14, ease: 'power2.in',
      onComplete: () => setRenderedSlot(targetSlot),
    })

  }, [targetSlot])

  useLayoutEffect(() => {
    // Ensure indicator is always hidden when we're not on a tab slot
    const isTabs = renderedSlot === 'tabs'
    const indicator = indicatorRef.current
    if (indicator && !isTabs) {
      gsap.killTweensOf(indicator)
      gsap.set(indicator, { opacity: 0 })
    }

    const oldWidth = widthSnap.current
    if (oldWidth === null) return
    widthSnap.current = null

    const inner     = innerRef.current
    const container = containerRef.current
    if (!inner || !container) return

    container.style.width = ''
    const newWidth = container.offsetWidth

    gsap.fromTo(container,
      { width: oldWidth },
      { width: newWidth, duration: 0.38, ease: 'expo.out', clearProps: 'width' },
    )
    gsap.fromTo(inner,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'expo.out' },
    )
  }, [renderedSlot])

  useEffect(() => {
    if (skipFirst5.current) { skipFirst5.current = false; return }
    if (!renderedTabs || activeIndex < 0) return

    const pos = measureBtn(activeIndex)
    const ind = indicatorRef.current
    if (!pos || !ind) return

    gsap.to(ind, { left: pos.left, width: pos.width, opacity: 1, duration: 0.38, ease: 'expo.out', overwrite: 'auto' })

  }, [activeIndex, renderedSlot])

  return (
    <div
      ref={wrapperRef}
      className="fixed bottom-8 left-0 right-0 flex justify-center z-[10000] pointer-events-none px-5"
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      <div
        ref={containerRef}
        className="relative flex items-center bg-[#DFDBDF] text-nowrap rounded-full p-1 pointer-events-auto"
      >
        <div
          ref={indicatorRef}
          className="absolute top-1 bottom-1 bg-white rounded-full"
          style={{ left: 0, width: 0, opacity: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
        />

        <div ref={innerRef} className="flex items-center gap-2">
          {renderedTabs ? (
            <>
              <button
                ref={el => { btnRefs.current[0] = el }}
                onClick={() => handleTabClick(0, renderedTabs[0].path)}
                className="relative z-10 px-4 py-2.5 rounded-full text-base/[80%] font-medium select-none"
                style={{ color: activeIndex === 0 ? '#1C1C1E' : '#7F7F7F', transition: 'color 0.25s ease' }}
              >
                {renderedTabs[0].label}
              </button>

              {renderedSlot === 'tabs' && !auth.isModel() && meeting.meeting && (
                <button
                  onClick={() => {
                    const meetingId = meeting.meeting?.id
                    nav(meetingId ? `/meeting?id=${meetingId}` : '/meeting')
                  }}
                  className="relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-full select-none"
                  style={{ color: '#7F7F7F' }}
                >
                  {(() => {
                    const modelPhoto = meeting.meeting?.model_profile?.photos?.find(p => p.is_main)?.url
                      ?? meeting.meeting?.model_profile?.photos?.[0]?.url
                      ?? null
                    const modelName = meeting.meeting?.model_profile?.display_name ?? 'Встреча'
                    return (
                      <>
                        <div className="size-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center" {...(!modelPhoto ? { style: { background: '#E2319B' } } : {})}>
                          {modelPhoto && !avatarFailed ? (
                            <img
                              src={modelPhoto}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={() => setAvatarFailed(true)}
                            />
                          ) : (
                            <span className="text-white text-[10px] font-bold leading-none">
                              {modelName[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-base/[80%] font-medium">{modelName}</span>
                      </>
                    )
                  })()}
                </button>
              )}

              <button
                ref={el => { btnRefs.current[1] = el }}
                onClick={() => handleTabClick(1, renderedTabs[1].path)}
                className="relative z-10 px-4 py-2.5 rounded-full text-base/[80%] font-medium select-none"
                style={{ color: activeIndex === 1 ? '#1C1C1E' : '#7F7F7F', transition: 'color 0.25s ease' }}
              >
                {renderedTabs[1].label}
              </button>
            </>
          ) : renderedSlot ? (
            renderMeetingButtons(renderedSlot)
          ) : null}
        </div>
      </div>
    </div>
  )
}
