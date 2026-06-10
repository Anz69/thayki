import { useEffect, useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import useAuthStore from '@/stores/useAuthStore'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import { resetModelAppGuardCache } from '@/RouterShell'
import api from '@/utils/api'

export default function ApplicationPendingPage() {
  const navigate = useTransitionNavigate()
  const { refreshUser } = useAuthStore()

  const orbitWrapRef = useRef(null)
  const ring3Ref = useRef(null)
  const ring2Ref = useRef(null)
  const ring1Ref = useRef(null)
  const iconRef = useRef(null)
  const checkRef = useRef(null)
  const crossRef = useRef(null)
  const headRef = useRef(null)
  const subRef = useRef(null)
  const copyBlockRef = useRef(null)
  const finalStateRef = useRef(null)
  const loopTlRef = useRef(null)
  const pollIdRef = useRef(null)

  function tightenStage() {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(orbitWrapRef.current, { marginBottom: 8, duration: 0.62 }, 0)
      .to(copyBlockRef.current, { y: -44, duration: 0.62 }, 0)
  }

  useLayoutEffect(() => {
    gsap.set([ring3Ref.current, ring2Ref.current, ring1Ref.current], { scale: 0, opacity: 0 })
    gsap.set(iconRef.current, { scale: 0, opacity: 0, rotation: -20 })
    gsap.set(checkRef.current, { scale: 0, opacity: 0 })
    gsap.set(crossRef.current, { scale: 0.6, opacity: 0 })
    gsap.set([headRef.current, subRef.current], { autoAlpha: 0, y: 18 })
    gsap.set(copyBlockRef.current, { y: 0 })
    gsap.set(orbitWrapRef.current, { marginBottom: 48 })
  }, [])

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.15 })
    tl.to(ring3Ref.current, { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.3)' })
      .to(ring2Ref.current, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.4)' }, 0.1)
      .to(ring1Ref.current, { scale: 1, opacity: 1, duration: 0.48, ease: 'back.out(1.7)' }, 0.2)
      .to(iconRef.current, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.9)' }, 0.32)
      .to(headRef.current, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.5)
      .to(subRef.current, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.6)

    const loopTl = gsap.timeline({ repeat: -1, yoyo: false, delay: 0.9 })
    loopTlRef.current = loopTl

    gsap.to(ring2Ref.current, { rotation: 360, duration: 5, repeat: -1, ease: 'none', delay: 0.9 })
    gsap.to(ring3Ref.current, {
      scale: 1.1,
      opacity: 0.35,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      delay: 0.9,
    })

    return () => {
      loopTl.kill()
      gsap.killTweensOf([
        ring1Ref.current,
        ring2Ref.current,
        ring3Ref.current,
        iconRef.current,
        checkRef.current,
        crossRef.current,
        headRef.current,
        subRef.current,
        orbitWrapRef.current,
        copyBlockRef.current,
      ])
    }
  }, [])

  useEffect(() => {
    const stopPolling = () => {
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current)
        pollIdRef.current = null
      }
    }

    const checkStatus = async () => {
      if (finalStateRef.current) return
      try {
        const res = await api.get('/model-application')
        const data = res.data?.data

        if (finalStateRef.current) return

        if (data === null || data === undefined) {
          stopPolling()
          resetModelAppGuardCache()
          navigate('/home', { replace: true })
          return
        }

        const status = data.status

        if (status === 'approved') {
          finalStateRef.current = 'approved'
          stopPolling()
          loopTlRef.current?.pause()
          gsap.killTweensOf([ring2Ref.current, ring3Ref.current])

          tightenStage()

          const tl = gsap.timeline({
            onComplete: async () => {
              resetModelAppGuardCache()
              try {
                await refreshUser()
              } catch {
              }
              navigate('/home', { replace: true })
            },
          })
          gsap.set(iconRef.current, { pointerEvents: 'none' })
          tl.to([ring3Ref.current, ring2Ref.current], {
            scale: 0.4,
            opacity: 0,
            duration: 0.42,
            ease: 'power3.inOut',
          })
            .to(
              iconRef.current,
              { scale: 0.3, opacity: 0, duration: 0.22, ease: 'power2.in', visibility: 'hidden' },
              0.1,
            )
            .to(ring1Ref.current, { scale: 1.14, duration: 0.26, ease: 'power2.out' }, 0.18)
            .to(ring1Ref.current, { scale: 1, duration: 0.22, ease: 'power2.inOut' }, 0.44)
            .to(ring1Ref.current, { backgroundColor: '#E2319B', duration: 0.34, ease: 'power3.out' }, 0.2)
            .to(ring1Ref.current, { borderColor: '#E2319B', duration: 0.34, ease: 'power3.out' }, 0.2)
            .fromTo(
              checkRef.current,
              { scale: 0.5, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.52, ease: 'back.out(1.6)' },
              0.36,
            )
            .to(headRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.28)
            .call(() => {
              if (headRef.current) headRef.current.textContent = 'Заявка одобрена!'
              if (subRef.current) subRef.current.textContent = 'Переходим в профиль модели…'
            }, [], 0.52)
            .to(headRef.current, { opacity: 1, duration: 0.32, ease: 'power2.out' }, 0.56)
            .to(subRef.current, { opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.3)
            .to(subRef.current, { opacity: 1, duration: 0.32, ease: 'power2.out' }, 0.58)
            .to(ring1Ref.current, { scale: 1.07, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.72)
            .to({}, { duration: 0.6 })
          return
        }

        if (status === 'rejected') {
          finalStateRef.current = 'rejected'
          stopPolling()
          loopTlRef.current?.pause()
          gsap.killTweensOf([ring2Ref.current, ring3Ref.current])

          tightenStage()

          gsap.set(iconRef.current, { pointerEvents: 'none', visibility: 'hidden', opacity: 0 })

          const tl = gsap.timeline({
            onComplete: async () => {
              resetModelAppGuardCache()
              try {
                await refreshUser()
              } catch {
              }
              navigate('/home', { replace: true })
            },
          })

          tl.to([ring3Ref.current, ring2Ref.current], {
            scale: 0.4,
            opacity: 0,
            duration: 0.42,
            ease: 'power3.inOut',
          })
            .to(
              ring1Ref.current,
              {
                borderColor: '#DC2626',
                backgroundColor: '#FEF2F2',
                duration: 0.38,
                ease: 'power3.out',
              },
              0.1,
            )
            .fromTo(
              crossRef.current,
              { scale: 0.5, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.48, ease: 'back.out(1.6)' },
              0.24,
            )
            .to(headRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.2)
            .to(subRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.24)
            .call(() => {
              if (headRef.current) headRef.current.textContent = 'Заявка отклонена'
              if (subRef.current) subRef.current.textContent = 'Возвращаемся на главную…'
            }, [], 0.46)
            .to(headRef.current, { opacity: 1, duration: 0.32, ease: 'power2.out' }, 0.5)
            .to(subRef.current, { opacity: 1, duration: 0.32, ease: 'power2.out' }, 0.56)
            .to(ring1Ref.current, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.68)
            .to({}, { duration: 0.8 })
        }
      } catch {
      }
    }

    checkStatus()
    pollIdRef.current = setInterval(checkStatus, 2500)
    return () => stopPolling()
  }, [navigate, refreshUser])

  return (
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 select-none">
      <div ref={orbitWrapRef} className="relative flex items-center justify-center" style={{ width: 220, height: 220, marginBottom: 48 }}>
        <div
          ref={ring3Ref}
          className="absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            border: '2px solid rgba(226,49,155,0.18)',
          }}
        />
        <div
          ref={ring2Ref}
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: '2px dashed rgba(226,49,155,0.45)',
          }}
        />
        <div
          ref={ring1Ref}
          className="absolute rounded-full flex items-center justify-center overflow-visible"
          style={{
            width: 96,
            height: 96,
            border: '2.5px solid #E2319B',
            backgroundColor: '#fff',
          }}
        >
          <div ref={iconRef} className="absolute z-[1]" aria-hidden>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <path
                d="M19 4L23.12 13.26L33 14.6L26 21.4L27.75 31.25L19 26.5L10.25 31.25L12 21.4L5 14.6L14.88 13.26L19 4Z"
                stroke="#E2319B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div ref={checkRef} className="absolute z-[3]" style={{ opacity: 0 }} aria-hidden>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M7 18L14.5 25.5L29 11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div ref={crossRef} className="absolute z-[3]" style={{ opacity: 0 }} aria-hidden>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M12 12L24 24M24 12L12 24" stroke="#B91C1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div ref={copyBlockRef} className="flex flex-col items-center gap-3 text-center will-change-transform">
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
