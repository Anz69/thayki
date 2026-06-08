import { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import TransitionLink from '@/components/TransitionLink'
import { useTranslation } from 'react-i18next'
import ShareModelsModal from '@/components/modals/ShareModelsModal'
import CatalogNotice from '@/components/CatalogNotice'
import api, { extractErrorMessage } from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

const PER_PAGE = 20
const RETRY_DELAYS = [800, 2000, 4000]

function ModelCard({ model }) {
  const [imgLoaded, setImgLoaded]   = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const retryTimer = useRef(null)
  const imgRef      = useRef(null)

  const handleError = useCallback(() => {
    if (retryCount < RETRY_DELAYS.length) {
      retryTimer.current = setTimeout(
        () => setRetryCount((c) => c + 1),
        RETRY_DELAYS[retryCount],
      )
    }
  }, [retryCount])

  // Cached images fire onLoad before React attaches the handler → check .complete
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true)
    }
  }, [retryCount]) // re-run when key changes (new <img> mounted after retry)

  useEffect(() => () => clearTimeout(retryTimer.current), [])

  if (!model || typeof model !== 'object') return null
  const photos = Array.isArray(model?.photos) ? model.photos.filter(Boolean) : []
  const mainPhoto = photos.find((p) => p?.is_main) ?? photos[0]
  const photoSrc = mainPhoto ? resolveMediaUrl(mainPhoto.url) : null

  return (
    <TransitionLink
      to={`/model/${model.id}`}
      className="relative overflow-hidden border-2 border-black/15 rounded-2xl flex flex-col justify-end min-h-[300px] active:scale-[0.97] transition-transform duration-150"
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(110deg, #EFEEF3 30%, #E4E3E8 50%, #EFEEF3 70%)',
          backgroundSize: '200% 100%',
          animation: imgLoaded ? 'none' : 'card-shimmer 1.6s linear infinite',
        }}
      />
      {photoSrc && (
        <img
          ref={imgRef}
          key={`${photoSrc}__${retryCount}`}
          src={photoSrc}
          alt={model.display_name}
          className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: imgLoaded ? 1 : 0 }}
          onLoad={() => setImgLoaded(true)}
          onError={handleError}
        />
      )}
      <div className="absolute bottom-0 left-0 w-full h-28 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="flex flex-col gap-3 relative z-30 px-3.5 py-5">
        <h1 className="text-white text-base/[100%] font-medium">
          {modelName(model)}, {model.age}
        </h1>
      </div>
    </TransitionLink>
  )
}

