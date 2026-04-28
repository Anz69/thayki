import { useEffect, useRef, useState } from 'react'

export default function PhotoViewer({ src, onClose }) {
  const [phase, setPhase] = useState('entering')
  const closeScheduled = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPhase('visible'))

    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const handleClose = () => {
    if (closeScheduled.current) return
    closeScheduled.current = true
    setPhase('leaving')
    setTimeout(onClose, 260)
  }

  const entering = phase === 'entering'
  const leaving  = phase === 'leaving'
  const hidden   = entering || leaving

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hidden ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.88)',
        backdropFilter: hidden ? 'blur(0px)' : 'blur(12px)',
        WebkitBackdropFilter: hidden ? 'blur(0px)' : 'blur(12px)',
        transition: leaving
          ? 'background 0.24s ease, backdrop-filter 0.24s ease'
          : 'background 0.22s ease, backdrop-filter 0.22s ease',
        cursor: 'zoom-out',
      }}
      onClick={handleClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); handleClose() }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hidden ? 0 : 1,
          transform: hidden ? 'scale(0.8)' : 'scale(1)',
          transition: 'opacity 0.2s ease, transform 0.2s ease, background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1L13 13M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <img
        src={src}
        alt=""
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '88vh',
          borderRadius: 16,
          objectFit: 'contain',
          cursor: 'default',
          opacity: hidden ? 0 : 1,
          transform: entering
            ? 'scale(0.84)'
            : leaving
              ? 'scale(0.88)'
              : 'scale(1)',
          transition: leaving
            ? 'opacity 0.22s ease, transform 0.22s ease'
            : 'opacity 0.26s ease, transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          userSelect: 'none',
        }}
      />
    </div>
  )
}
