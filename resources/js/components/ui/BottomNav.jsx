import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useMeetingStore from '@/stores/useMeetingStore'
import useModelMeetingStore from '@/stores/useModelMeetingStore'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import gsap from 'gsap'

const TABS = [
  { label: 'nav.home', path: '/home', match: ['/home'] },
  { label: 'nav.more', path: '/more', match: ['/more'] },
]

function getSlot(pathname, clientStatus, modelStatus, isModel) {
  if (['/home', '/more'].includes(pathname)) return 'tabs'
  if (pathname === '/meeting') {
    if (isModel) {
      if (!modelStatus || ['rejected', 'expired', 'cancelled', 'completed'].includes(modelStatus)) return null
      if (modelStatus === 'pending')   return 'model-pending'
      if (modelStatus === 'accepted')  return 'model-waiting'
      if (modelStatus === 'paid' || modelStatus === 'confirmed') return 'model-confirmed'
      return null
    }
    if (!clientStatus || ['rejected', 'expired', 'cancelled', 'completed'].includes(clientStatus)) return null
    return (clientStatus === 'paid' || clientStatus === 'confirmed') ? 'client-chat' : 'client-default'
  }
  return null
}

function getTabsForSlot(slot, isManager = false) {
  if (slot === 'tabs') {
    // Managers don't create leads — hide the «Подобрать» tab for them.
    return isManager ? TABS.filter((tab) => tab.path !== '/request') : TABS
  }
  return null
}

const BASE   = 'px-4 py-2.5 rounded-full text-base/[80%] font-medium select-none'
const WHITE  = `${BASE} bg-white text-black active:bg-[#DFDBDF] transition-colors`
const GHOST  = `${BASE} text-[#7F7F7F]`
const CANCEL = `${BASE} bg-white text-black active:bg-white/90 transition-colors`
const PINK   = `${BASE} bg-[#E2319B] text-white active:opacity-80 transition-opacity`

