import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import TransitionLink from '@/components/TransitionLink'
import Info from '@/components/sections/modelSelectInfo/Info'
import Media from '@/components/sections/modelSelectInfo/Media'
import useBookingStore from '@/stores/useBookingStore'
import useMeetingStore from '@/stores/useMeetingStore'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api, { extractErrorMessage } from '@/utils/api'
import ShareModelsModal from '@/components/modals/ShareModelsModal'
import LazyImg from '@/components/ui/LazyImg'
import { declAge } from '@/utils/datetime'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'
import useModelPreview from '@/stores/useModelPreview'

const ACTIVE_STATUSES = ['pending', 'accepted', 'paid', 'confirmed']

function normalizePreview(m) {
  if (!m) return null
  return {
    ...m,
    photos: (m.photos ?? []).map((p) => (typeof p === 'string' ? { url: p } : p)),
    videos: (m.videos ?? []).filter((v) => v?.url),
  }
}

export default function ModelPage({ preview = false }) {
  const { t } = useTranslation()
  const { id } = useParams()
  const store = useBookingStore()
  const meeting = useMeetingStore()
  const navigate = useTransitionNavigate()
  const previewModel = useModelPreview((s) => s.model)

  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const handleShare = useCallback(() => {
    if (!model) return
    setShareModalOpen(true)
  }, [model])

  const pageReadyFired = useRef(false)
  const modelRef = useRef(null)

  const headerRef = useRef(null)
  const backBtnRef = useRef(null)
  const headerTitleRef = useRef(null)
  const mainPhotoRef = useRef(null)
  const leftPhotoRef = useRef(null)
  const rightPhotoRef = useRef(null)
  const ageRef = useRef(null)
  const nameRef = useRef(null)
  const descRef = useRef(null)
  const bookBtnRef = useRef(null)
  const tabSectionRef = useRef(null)
  const tab0Ref = useRef(null)
  const tab1Ref = useRef(null)
  const tabIndicatorRef = useRef(null)
  const infoContentRef = useRef(null)
  const mediaContentRef = useRef(null)
  const activeTab = useRef(0)

  const switchTab = (index) => {
    if (index === activeTab.current) return
    const currentContent = activeTab.current === 0 ? infoContentRef.current : mediaContentRef.current
    const newContent = index === 0 ? infoContentRef.current : mediaContentRef.current
    const targetBtn = index === 0 ? tab0Ref.current : tab1Ref.current
    if (!currentContent || !newContent || !targetBtn || !tabIndicatorRef.current) return
    activeTab.current = index
      ;[tab0Ref.current, tab1Ref.current].forEach((btn, i) => {
        if (btn) btn.style.color = i === index ? '#000' : '#7F7F7F'
      })
    gsap.killTweensOf([currentContent, newContent])
    gsap.to(tabIndicatorRef.current, {
      left: targetBtn.offsetLeft, width: targetBtn.offsetWidth,
      duration: 0.3, ease: 'power2.inOut',
    })
    gsap.to(currentContent, {
      opacity: 0, y: 8, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        gsap.set(currentContent, { display: 'none' })
        gsap.set(newContent, { display: 'block', opacity: 0, y: -8 })
        gsap.to(newContent, { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' })
      },
    })
  }

  const animatePhotos = useCallback((photos) => {
    const [p0, p1, p2] = photos

    if (p0?.url && mainPhotoRef.current) {
      gsap.set(mainPhotoRef.current, { autoAlpha: 0, scale: 0.88, filter: 'blur(14px)', willChange: 'transform,opacity,filter' })
      gsap.to(mainPhotoRef.current, {
        autoAlpha: 1, scale: 1, filter: 'blur(0px)',
        duration: 0.58, ease: 'expo.out',
        onComplete: () => gsap.set(mainPhotoRef.current, { clearProps: 'filter,will-change' }),
      })
    }
    if (p1?.url && leftPhotoRef.current) {
      gsap.set(leftPhotoRef.current, { autoAlpha: 0, scale: 0.58, x: 89, y: 47, rotation: 0, willChange: 'transform,opacity' })
      gsap.to(leftPhotoRef.current, {
        autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: -16,
        duration: 0.72, ease: 'back.out(1.7)', delay: 0.12,
        onComplete: () => gsap.set(leftPhotoRef.current, { clearProps: 'will-change' }),
      })
    }
    if (p2?.url && rightPhotoRef.current) {
      gsap.set(rightPhotoRef.current, { autoAlpha: 0, scale: 0.58, x: -82, y: 46, rotation: 0, willChange: 'transform,opacity' })
      gsap.to(rightPhotoRef.current, {
        autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: 16,
        duration: 0.72, ease: 'back.out(1.7)', delay: 0.22,
        onComplete: () => gsap.set(rightPhotoRef.current, { clearProps: 'will-change' }),
      })
    }
  }, [])

  const startAnimations = () => {
    pageReadyFired.current = true
    const tl = gsap.timeline({ defaults: { force3D: true } })

    tl.to(headerRef.current, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'expo.out' })
      .to(backBtnRef.current, { autoAlpha: 1, x: 0, duration: 0.28, ease: 'expo.out' }, 0.06)
      .to(headerTitleRef.current, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'expo.out' }, 0.1)

    const currentPhotos = modelRef.current?.photos ?? []
    animatePhotos(currentPhotos)

    tl.to([ageRef.current, nameRef.current].filter(Boolean), {
      y: '0%', duration: 0.52, stagger: 0.09, ease: 'expo.out',
    }, 0.4)

    tl.to(descRef.current, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.56)

    tl.to(tabSectionRef.current, {
      autoAlpha: 1, y: 0, duration: 0.4, ease: 'expo.out',
      onComplete: () => gsap.set(tabSectionRef.current, { clearProps: 'will-change' }),
    }, 0.64)

    tl.to(bookBtnRef.current, {
      autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2.4)',
      onComplete: () => gsap.set(bookBtnRef.current, { clearProps: 'will-change' }),
    }, 0.7)
  }

  useLayoutEffect(() => {
    gsap.set(headerRef.current, { autoAlpha: 0, y: -44 })
    gsap.set(backBtnRef.current, { autoAlpha: 0, x: -20 })
    gsap.set(headerTitleRef.current, { autoAlpha: 0, y: -10 })
    gsap.set([ageRef.current, nameRef.current].filter(Boolean), { y: '-110%' })
    gsap.set(descRef.current, { autoAlpha: 0, y: 12 })
    gsap.set(tabSectionRef.current, { autoAlpha: 0, y: 18, willChange: 'transform, opacity' })
    gsap.set(bookBtnRef.current, { autoAlpha: 0, scale: 0.72, willChange: 'transform, opacity' })
    gsap.set(mediaContentRef.current, { display: 'none' })
    if (tab0Ref.current) tab0Ref.current.style.color = '#000'
    if (tab1Ref.current) tab1Ref.current.style.color = '#7F7F7F'
  }, [])

  useLayoutEffect(() => {
    if (tab0Ref.current && tabIndicatorRef.current) {
      gsap.set(tabIndicatorRef.current, {
        left: tab0Ref.current.offsetLeft,
        width: tab0Ref.current.offsetWidth,
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      gsap.killTweensOf([
        headerRef.current, backBtnRef.current, headerTitleRef.current,
        mainPhotoRef.current, leftPhotoRef.current, rightPhotoRef.current,
        ageRef.current, nameRef.current, descRef.current,
        tabSectionRef.current, bookBtnRef.current,
        tabIndicatorRef.current, infoContentRef.current, mediaContentRef.current,
      ])
    }
  }, [])

  useEffect(() => {
    if (preview) {
      const data = normalizePreview(previewModel)
      if (!data) { navigate('/home', { replace: true }); return }
      modelRef.current = data
      setModel(data)
      setLoading(false)
      return
    }

    if (!id) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    api.get(`/catalog/models/${id}`)
      .then(r => {
        if (cancelled) return
        const data = r.data.data
        modelRef.current = data
        setModel(data)
      })
      .catch((err) => {
        if (cancelled) return
        const status = err?.response?.status
        if (status === 404 || status === 403) {
          navigate('/home', { replace: true })
          return
        }
        setLoadError(extractErrorMessage(err, t('model.loadError')))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, navigate, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!model || !pageReadyFired.current) return
    animatePhotos(model.photos ?? [])
  }, [model, animatePhotos])

  usePageReady(startAnimations)

  const allPhotos = model?.photos ?? []
  const mainPhoto = allPhotos[0] ?? null
  const leftPhoto = allPhotos[1] ?? null
  const rightPhoto = allPhotos[2] ?? null

  return (
    <div>
      <section className="flex flex-col gap-10 pt-4">

        <div>
          <header
            ref={headerRef}
            className="invisible w-full py-5 border-b border-white bg-white/90 backdrop-blur-xs sticky top-0 z-50"
          >
            <div className="container flex items-center relative">
              {preview ? (
                <button
                  ref={backBtnRef}
                  onClick={() => navigate(-1)}
                  className="invisible px-2.5 py-3 bg-[#EFEEF3] absolute left-4 text-black text-base/[80%] font-medium hover:bg-[#E0DEDF] transition-all duration-300 cursor-pointer rounded-full"
                >
                  {t('common.back')}
                </button>
              ) : (
                <TransitionLink
                  ref={backBtnRef}
                  to="/home"
                  className="invisible px-2.5 py-3 bg-[#EFEEF3] absolute left-4 text-black text-base/[80%] font-medium hover:bg-[#E0DEDF] transition-all duration-300 cursor-pointer rounded-full"
                >
                  {t('common.back')}
                </TransitionLink>
              )}
              <div className="w-full flex items-center justify-center">
                <h1 ref={headerTitleRef} className="invisible text-black text-base/[100%] font-medium">
                  {t('model.headerTitle')}
                </h1>
              </div>
              {!preview && (
                <button
                  type="button"
                  disabled={!model}
                  onClick={handleShare}
                  className="absolute right-4 px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors disabled:opacity-40"
                  aria-label={t('common.share')}
                >
                  {t('common.share')}
                </button>
              )}
            </div>
          </header>
          {!loadError && (
            <div className="w-full bg-[#FBF1F8] border-y border-[#E2319B]/12">
              <div className="relative flex items-center gap-2 px-3.5 py-1.5 overflow-hidden">
                <span className="relative z-20 shrink-0 flex items-center justify-center size-5 rounded-full bg-[#E2319B]/12">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="#E2319B" strokeWidth="1.9" />
                    <path d="M12 7v.5M11.2 10.5h1.1v6M10.6 16.5h2.8" stroke="#E2319B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="relative flex-1 overflow-hidden">
                  <div className="flex w-max marquee-track">
                    {[0, 1].map((i) => (
                      <span key={i} aria-hidden={i === 1} className="flex items-center text-[#9C5080] text-[12.5px]/[100%] font-semibold tracking-[0.01em] whitespace-nowrap">
                        {t('catalogNotice.ticker')}
                        <span className="mx-8 inline-block size-1 rounded-full bg-[#E2319B]/55" />
                      </span>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#FBF1F8] via-[#FBF1F8]/80 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#FBF1F8] via-[#FBF1F8]/80 to-transparent" />
                </div>
              </div>
            </div>
          )}

        </div>

        {!preview && createPortal(
          (() => {
            const activeMeeting = ACTIVE_STATUSES.includes(meeting.meeting?.status ?? '')
              ? meeting.meeting
              : null

            return activeMeeting ? (
              <button
                ref={bookBtnRef}
                onClick={() => navigate(`/meeting?id=${activeMeeting.id}`)}
                className="invisible fixed bottom-6 left-1/2 -translate-x-1/2 w-max p-1 bg-[#DFDBDF] rounded-full z-[9000] pointer-events-auto"
                style={{ willChange: 'transform, opacity' }}
              >
                <div className="p-3 bg-[#232323] rounded-full text-white text-base/[100%] font-medium">
                  {t('model.goToMeeting')}
                </div>
              </button>
            ) : (
              <button
                ref={bookBtnRef}
                onClick={() => navigate(`/request?model=${id}`)}
                disabled={!model}
                className="invisible fixed bottom-6 left-1/2 -translate-x-1/2 w-max p-1 bg-[#DFDBDF] rounded-full z-[9000] pointer-events-auto disabled:opacity-50"
                style={{ willChange: 'transform, opacity' }}
              >
                <div className="p-3 bg-[#E2319B] rounded-full text-white text-base/[100%] font-medium">
                  {t('model.cta')}
                </div>
              </button>
            )
          })(),
          document.body,
        )}

        <main className="flex flex-col gap-6 items-center relative pb-28">
          {loadError && !loading && !model && (
            <div className="flex flex-col items-center gap-3 py-20 container">
              <div className="text-[#7F7F7F] text-sm text-center max-w-[260px]">
                {loadError}
              </div>
              <button
                onClick={() => navigate('/home')}
                className="px-4 py-2.5 bg-[#EFEEF3] text-black text-sm font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
              >
                {t('model.toList')}
              </button>
            </div>
          )}

          <div className="relative w-[160px] h-[210px] container">
            <div ref={mainPhotoRef} className="w-full h-full relative z-10 rounded-2xl overflow-hidden" style={{ visibility: 'hidden' }}>
              {mainPhoto?.url && (
                <LazyImg src={resolveMediaUrl(mainPhoto.url)} alt={model?.display_name ?? 'girl'} className="w-full h-full" />
              )}
            </div>
            <div ref={leftPhotoRef} className="w-[110px] h-[148px] absolute -top-4 -left-16 rounded-xl overflow-hidden" style={{ visibility: 'hidden' }}>
              {leftPhoto?.url && (
                <LazyImg src={resolveMediaUrl(leftPhoto.url)} alt="" className="w-full h-full" />
              )}
            </div>
            <div ref={rightPhotoRef} className="w-[124px] h-[150px] absolute -top-4 -right-16 rounded-xl overflow-hidden" style={{ visibility: 'hidden' }}>
              {rightPhoto?.url && (
                <LazyImg src={resolveMediaUrl(rightPhoto.url)} alt="" className="w-full h-full" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 text-center container">
            {!preview && (
              <div className="overflow-hidden">
                <h2 ref={ageRef} className="text-[#7F7F7F] text-base/[100%] font-medium">
                  {declAge(model?.age)}
                </h2>
              </div>
            )}
            <div className="overflow-hidden">
              <h1 ref={nameRef} className="text-black text-2xl/[100%] font-bold">
                {modelName(model)}
              </h1>
            </div>
            <p ref={descRef} className="invisible text-[#7F7F7F] text-[13px]/[160%] font-medium">
              {model?.description ?? ''}
            </p>
          </div>

          <div ref={tabSectionRef} className="invisible flex flex-col gap-6 w-full items-center">
            <div className="relative gap-2 p-1 flex items-center bg-[#EFEEF3] rounded-full w-max">
              <button
                ref={tab0Ref}
                onClick={() => switchTab(0)}
                className="px-5 py-2 relative z-10 text-sm font-medium transition-colors duration-300"
              >
                {t('model.tabInfo')}
              </button>
              <button
                ref={tab1Ref}
                onClick={() => switchTab(1)}
                className="px-5 py-2 relative z-10 text-sm font-medium transition-colors duration-300"
              >
                {t('model.tabMedia')}
              </button>
              <div
                ref={tabIndicatorRef}
                className="absolute top-1 h-[calc(100%-8px)] bg-white rounded-full shadow-sm z-0"
              />
            </div>
            <div ref={infoContentRef} className="w-full">
              <Info model={model} />
            </div>
            <div ref={mediaContentRef} className="w-full">
              <Media photos={model?.photos ?? []} videos={model?.videos ?? []} />
            </div>
          </div>
        </main>
      </section>

      <ShareModelsModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        models={model ? [model] : []}
      />
    </div>
  )
}
