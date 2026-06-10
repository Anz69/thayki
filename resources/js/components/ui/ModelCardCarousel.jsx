import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import gsap from 'gsap'
import 'swiper/css'
import { getEmojiUrl } from '@/utils/emoji'
import OptimizedImage from '@/components/ui/OptimizedImage'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

const EMOJI_SETS = [
  ['🐵', '❤️', '😍'], ['💫', '🔥', '😘'], ['✨', '💕', '🥰'],
  ['🌸', '😻', '💖'], ['🦋', '💓', '🤩'], ['🌺', '❤️', '😏'],
]

const FALLBACK = [
  { id: 1, photo: '/img/girls/big/6.png', name: 'Канника', emojis: EMOJI_SETS[0] },
  { id: 2, photo: '/img/girls/big/2.png', name: 'Намфон',  emojis: EMOJI_SETS[1] },
  { id: 3, photo: '/img/girls/big/3.png', name: 'Малай',   emojis: EMOJI_SETS[2] },
  { id: 4, photo: '/img/girls/big/4.png', name: 'Супхан',  emojis: EMOJI_SETS[3] },
  { id: 5, photo: '/img/girls/big/5.png', name: 'Пранни',  emojis: EMOJI_SETS[4] },
  { id: 6, photo: '/img/girls/big/1.png', name: 'Чалида',  emojis: EMOJI_SETS[5] },
]
const CARD_H = 460
const STYLES = `
  .mc-swiper {
    width: 100%;
    height: 100%;
    overflow: visible !important;
  }
  .mc-swiper .swiper-slide {
    width: 60%;
    height: 100%;
    transform: scale(0.84) translateY(18px);
    opacity: 0.42;
    transition:
      transform 0.5s cubic-bezier(0.34, 1.42, 0.64, 1),
      opacity   0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform, opacity;
    transform-origin: bottom center;
  }
  .mc-swiper .swiper-slide-prev {
    transform: scale(0.84) translateY(18px) rotate(-3.5deg) !important;
    transform-origin: bottom center;
  }
  .mc-swiper .swiper-slide-next {
    transform: scale(0.84) translateY(18px) rotate(3.5deg) !important;
    transform-origin: bottom center;
  }
  .mc-swiper .swiper-slide-active {
    transform: scale(1) translateY(0) !important;
    opacity:   1                      !important;
  }
`
export default function ModelCardCarousel({ className = '', isActive, blur = false }) {
  const wrapRef  = useRef(null)
  const swiperRef = useRef(null)
  const [models, setModels] = useState(FALLBACK)
  const [loaded, setLoaded]   = useState(false)
  const [settled, setSettled] = useState(false)
  const ready = loaded && settled

  useEffect(() => {
    let cancelled = false
    api.get('/catalog/models', { params: { per_page: 6 } })
      .then((r) => {
        if (cancelled) return
        const list = Array.isArray(r?.data?.data) ? r.data.data : []
        const mapped = list
          .map((m, i) => {
            const photos = Array.isArray(m.photos) ? m.photos.filter(Boolean) : []
            const main = photos.find((p) => p?.is_main) ?? photos[0]
            if (!main?.url) return null
            return { id: m.id, photo: resolveMediaUrl(main.url), name: modelName(m), emojis: EMOJI_SETS[i % EMOJI_SETS.length] }
          })
          .filter(Boolean)
        if (mapped.length) setModels(mapped)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  useLayoutEffect(() => {
    gsap.set(wrapRef.current, { autoAlpha: 0, y: 24 })
  }, [])

  useEffect(() => {
    if (!isActive || settled) return undefined
    const id = setTimeout(() => setSettled(true), 440)
    return () => clearTimeout(id)
  }, [isActive, settled])

  useEffect(() => {
    if (!ready || !wrapRef.current) return undefined
    const raf = requestAnimationFrame(() => {
      if (!wrapRef.current) return
      gsap.to(wrapRef.current, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [ready])

  return (
    <>
      <style>{STYLES}</style>
      <div
        ref={wrapRef}
        className={`w-full max-h-[550px] ${className}`}
        style={{ height: '95%' }}
      >
        {ready && (
          <Swiper
            className="mc-swiper"
            modules={[Autoplay]}
            centeredSlides
            slidesPerView="auto"
            loop
            loopAdditionalSlides={2}
            speed={500}
            grabCursor
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            onSwiper={(s) => { swiperRef.current = s }}
          >
            {models.map((m) => (
              <SwiperSlide key={m.id}>
                <ModelCard m={m} blur={blur} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </>
  )
}
function ModelCard({ m, blur = false }) {
  return (
    <div
      className="w-full h-full bg-white flex flex-col relative border border-black/10"
      style={{
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      <div className="absolute inset-0 bg-[#EDE8E8]">
        
        <div
          className="absolute inset-0"
          style={blur ? { filter: 'blur(8px)', transform: 'scale(1.12)' } : undefined}
        >
          <OptimizedImage
            src={m.photo}
            alt={m.name}
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>
        {blur ? (
          
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(20,8,18,0.10) 0%, rgba(20,8,18,0) 30%, rgba(34,10,28,0.42) 66%, rgba(28,8,24,0.74) 100%)' }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: 170,
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.55) 40%, #fff 80%)',
            }}
          />
        )}
      </div>

      {blur ? (
        
        <div
          className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-2xl px-3.5 py-3 flex items-center gap-3"
          style={{
            background: 'rgba(22,9,18,0.42)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <span className="shrink-0 size-9 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F857B0, #C01A7E)', boxShadow: '0 4px 12px rgba(226,49,155,0.4)' }}>
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="#fff" strokeWidth="1.7" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex-1 flex flex-col gap-1.5">
            <span className="h-2.5 rounded-full bg-white/85" style={{ width: '72%' }} />
            <span className="h-2 rounded-full bg-white/45" style={{ width: '46%' }} />
          </span>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-5 pb-6 z-10">
          <div className="flex gap-2.5 mb-1">
            {m.emojis.map((e, j) => (
              <div
                key={`${e}-${j}`}
                className={
                  "size-7 bg-white rounded-full flex items-center justify-center " +
                  (j === 1 ? "-translate-y-1.5 " : "")
                }
                style={{
                  boxShadow: '0 2px 12px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.05)',
                }}
              >
                <img src={getEmojiUrl(e)} alt={e} width={18} height={18} draggable={false} />
              </div>
            ))}
          </div>
          <span className="text-black text-[31px]/[110%] font-semibold tracking-[-0.02em]">
            {m.name}
          </span>
          {m.desc && (
            <span className="text-[#777779] text-[13px]/[145%] font-medium text-center mt-1.5 px-3">
              {m.desc}
            </span>
          )}
        </div>
      )}
    </div>
  )
}