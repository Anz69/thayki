import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

export const PlayBadge = ({ size = 64 }) => (
  <span className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none">
    <span className="rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center ring-1 ring-white/20" style={{ width: size, height: size }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
    </span>
  </span>
)

const fmtT = (s) => {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/* Custom video player — own play/pause, scrubber, volume, fullscreen. */
function CustomVideoPlayer({ src, poster }) {
  const vRef = useRef(null)
  const wrapRef = useRef(null)
  const hideRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [muted, setMuted] = useState(false)
  const [ui, setUi] = useState(true)

  const armHide = () => {
    clearTimeout(hideRef.current)
    hideRef.current = setTimeout(() => { if (!vRef.current?.paused) setUi(false) }, 2600)
  }
  const poke = () => { setUi(true); armHide() }
  useEffect(() => () => clearTimeout(hideRef.current), [])

  const toggle = () => {
    const v = vRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
    poke()
  }
  const seek = (e) => {
    const bar = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - bar.left) / bar.width))
    if (vRef.current && dur) { vRef.current.currentTime = ratio * dur; poke() }
  }
  const toggleMute = (e) => { e.stopPropagation(); const v = vRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted) } }
  const fullscreen = (e) => {
    e.stopPropagation()
    const el = wrapRef.current
    if (document.fullscreenElement) document.exitFullscreen?.()
    else (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el)
  }

  const pct = dur ? (cur / dur) * 100 : 0

  return (
    <div ref={wrapRef} className="relative w-full h-full flex items-center justify-center" onClick={(e) => { e.stopPropagation(); toggle() }}>
      <video
        ref={vRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="max-w-full max-h-full object-contain rounded-xl bg-black"
        onPlay={() => { setPlaying(true); armHide() }}
        onPause={() => { setPlaying(false); setUi(true) }}
        onTimeUpdate={() => setCur(vRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDur(vRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      <button
        onClick={(e) => { e.stopPropagation(); toggle() }}
        className={`absolute size-[68px] rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center transition-opacity duration-200 ${playing && !ui ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {playing
          ? <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          : <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>}
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 px-4 pb-5 pt-10 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-3 transition-opacity duration-200 ${ui ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <button onClick={toggle} className="shrink-0 text-white">
          {playing
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>}
        </button>
        <span className="text-white/90 text-[12px] tabular-nums shrink-0" style={{ fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>{fmtT(cur)}</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/25 relative cursor-pointer" onClick={seek}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#E2319B]" style={{ width: pct + '%' }} />
          <div className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow" style={{ left: `calc(${pct}% - 6px)` }} />
        </div>
        <span className="text-white/60 text-[12px] tabular-nums shrink-0" style={{ fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>{fmtT(dur)}</span>
        <button onClick={toggleMute} className="shrink-0 text-white">
          {muted
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="#fff" /><path d="m16 9 4 6M20 9l-4 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="#fff" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
        </button>
        <button onClick={fullscreen} className="shrink-0 text-white">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  )
}

/**
 * Full-screen, swipeable lightbox for a mixed media list.
 * `media`: [{ type: 'image'|'video', url, poster? }], `index`: start slide.
 */
export default function MediaLightbox({ media, index = 0, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!media?.length) return null

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/95" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/15 text-white flex items-center justify-center active:bg-white/25 transition-colors"
        aria-label="Close"
      >
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <Swiper
        modules={[Pagination]}
        initialSlide={index}
        slidesPerView={1}
        spaceBetween={16}
        className="w-full h-full"
        pagination={{ clickable: true }}
        style={{ '--swiper-pagination-color': '#fff' }}
      >
        {media.map((m, i) => (
          <SwiperSlide key={i} className="flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center px-3 py-12" onClick={(e) => e.stopPropagation()}>
              {m.type === 'video'
                ? <CustomVideoPlayer src={m.url} poster={m.poster} />
                : <img src={m.url} alt="" className="max-w-full max-h-full object-contain rounded-xl select-none" draggable={false} />}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>,
    document.body,
  )
}
