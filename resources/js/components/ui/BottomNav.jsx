import { useRef, useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useAuthStore from '@/stores/useAuthStore'
import gsap from 'gsap'

const TABS = [
  { label: 'nav.home', path: '/home', match: ['/home'] },
  { label: 'nav.more', path: '/more', match: ['/more'] },
]

export default function BottomNav() {
  const location    = useLocation()
  const { t, i18n } = useTranslation()
  const nav         = useTransitionNavigate()
  const auth        = useAuthStore()

  const { pathname } = location
  const isRequisite  = auth.isRequisite?.() ?? false
  const onTabsPath   = ['/home', '/more'].includes(pathname)
  const activeIndex  = TABS.findIndex((tab) => tab.match.includes(pathname))

  const wrapperRef   = useRef(null)
  const containerRef = useRef(null)
  const indicatorRef = useRef(null)
  const btnRefs      = useRef([])

  function measureBtn(idx) {
    const btn = btnRefs.current[idx]
    const con = containerRef.current
    if (!btn || !con) return null
    const cr = con.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    return { left: br.left - cr.left, width: br.width }
  }

  function placeIndicator(animate) {
    if (activeIndex < 0) return
    const pos = measureBtn(activeIndex)
    const ind = indicatorRef.current
    if (!pos || !ind) return
    if (animate) gsap.to(ind, { left: pos.left, width: pos.width, opacity: 1, duration: 0.38, ease: 'expo.out', overwrite: 'auto' })
    else gsap.set(ind, { left: pos.left, width: pos.width, opacity: 1 })
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      placeIndicator(false)
      document.fonts?.ready.then(() => placeIndicator(false))
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    placeIndicator(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, i18n.language])

  useLayoutEffect(() => {
    const w = wrapperRef.current
    if (w) gsap.set(w, { autoAlpha: 1, y: 0 })
  })

  if (isRequisite || !onTabsPath) return null

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

        <div className="flex items-center gap-2">
          {TABS.map((tab, i) => (
            <button
              key={tab.path}
              ref={(el) => { btnRefs.current[i] = el }}
              onClick={() => nav(tab.path)}
              className="relative z-10 px-4 py-2.5 rounded-full text-base/[80%] font-medium select-none"
              style={{ color: activeIndex === i ? '#1C1C1E' : '#7F7F7F', transition: 'color 0.25s ease' }}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
