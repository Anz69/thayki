import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import TransitionLink from '@/components/TransitionLink'
import ShareModelsModal from '@/components/modals/ShareModelsModal'
import api, { extractErrorMessage } from '@/utils/api'

function ModelCard({ model }) {
  const mainPhoto = model.photos?.find(p => p.is_main) ?? model.photos?.[0]
  const minPrice  = model.price_options?.length
    ? Math.min(...model.price_options.map(p => p.price_thb))
    : model.hourly_rate_thb

  return (
    <TransitionLink
      to={`/model/${model.id}`}
      className="relative overflow-hidden border-2 border-black/15 rounded-2xl flex flex-col justify-end min-h-[300px] active:scale-[0.97] transition-transform duration-150"
    >
      {mainPhoto ? (
        <img
          src={mainPhoto.url}
          alt={model.display_name}
          className="absolute top-0 left-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-[#EFEEF3]" />
      )}
      <div className="absolute bottom-0 left-0 w-full h-28 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="flex flex-col gap-3 relative z-30 px-3.5 py-5">
        <div className="p-2 bg-[#EFEEF3] rounded-2xl text-[#1B1B1B] font-medium text-xs/[100%] w-max">
          ฿ {minPrice?.toLocaleString()} /ч
        </div>
        <h1 className="text-white text-base/[100%] font-medium">
          {model.display_name}, {model.age}
        </h1>
      </div>
    </TransitionLink>
  )
}

export default function HomePage() {
  const headerRef   = useRef(null)
  const titleRef    = useRef(null)
  const shareBtnRef = useRef(null)
  const gridRef     = useRef(null)

  const [models,  setModels]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isShareOpen, setIsShareOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.get('/catalog/models', { params: { per_page: 20 } })
      .then(r => { if (!cancelled) setModels(r.data.data ?? []) })
      .catch((err) => {
        if (cancelled) return
        setError(extractErrorMessage(err, 'Не удалось загрузить моделей'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  const startAnimations = () => {
    const cards = Array.from(gridRef.current?.children ?? [])
    const tl = gsap.timeline({ defaults: { force3D: true } })

    tl.to(headerRef.current,   { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' })
      .to(titleRef.current,    { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power3.out' }, 0.04)
      .to(shareBtnRef.current, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power3.out' }, 0.07)

    tl.to(cards, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.58,
      stagger: { each: 0.07, from: 'start' },
      ease: 'power4.out',
      clearProps: 'transform,will-change',
    }, 0.1)
  }

  useLayoutEffect(() => {
    gsap.set(headerRef.current,   { autoAlpha: 0, y: -28 })
    gsap.set(titleRef.current,    { autoAlpha: 0, y: -12 })
    gsap.set(shareBtnRef.current, { autoAlpha: 0, y: -12 })
  }, [])

  useEffect(() => {
    if (loading || !models.length || !gridRef.current) return
    const cards = Array.from(gridRef.current.children)
    gsap.set(cards, { autoAlpha: 0, y: 52, scale: 0.93, willChange: 'transform, opacity' })
    gsap.to(cards, {
      autoAlpha: 1, y: 0, scale: 1,
      duration: 0.55, stagger: { each: 0.07, from: 'start' },
      ease: 'power4.out', clearProps: 'transform,will-change',
    })
  }, [loading, models])

  useEffect(() => {
    return () => {
      const c = Array.from(gridRef.current?.children ?? [])
      gsap.killTweensOf([headerRef.current, titleRef.current, shareBtnRef.current, ...c])
    }
  }, [])

  usePageReady(startAnimations)

  return (
    <main className="flex flex-col gap-3.5 pt-4 pb-28">
      <header
        ref={headerRef}
        className="invisible w-full py-3 border-b border-white bg-white/90 backdrop-blur-xs sticky top-0 z-50"
      >
        <div className="container flex items-center justify-between">
          <h1 ref={titleRef} className="invisible text-black text-2xl/[100%] font-[500]">
            Модели
          </h1>
          <button
            ref={shareBtnRef}
            onClick={() => setIsShareOpen(true)}
            className="invisible px-2.5 py-3 bg-[#EFEEF3] text-black text-base/[80%] font-medium active:bg-[#E0DEDF] transition-colors duration-200 cursor-pointer rounded-full"
          >
            Поделиться
          </button>
        </div>
      </header>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #F0EFF4 25%, #E4E3EA 50%, #F0EFF4 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite linear;
        }
      `}</style>

      <section ref={gridRef} className="grid grid-cols-2 gap-3.5 gap-y-4.5 container">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ aspectRatio: '2/3' }}>
              <div className="skeleton-shimmer w-full h-full rounded-2xl relative">
                <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
                  <div className="skeleton-shimmer h-5 w-20 rounded-xl" style={{ background: 'rgba(255,255,255,0.35)', animation: 'none' }} />
                  <div className="skeleton-shimmer h-4 w-28 rounded-lg"  style={{ background: 'rgba(255,255,255,0.25)', animation: 'none' }} />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-2 flex flex-col items-center gap-3 py-20">
            <div className="text-[#7F7F7F] text-sm text-center max-w-[260px]">
              {error}
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-2.5 bg-[#EFEEF3] text-black text-sm font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        ) : models.length === 0 ? (
          <div className="col-span-2 text-center text-[#7F7F7F] py-20 text-sm">
            Моделей пока нет
          </div>
        ) : (
          models.map(m => (
            <div key={m.id} className="invisible">
              <ModelCard model={m} />
            </div>
          ))
        )}
      </section>

      <ShareModelsModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        models={models}
      />
    </main>
  )
}
