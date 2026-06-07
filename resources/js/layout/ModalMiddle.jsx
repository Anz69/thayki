import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { lockTelegramVerticalSwipes, unlockTelegramVerticalSwipes } from '@/utils/modalLocks'

export default function ModalMiddle({ isOpen, onClose, onAfterClose, children }) {
  const [isVisible, setIsVisible] = useState(isOpen)
  const rootRef   = useRef(null)
  const sheetRef  = useRef(null)
  const handleRef = useRef(null)
  const backdropPointerDown = useRef(false)
  const touchState = useRef({ startY: 0, startX: 0, isDragging: false, dir: null })
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const animateOut = useCallback((onComplete) => {
    const sheet = sheetRef.current
    const root = rootRef.current
    const targets = [sheet, root].filter(Boolean)
    if (targets.length) gsap.killTweensOf(targets)
    if (!sheet || !root) {
      onComplete?.()
      return
    }
    gsap.timeline({ onComplete })
      .to(sheet, { y: '100%', duration: 0.32, ease: 'power3.in' }, 0)
      .to(root, { opacity: 0, duration: 0.24, ease: 'power2.in' }, 0.06)
  }, [])

  useEffect(() => {
    if (isOpen && !isVisible)      setIsVisible(true)
    else if (!isOpen && isVisible) animateOut(() => { setIsVisible(false); onAfterClose?.() })
  }, [isOpen])

  useEffect(() => {
    if (!isVisible) return
    lockTelegramVerticalSwipes()
    return () => unlockTelegramVerticalSwipes()
  }, [isVisible])

  // Keep the sheet (and its submit button) above the on-screen keyboard.
  // When the keyboard opens, visualViewport shrinks — lift the sheet by that
  // inset and cap its height to the visible area so nothing slides off / under.
  useEffect(() => {
    if (!isVisible) return undefined
    const vv = window.visualViewport
    if (!vv) return undefined
    const update = () => {
      const sheet = sheetRef.current
      if (!sheet) return
      // Keyboard height (don't use offsetTop — on iOS Telegram it overshoots).
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height))
      sheet.style.bottom = kb + 'px'
      sheet.style.maxHeight = Math.round(vv.height - 16) + 'px'
    }
    // On the keyboard opening (resize), also pull the sheet content to the
    // bottom so the action button / focused field is visible right away.
    const onResize = () => {
      update()
      const kb = window.innerHeight - vv.height
      if (kb > 120) {
        const sc = sheetRef.current?.querySelector('.modal-middle-scroll')
        if (sc) requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight + 9999 })
      }
    }
    update()
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', update)
      if (sheetRef.current) {
        sheetRef.current.style.bottom = ''
        sheetRef.current.style.maxHeight = ''
      }
    }
  }, [isVisible])

  // Run before paint so the backdrop never flashes at full opacity (CSS bg would show for one frame,
  // then gsap.set(opacity:0) in useEffect caused appear → vanish → fade-in).
  useLayoutEffect(() => {
    if (!isVisible || !rootRef.current || !sheetRef.current) return
    const kids = Array.from(sheetRef.current.children)
    gsap.killTweensOf([rootRef.current, sheetRef.current, ...kids])
    gsap.set(rootRef.current,  { opacity: 0 })
    gsap.set(sheetRef.current, { y: '100%' })
    gsap.set(kids, { opacity: 0, y: 18, scale: 0.985 })
    gsap.timeline()
      .to(rootRef.current,  { opacity: 1, duration: 0.22, ease: 'power2.out' }, 0)
      .to(sheetRef.current, { y: '0%',   duration: 0.44, ease: 'power3.out' }, 0)
      .to(kids, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform' }, 0.14)
  }, [isVisible])

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

      if (!touchState.current.dir && (Math.abs(dy) > 4 || dx > 4)) {
        touchState.current.dir = dx > Math.abs(dy) ? 'h' : 'v'
      }
      if (touchState.current.dir === 'h' || dy <= 0) return

      e.preventDefault()
      touchState.current.isDragging = true
      const sheet = sheetRef.current
      if (sheet) gsap.set(sheet, { y: dy * 0.58 })
    }

    const onEnd = (e) => {
      if (!touchState.current.isDragging) return
      touchState.current.isDragging = false
      const dy = e.changedTouches[0].clientY - touchState.current.startY
      const sheet = sheetRef.current
      if (dy > 110) {
        onCloseRef.current()
      } else if (sheet) {
        gsap.to(sheet, { y: 0, duration: 0.42, ease: 'back.out(2.2)' })
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [isVisible])

  const onRootPointerDown = (e) => { backdropPointerDown.current = e.target === rootRef.current }
  const onRootClick = (e) => {
    if (!backdropPointerDown.current) return
    if (e.target !== rootRef.current)  return
    onClose()
  }

  if (!isVisible) return null
  return createPortal(
    <>
      <style>{`
        .modal-middle-root {
          position: fixed; inset: 0; z-index: 100001; pointer-events: all;
          width: 100%; height: 100%; display: flex;
          background: rgba(0,0,0,0.55);
        }
        .modal-middle-sheet {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 9001; background: #fff;
          border-radius: 24px; display: flex; flex-direction: column;
          pointer-events: all; will-change: transform;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.12); overflow: hidden; max-height: 92dvh;
        }
        .modal-middle-handle {
          touch-action: none;
          cursor: grab;
          display: flex;
          justify-content: center;
          padding: 12px 0 14px;
          flex-shrink: 0;
        }
        .modal-middle-handle:active { cursor: grabbing; }
        .modal-middle-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
      `}</style>
      <div
        ref={rootRef}
        className="modal-middle-root"
        style={{ opacity: 0 }}
        onPointerDown={onRootPointerDown}
        onClick={onRootClick}
      >
        <div
          ref={sheetRef}
          className="modal-middle-sheet mx-4 mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={handleRef} className="modal-middle-handle">
            <div style={{ width: 48, height: 4, borderRadius: 9999, background: 'rgba(0,0,0,0.15)' }} />
          </div>
          <div className="modal-middle-scroll">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