export default function HomePage() {
  const headerRef     = useRef(null)
  const titleRef      = useRef(null)
  const shareBtnRef   = useRef(null)
  const gridRef       = useRef(null)
  const sentinelRef   = useRef(null)
  const isFetchingRef = useRef(false)
  const prevCountRef  = useRef(0)
  const { t } = useTranslation()

  const [models,      setModels]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState(null)
  const [reloadKey,   setReloadKey]   = useState(0)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  const safeModels = useMemo(() => (
    Array.isArray(models)
      ? models.filter((m) => m && typeof m === 'object' && m.id != null)
      : []
  ), [models])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setModels([])
    setPage(1)
    setHasMore(false)
    prevCountRef.current  = 0
    isFetchingRef.current = false

    api.get('/catalog/models', { params: { per_page: PER_PAGE, page: 1, sort: 'name' } })
      .then((r) => {
        if (cancelled) return
        const list       = Array.isArray(r?.data?.data) ? r.data.data : []
        const pagination = r?.data?.meta?.pagination
        setModels(list)
        setHasMore(pagination ? pagination.page < pagination.last_page : false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(extractErrorMessage(err, t('home.error')))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [reloadKey])

  // ── Load next page ────────────────────────────────────────────────────────
  const fetchMore = useCallback(() => {
    if (isFetchingRef.current || !hasMore) return
    isFetchingRef.current = true
    setLoadingMore(true)

    const nextPage = page + 1
    api.get('/catalog/models', { params: { per_page: PER_PAGE, page: nextPage, sort: 'name' } })
      .then((r) => {
        const newItems   = Array.isArray(r?.data?.data) ? r.data.data : []
        const pagination = r?.data?.meta?.pagination
        setModels((prev) => [...prev, ...newItems])
        setPage(nextPage)
        setHasMore(pagination ? nextPage < pagination.last_page : false)
      })
      .catch(() => { /* silent — stay on current page */ })
      .finally(() => {
        setLoadingMore(false)
        isFetchingRef.current = false
      })
  }, [hasMore, page])

  // ── IntersectionObserver on sentinel ─────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || loading) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMore() },
      { rootMargin: '400px' }, // start loading 400px before reaching the bottom
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchMore, loading])

  // ── GSAP: animate cards (initial + load-more batches) ────────────────────
  useEffect(() => {
    if (loading || !gridRef.current) return
    const allCards  = Array.from(gridRef.current.children)
    const prevCount = prevCountRef.current
    const newCount  = safeModels.length

    if (newCount === 0) {
      prevCountRef.current = 0
      return
    }

    if (prevCount === 0) {
      // First batch — set all invisible then stagger in
      gsap.set(allCards, { autoAlpha: 0, y: 48, scale: 0.93, willChange: 'transform,opacity' })
      gsap.to(allCards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: { each: 0.07, from: 'start' },
        ease: 'power4.out',
        clearProps: 'transform,will-change',
      })
    } else if (newCount > prevCount) {
      // Extra pages — animate only the newly appended cards
      const newCards = allCards.slice(prevCount)
      gsap.fromTo(
        newCards,
        { autoAlpha: 0, y: 36, scale: 0.95 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.46,
          stagger: { each: 0.06, from: 'start' },
          ease: 'power3.out',
          clearProps: 'transform,will-change',
        },
      )
    }

    prevCountRef.current = newCount
  }, [loading, safeModels.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── GSAP: header / title / share entry ───────────────────────────────────
  const startAnimations = useCallback(() => {
    gsap.timeline({ defaults: { force3D: true } })
      .to(headerRef.current,   { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' })
      .to(titleRef.current,    { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power3.out' }, 0.04)
      .to(shareBtnRef.current, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power3.out' }, 0.07)
  }, [])

  useLayoutEffect(() => {
    gsap.set(headerRef.current,   { autoAlpha: 0, y: -28 })
    gsap.set(titleRef.current,    { autoAlpha: 0, y: -12 })
    gsap.set(shareBtnRef.current, { autoAlpha: 0, y: -12 })
  }, [])

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
            {t('home.title')}
          </h1>
          <button
            ref={shareBtnRef}
            onClick={() => setIsShareOpen(true)}
            disabled={loading || safeModels.length === 0}
            className="invisible px-2.5 py-3 bg-[#EFEEF3] text-black text-base/[80%] font-medium active:bg-[#E0DEDF] transition-colors duration-200 cursor-pointer rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('home.share')}
          </button>
        </div>
      </header>

      <CatalogNotice />

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes card-shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
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
                  <div className="h-5 w-20 rounded-xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                  <div className="h-4 w-28 rounded-lg"  style={{ background: 'rgba(255,255,255,0.25)' }} />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-2 flex flex-col items-center gap-3 py-20">
            <div className="text-[#7F7F7F] text-sm text-center max-w-[260px]">{error}</div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-2.5 bg-[#EFEEF3] text-black text-sm font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : safeModels.length === 0 ? (
          <div className="col-span-2 text-center text-[#7F7F7F] py-20 text-sm">
            {t('home.empty')}
          </div>
        ) : (
          safeModels.map((m) => (
            <div key={m.id} className="invisible">
              <ModelCard model={m} />
            </div>
          ))
        )}
      </section>

      {/* Sentinel — invisible trigger for IntersectionObserver */}
      {!loading && !error && safeModels.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-6 container">
          {loadingMore && (
            <div className="w-6 h-6 rounded-full border-2 border-[#E2319B]/25 border-t-[#E2319B] animate-spin" />
          )}
        </div>
      )}

      <ShareModelsModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        models={safeModels}
      />
    </main>
  )
}
