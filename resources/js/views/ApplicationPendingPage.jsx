import { useEffect, useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import useAuthStore from '@/stores/useAuthStore'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'

export default function ApplicationPendingPage() {
  const navigate    = useTransitionNavigate()
  const { user, refreshUser } = useAuthStore()

  const ring3Ref   = useRef(null)
  const ring2Ref   = useRef(null)
  const ring1Ref   = useRef(null)
  const iconRef    = useRef(null)
  const checkRef   = useRef(null)
  const headRef    = useRef(null)
  const subRef     = useRef(null)
  const approvedRef = useRef(false)
  const loopTlRef   = useRef(null)

  useEffect(() => {
    if (user?.role === 'model') navigate('/home', { replace: true })
  }, [user?.role])

  useLayoutEffect(() => {
    gsap.set([ring3Ref.current, ring2Ref.current, ring1Ref.current], { scale: 0, opacity: 0 })
    gsap.set(iconRef.current,  { scale: 0, opacity: 0, rotation: -20 })
    gsap.set(checkRef.current, { scale: 0, opacity: 0 })
    gsap.set([headRef.current, subRef.current], { autoAlpha: 0, y: 18 })
  }, [])

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.15 })
    tl.to(ring3Ref.current, { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.3)' })
      .to(ring2Ref.current, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.4)' }, 0.1)
      .to(ring1Ref.current, { scale: 1, opacity: 1, duration: 0.48, ease: 'back.out(1.7)' }, 0.2)
      .to(iconRef.current,  { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.9)' }, 0.32)
      .to(headRef.current,  { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.5)
      .to(subRef.current,   { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.6)

    const loopTl = gsap.timeline({ repeat: -1, yoyo: false, delay: 0.9 })
    loopTl
    loopTlRef.current = loopTl

    gsap.to(ring2Ref.current, { rotation: 360, duration: 5, repeat: -1, ease: 'none', delay: 0.9 })
    gsap.to(ring3Ref.current, {
      scale: 1.1, opacity: 0.35, duration: 2.2, repeat: -1, yoyo: true, ease: 'power1.inOut', delay: 0.9,
    })

    return () => {
      loopTl.kill()
      gsap.killTweensOf([ring1Ref.current, ring2Ref.current, ring3Ref.current, iconRef.current, checkRef.current, headRef.current, subRef.current])
    }
  }, [])

  useEffect(() => {
    const checkStatus = async () => {
      if (approvedRef.current) return
      try {
        const res    = await api.get('/model-application')
        const status = res.data?.data?.status
        if (status === 'approved') {
          approvedRef.current = true
          loopTlRef.current?.pause()
          gsap.killTweensOf([ring2Ref.current, ring3Ref.current])

          const tl = gsap.timeline({
            onComplete: async () => {
              await refreshUser()
              navigate('/home', { replace: true })
            },
          })
          tl.to([ring3Ref.current, ring2Ref.current], {
            scale: 0.35,
            opacity: 0,
            duration: 0.32,
            ease: 'power2.inOut',
          })
            .to(ring1Ref.current, { scale: 1.18, duration: 0.2, ease: 'power2.out' }, 0.16)
            .to(ring1Ref.current, { scale: 1, duration: 0.18, ease: 'power2.inOut' }, 0.36)
            .to(ring1Ref.current, { backgroundColor: '#E2319B', duration: 0.26, ease: 'power2.out' }, 0.22)
            .to(iconRef.current,  { scale: 0.4, opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.16)
            .fromTo(checkRef.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.46, ease: 'back.out(2)' }, 0.32)
            .to(headRef.current,  { opacity: 0, duration: 0.18 }, 0.28)
            .call(() => {
              if (headRef.current) headRef.current.textContent = 'Заявка одобрена!'
              if (subRef.current) subRef.current.textContent = 'Переходим в профиль модели...'
            }, [], 0.5)
            .to(headRef.current,  { opacity: 1, duration: 0.28 }, 0.52)
            .to(subRef.current,   { opacity: 0, duration: 0.18 }, 0.3)
            .to(subRef.current,   { opacity: 1, duration: 0.28 }, 0.56)
            .to(ring1Ref.current, { scale: 1.06, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.64)
        }
      } catch {
      }
    }

    checkStatus()
    const id = setInterval(checkStatus, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 select-none">
      {/* Rings + icon */}
      <div className="relative flex items-center justify-center mb-12" style={{ width: 220, height: 220 }}>
        {/* Outer pulse ring */}
        <div
          ref={ring3Ref}
          className="absolute rounded-full"
          style={{
            width: 220, height: 220,
            border: '2px solid rgba(226,49,155,0.18)',
          }}
        />
        {/* Dashed rotating ring */}
        <div
          ref={ring2Ref}
          className="absolute rounded-full"
          style={{
            width: 160, height: 160,
            border: '2px dashed rgba(226,49,155,0.45)',
          }}
        />
        {/* Inner solid ring with icon */}
        <div
          ref={ring1Ref}
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: 96, height: 96,
            border: '2.5px solid #E2319B',
            backgroundColor: '#fff',
          }}
        >
          {/* Application / star icon */}
          <div ref={iconRef} className="absolute">
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <path d="M19 4L23.12 13.26L33 14.6L26 21.4L27.75 31.25L19 26.5L10.25 31.25L12 21.4L5 14.6L14.88 13.26L19 4Z"
                stroke="#E2319B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Checkmark (shown on approval) */}
          <div ref={checkRef} className="absolute" style={{ opacity: 0 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M7 18L14.5 25.5L29 11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h1
          ref={headRef}
          className="text-[22px]/[110%] font-[500] text-black tracking-[-0.02em]"
          style={{ visibility: 'hidden' }}
        >
          Заявка на рассмотрении
        </h1>
        <p
          ref={subRef}
          className="text-[#7F7F7F] text-[14px]/[148%] font-medium max-w-[260px]"
          style={{ visibility: 'hidden' }}
        >
          Мы проверяем вашу анкету. Обычно это занимает несколько минут.
        </p>
      </div>

    </div>
  )
}