export default function BottomNav() {
  const location     = useLocation()
  const [params]     = useSearchParams()
  const { t, i18n }  = useTranslation()
  const nav          = useTransitionNavigate()
  const meeting      = useMeetingStore()
  const modelMeeting = useModelMeetingStore()
  const auth         = useAuthStore()

  const { pathname } = location
  // '/request' is NOT hidden here — getSlot returns null for it so the pill
  // animates out smoothly (the page shows its own submit bar instead).
  const hiddenPaths = new Set(['/become-model', '/application-pending', '/welcome'])
  const isHiddenPath = hiddenPaths.has(pathname) || pathname === '/'

  const isModel = auth.isModel()
  const isManager = auth.isManager?.() ?? false

  const initialSlot = getSlot(pathname, meeting.status, modelMeeting.status, isModel)
  const [renderedSlot, setRenderedSlot] = useState(initialSlot)
  const [avatarFailed, setAvatarFailed] = useState(false)

  const rawTargetSlot = getSlot(pathname, meeting.status, modelMeeting.status, isModel)
  const isMeetingBootstrapping = pathname === '/meeting'
    && (
      isModel
        ? (modelMeeting.isBootstrapping || (modelMeeting.isLoading && !modelMeeting.status))
        : (meeting.isBootstrapping || (meeting.isLoading && !meeting.status))
    )
  const targetSlot = isMeetingBootstrapping ? renderedSlot : rawTargetSlot
  const targetTabs = getTabsForSlot(targetSlot, isManager)
  const activeIndex = targetTabs ? targetTabs.findIndex(t => t.match.includes(pathname)) : -1

  const renderedTabs = getTabsForSlot(renderedSlot, isManager)

  const wrapperRef   = useRef(null)
  const containerRef = useRef(null)
  const innerRef     = useRef(null)
  const indicatorRef = useRef(null)
  const btnRefs      = useRef([])

  const widthSnap  = useRef(null)
  const skipFirst3 = useRef(true)
  const skipFirst5 = useRef(true)
  const ordersButtonRef  = useRef(null)
  const prevMeetingActive = useRef(false)

  useEffect(() => {
    if (isHiddenPath) return
    if (!auth.isModel() && !meeting.meeting) {
      meeting.loadLatest()
    }
  }, [isHiddenPath, auth.user?.role, meeting.meeting?.id])

  useEffect(() => {
    if (isHiddenPath) return
    const terminal = ['cancelled', 'rejected', 'expired', 'completed']
    const isActive = !!(meeting.meeting?.id) && !terminal.includes(meeting.status) && !auth.isModel()
    if (!prevMeetingActive.current && isActive && ordersButtonRef.current) {
      gsap.fromTo(
        ordersButtonRef.current,
        { autoAlpha: 0, scale: 0.8 },
        { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.3)', overwrite: true },
      )
    }
    prevMeetingActive.current = isActive
  }, [meeting.meeting?.id, meeting.status])

  const clientCancel  = () => meeting.openCancel()
  const modelCancel   = () => modelMeeting.openCancel()
  const goSupport     = () => nav('/support')
  const confirmModel  = () => modelMeeting.accept()
  const finishMeeting = () => modelMeeting.openFinish()

  const goChat = async () => {
    const urlId = pathname === '/meeting' ? Number(params.get('id') || 0) : 0
    const meetingId = urlId > 0
      ? urlId
      : (meeting.meeting?.id ?? modelMeeting.meeting?.id)
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
    if (isHiddenPath) return
    if (renderedSlot === null && targetSlot) {
      skipFirst3.current = false
      setRenderedSlot(targetSlot)
      const w0 = wrapperRef.current
      if (w0) gsap.fromTo(w0, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32, ease: 'expo.out' })
      return
    }
    if (skipFirst3.current) { skipFirst3.current = false; return }
    if (isMeetingBootstrapping) return

    const wrapper   = wrapperRef.current
    const inner     = innerRef.current
    const container = containerRef.current
    const indicator = indicatorRef.current

    if (!wrapper) return

    const showWrapper = () => {
      gsap.to(wrapper, { y: 0, autoAlpha: 1, duration: 0.32, ease: 'expo.out', overwrite: true })
    }

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
      if (inner) {
        gsap.killTweensOf(inner)
        gsap.to(inner, { opacity: 1, y: 0, duration: 0.18, ease: 'expo.out', overwrite: true })
      }
      showWrapper()
      return
    }

    showWrapper()

    const leavingTabs = renderedSlot === 'tabs'
    if (leavingTabs && indicator) {
      gsap.to(indicator, { opacity: 0, duration: 0.14, ease: 'power2.in', overwrite: true })
    }

    widthSnap.current = container?.offsetWidth ?? null
    if (inner) {
      gsap.killTweensOf(inner)
      gsap.to(inner, {
        opacity: 0, y: 8, duration: 0.14, ease: 'power2.in',
        onComplete: () => setRenderedSlot(targetSlot),
      })
    } else {
      setRenderedSlot(targetSlot)
    }

  }, [targetSlot, isMeetingBootstrapping])

  useLayoutEffect(() => {
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
    if (isHiddenPath) return
    if (skipFirst5.current) { skipFirst5.current = false; return }
    if (!renderedTabs || activeIndex < 0) return

    const pos = measureBtn(activeIndex)
    const ind = indicatorRef.current
    if (!pos || !ind) return

    gsap.to(ind, { left: pos.left, width: pos.width, opacity: 1, duration: 0.38, ease: 'expo.out', overwrite: 'auto' })

  }, [activeIndex, renderedSlot])

  // Re-place the active pill when labels change width (e.g. language switch)
  useEffect(() => {
    if (renderedSlot !== 'tabs' || activeIndex < 0) return
    const id = requestAnimationFrame(() => {
      const pos = measureBtn(activeIndex)
      const ind = indicatorRef.current
      if (pos && ind) gsap.to(ind, { left: pos.left, width: pos.width, opacity: 1, duration: 0.3, ease: 'expo.out', overwrite: 'auto' })
    })
    return () => cancelAnimationFrame(id)
  }, [i18n.language, activeIndex, renderedSlot]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isHiddenPath) return null

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
              {renderedTabs.map((tab, i) => (
                <button
                  key={tab.path}
                  ref={el => { btnRefs.current[i] = el }}
                  onClick={() => handleTabClick(i, tab.path)}
                  className="relative z-10 px-4 py-2.5 rounded-full text-base/[80%] font-medium select-none"
                  style={{ color: activeIndex === i ? '#1C1C1E' : '#7F7F7F', transition: 'color 0.25s ease' }}
                >
                  {t(tab.label)}
                </button>
              ))}

              {renderedSlot === 'tabs' && !auth.isModel() && meeting.meeting && !['cancelled', 'rejected', 'expired', 'completed'].includes(meeting.status) && (
                <button
                  ref={ordersButtonRef}
                  onClick={() => {
                    const meetingId = meeting.meeting?.id
                    nav(meetingId ? `/meeting?id=${meetingId}` : '/meeting')
                  }}
                  className="relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-full select-none"
                  style={{ color: '#7F7F7F' }}
                >
                  {(() => {
                    const modelPhoto = meeting.meeting?.model_profile?.user?.photo_url
                      ?? meeting.meeting?.model_profile?.photos?.find(p => p.is_main)?.url
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
            </>
          ) : renderedSlot ? (
            renderMeetingButtons(renderedSlot)
          ) : null}
        </div>
      </div>
    </div>
  )
}
