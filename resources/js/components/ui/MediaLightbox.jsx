import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Mousewheel, Keyboard } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

// Video that autoplays muted (browsers require it) and toggles sound on tap,
// Instagram-style, with a speaker badge showing the current state.
function LightboxVideo({ src, poster }) {
  const ref = useRef(null)
  const [muted, setMuted] = useState(true)
  const toggle = (e) => {
    e.stopPropagation()
    const v = ref.current
    if (!v) return
    const next = !v.muted
    v.muted = next
    setMuted(next)
    if (!next) { v.volume = 1; const p = v.play(); if (p?.catch) p.catch(() => {}) }
  }
  return (
    <div className="relative inline-flex max-w-full max-h-full" onClick={toggle}>
      <video ref={ref} src={src} poster={poster} autoPlay loop muted playsInline
        className="max-w-full max-h-full object-contain rounded-xl bg-black" />
      <span className="absolute bottom-3 right-3 size-9 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center pointer-events-none ring-1 ring-white/20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" fill="#fff" />
          {muted
            ? <path d="M16 9l5 5M21 9l-5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            : <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
        </svg>
      </span>
    </div>
  )
}

export const PlayBadge = ({ size = 64 }) => (
  <span className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none">
    <span className="rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center ring-1 ring-white/20" style={{ width: size, height: size }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
    </span>
  </span>
)

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
    <div className="fixed inset-0 z-[100050] bg-black/95" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/15 text-white flex items-center justify-center active:bg-white/25 transition-colors"
        aria-label="Close"
      >
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <style>{`
        .media-lb .swiper-pagination-bullet{ width:9px; height:9px; box-shadow:0 1px 4px rgba(0,0,0,.6); }
      `}</style>
      <Swiper
        modules={[Pagination, Mousewheel, Keyboard]}
        initialSlide={index}
        slidesPerView={1}
        spaceBetween={16}
        grabCursor
        mousewheel={{ forceToAxis: true }}
        keyboard={{ enabled: true }}
        className="media-lb w-full h-full"
        pagination={{ clickable: true }}
        style={{
          '--swiper-pagination-color': '#fff',
          '--swiper-pagination-bullet-inactive-color': '#ffffff',
          '--swiper-pagination-bullet-inactive-opacity': '0.6',
          '--swiper-pagination-bottom': '16px',
        }}
      >
        {media.map((m, i) => (
          <SwiperSlide key={i} className="flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center px-3 py-12" onClick={(e) => e.stopPropagation()}>
              {m.type === 'video'
                ? <LightboxVideo src={m.url} poster={m.poster} />
                : <img src={m.url} alt="" className="max-w-full max-h-full object-contain rounded-xl select-none" draggable={false} />}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>,
    document.body,
  )
}
