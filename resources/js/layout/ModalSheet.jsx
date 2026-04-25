import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { pushPageBack, restorePageFront, setPageDepth } from '@/composables/usePageDepth'

export default function ModalSheet({ isOpen, onClose, height = '95dvh', children }) {
  const [isVisible, setIsVisible] = useState(false)
  const sheetRef  = useRef(null)
  const handleRef = useRef(null)
  const touchState = useRef({ startY: 0, startX: 0, isDragging: false, dir: null })
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const animateOut = useCallback((onComplete) => {
    restorePageFront(0.38)
    gsap.to(sheetRef.current, { y: '100%', duration: 0.36, ease: 'power3.in', onComplete })
  }, [])

  useEffect(() => {
    if (isOpen && !isVisible)       setIsVisible(true)
    else if (!isOpen && isVisible)  animateOut(() => setIsVisible(false))
  }, [isOpen])

  // Disable Telegram vertical swipe-to-close while sheet is open
  useEffect(() => {
    if (!isVisible) return
    window.Telegram?.WebApp?.disableVerticalSwipes?.()
    return () => window.Telegram?.WebApp?.enableVerticalSwipes?.()
  }, [isVisible])

  // Entrance animation
  useEffect(() => {
    if (!isVisible || !sheetRef.current) return
    const kids = Array.from(sheetRef.current.children)
    gsap.set(sheetRef.current, { y: '100%' })
    gsap.set(kids, { opacity: 0, y: 16 })
    pushPageBack(0.44)
    gsap.timeline()
      .to(sheetRef.current, { y: '0%', duration: 0.44, ease: 'power3.out' }, 0)
      .to(kids, { opacity: 1, y: 0, duration: 0.48, stagger: 0.06, ease: 'power3.out' }, 0.1)
  }, [isVisible])

  // Attach drag handlers to handle area only, with passive:false so we can preventDefault
  useEffect(() => {
    const el = handleRef.current
    if (!el || !isVisible) return

    const onStart = (e) => {
      touchState.current = {
        startY: e.touches[0].clientY,
        startX: e.touches[0].clientX,
        isDragging: false,
        dir: null,
      }
    }

    const onMove = (e) => {
      const { startY, startX } = touchState.current
      const dy = e.touches[0].clientY - startY
      const dx = Math.abs(e.touches[0].clientX - startX)

      // Lock direction on first real movement
      if (!touchState.current.dir && (Math.abs(dy) > 4 || dx > 4)) {
        touchState.current.dir = dx > Math.abs(dy) ? 'h' : 'v'
      }
      if (touchState.current.dir === 'h' || dy <= 0) return

      e.preventDefault() // Block Telegram from intercepting
      touchState.current.isDragging = true
      gsap.set(sheetRef.current, { y: dy * 0.58 })
      setPageDepth(Math.min(dy / 400, 1))
    }

    const onEnd = (e) => {
      if (!touchState.current.isDragging) return
      touchState.current.isDragging = false
      const dy = e.changedTouches[0].clientY - touchState.current.startY
      if (dy > 110) {
        onCloseRef.current()
      } else {
        gsap.to(sheetRef.current, { y: 0, duration: 0.42, ease: 'back.out(2.2)' })
        pushPageBack(0.42)
      }
    }

    const onMouseDown = (e) => {
      if (e.button !== 0) return
      touchState.current = { startY: e.clientY, startX: e.clientX, isDragging: false, dir: null }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup',   onMouseUp)
    }
    const onMouseMove = (e) => {
      const { startY, startX } = touchState.current
      const dy = e.clientY - startY
      const dx = Math.abs(e.clientX - startX)
      if (!touchState.current.dir && (Math.abs(dy) > 4 || dx > 4)) {
        touchState.current.dir = dx > Math.abs(dy) ? 'h' : 'v'
      }
      if (touchState.current.dir === 'h' || dy <= 0) return
      touchState.current.isDragging = true
      gsap.set(sheetRef.current, { y: dy * 0.58 })
      setPageDepth(Math.min(dy / 400, 1))
    }
    const onMouseUp = (e) => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
      if (!touchState.current.isDragging) return
      touchState.current.isDragging = false
      const dy = e.clientY - touchState.current.startY
      if (dy > 110) {
        onCloseRef.current()
      } else {
        gsap.to(sheetRef.current, { y: 0, duration: 0.42, ease: 'back.out(2.2)' })
        pushPageBack(0.42)
      }
    }

    el.addEventListener('touchstart', onStart,     { passive: true })
    el.addEventListener('touchmove',  onMove,      { passive: false })
    el.addEventListener('touchend',   onEnd,       { passive: true })
    el.addEventListener('mousedown',  onMouseDown)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
      el.removeEventListener('mousedown',  onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
    }
  }, [isVisible])

  if (!isVisible) return null
  return createPortal(
    <>
      <style>{`
        .modal-layout-root {
          position: fixed; inset: 0; z-index: 10000; pointer-events: none;
        }
        .modal-layout-sheet {
          position: absolute; bottom: 0; left: 0; right: 0; background: #fff;
          border-radius: 28px 28px 0 0; display: flex; flex-direction: column;
          pointer-events: all; will-change: transform;
          box-shadow: 0 -6px 48px rgba(0,0,0,0.14); overflow: hidden;
        }
        .modal-layout-handle {
          touch-action: none;
          cursor: grab;
          display: flex;
          justify-content: center;
          padding: 12px 0 16px;
          flex-shrink: 0;
        }
        .modal-layout-handle:active { cursor: grabbing; }
      `}</style>
      <div className="modal-layout-root">
        <div ref={sheetRef} className="modal-layout-sheet" style={{ height }}>
          <div ref={handleRef} className="modal-layout-handle">
            <div style={{ width: 48, height: 4, borderRadius: 9999, background: 'rgba(0,0,0,0.15)' }} />
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
