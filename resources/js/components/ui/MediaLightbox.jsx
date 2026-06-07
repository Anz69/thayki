import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Mousewheel, Keyboard } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

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
    <div className="fixed inset-0 z-[100000] bg-black/95" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/15 text-white flex items-center justify-center active:bg-white/25 transition-colors"
        aria-label="Close"
      >
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <Swiper
        modules={[Pagination, Mousewheel, Keyboard]}
        initialSlide={index}
        slidesPerView={1}
        spaceBetween={16}
        grabCursor
        mousewheel={{ forceToAxis: true }}
        keyboard={{ enabled: true }}
        className="w-full h-full"
        pagination={{ clickable: true }}
        style={{ '--swiper-pagination-color': '#fff' }}
      >
        {media.map((m, i) => (
          <SwiperSlide key={i} className="flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center px-3 py-12" onClick={(e) => e.stopPropagation()}>
              {m.type === 'video'
                ? <video src={m.url} poster={m.poster} autoPlay loop muted playsInline className="max-w-full max-h-full object-contain rounded-xl bg-black" />
                : <img src={m.url} alt="" className="max-w-full max-h-full object-contain rounded-xl select-none" draggable={false} />}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>,
    document.body,
  )
}
