import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useProfileStore from '@/stores/useProfileStore'
import useAuthStore from '@/stores/useAuthStore'
import Avatar from '@/components/ui/Avatar'
import AgeModal from '@/components/modals/AgeModal'
import MetricsModal from '@/components/modals/MetricsModal'
import ChangeMediaModal from '@/components/modals/ChangeMediaModal'
import ScheduleSelector from '@/components/profile/ScheduleSelector'
import Media from '@/components/sections/modelSelectInfo/Media'
import { logError } from '@/utils/logger'

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
    <path d="M2.37012 7.31384C2.37012 7.12565 2.37012 7.03155 2.37546 6.95211C2.45508 5.76833 3.39765 4.82576 4.58143 4.74614C4.66087 4.7408 4.75497 4.7408 4.94316 4.7408C5.0194 4.7408 5.05752 4.7408 5.09447 4.73965C5.62628 4.72305 6.13704 4.52802 6.54456 4.18593C6.57288 4.16216 6.60129 4.13676 6.65813 4.08594L6.81456 3.94608C7.02557 3.75743 7.13108 3.6631 7.24335 3.584C7.5667 3.35619 7.94191 3.21291 8.33481 3.16723C8.47123 3.15137 8.61275 3.15137 8.8958 3.15137H10.0667C10.3497 3.15137 10.4912 3.15137 10.6277 3.16723C11.0205 3.21291 11.3958 3.35619 11.7191 3.584C11.8314 3.6631 11.9369 3.75743 12.1479 3.94608L12.3043 4.08594C12.3612 4.13676 12.3896 4.16216 12.4179 4.18593C12.8254 4.52802 13.3362 4.72305 13.868 4.73965C13.9049 4.7408 13.9431 4.7408 14.0193 4.7408C14.2075 4.7408 14.3016 4.7408 14.381 4.74614C15.5648 4.82576 16.5074 5.76833 16.587 6.95211C16.5923 7.03155 16.5923 7.12565 16.5923 7.31384V11.6149C16.5923 12.9424 16.5923 13.6062 16.334 14.1132C16.1067 14.5592 15.7441 14.9219 15.2981 15.1491C14.791 15.4075 14.1273 15.4075 12.7997 15.4075H6.16271C4.83518 15.4075 4.17141 15.4075 3.66436 15.1491C3.21835 14.9219 2.85573 14.5592 2.62847 14.1132C2.37012 13.6062 2.37012 12.9424 2.37012 11.6149L2.37012 7.31384Z" stroke="#E2319B" strokeWidth="1.77778" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.2467 9.8766C12.2467 11.4039 11.0085 12.642 9.48123 12.642C7.95392 12.642 6.7158 11.4039 6.7158 9.8766C6.7158 8.34929 7.95392 7.11117 9.48123 7.11117C11.0085 7.11117 12.2467 8.34929 12.2467 9.8766Z" stroke="#E2319B" strokeWidth="1.77778" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function SettingRow({ label, value, isLast }) {
  return (
    <div className={`w-full flex items-center justify-between p-5 ${!isLast ? 'border-b border-[#EBEBEB]' : ''}`}>
      <span className="text-[#7F7F7F] text-base/[100%] font-medium">{label}</span>
      <span className="text-black text-base/[100%] font-medium">{value ?? '—'}</span>
    </div>
  )
}

function SettingRowClickable({ label, value, onClick, isLast }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-5 active:bg-[#ECEAEC] transition-colors ${!isLast ? 'border-b border-[#EBEBEB]' : ''}`}
    >
      <span className="text-[#7F7F7F] text-base/[100%] font-medium">{label}</span>
      <span className="text-black text-base/[100%] font-medium">{value ?? '—'}</span>
    </button>
  )
}

function TabBtn({ label, active, onClick, btnRef }) {
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      className={`relative z-10 px-6 py-2 text-sm/[100%] font-medium rounded-full transition-colors duration-200 ${
        active ? 'text-black' : 'text-[#7F7F7F]'
      }`}
    >
      {label}
    </button>
  )
}

export default function ProfilePage() {
  const navigate = useTransitionNavigate()
  const profile  = useProfileStore()
  const auth     = useAuthStore()

  const [localName, setLocalName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [ageOpen, setAgeOpen]           = useState(false)
  const [metricsOpen, setMetricsOpen]   = useState(false)
  const [mediaEditOpen, setMediaEditOpen] = useState(false)

  const avatarInputRef  = useRef(null)
  const cameraWrapRef   = useRef(null)
  const metricsEditRef  = useRef(null)
  const headerRef       = useRef(null)
  const avatarRef       = useRef(null)
  const tabRef          = useRef(null)
  const contentRef      = useRef(null)
  const tabIndicator    = useRef(null)
  const tab0Ref         = useRef(null)
  const tab1Ref         = useRef(null)
  const doneBtnRef      = useRef(null)
  const mediaBtnRef     = useRef(null)
  const animatingTab    = useRef(false)
  const nameBorderRef   = useRef(null)
  const ageBorderRef    = useRef(null)
  const nameSpinTween   = useRef(null)
  const ageSpinTween    = useRef(null)
  const nameHintRef     = useRef(null)
  const metricsHintRef  = useRef(null)
  const editLabelRef    = useRef(null)
  const doneLabelRef    = useRef(null)
  const cancelLabelRef  = useRef(null)
  const backLabelRef    = useRef(null)

  useEffect(() => {
    if (auth.isAuthenticated() && !auth.isModel()) {
      navigate('/more')
    }
  }, [auth, navigate])

  useEffect(() => {
    if (!profile.loaded) {
      profile.hydrate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile.loaded) {
      setLocalName(profile.name)
    }
  }, [profile.loaded, profile.name])

  useLayoutEffect(() => {
    gsap.set(headerRef.current,  { y: -44, autoAlpha: 0 })
    gsap.set(avatarRef.current,  { scale: 0.72, autoAlpha: 0, y: -16 })
    gsap.set(tabRef.current,     { y: 18, autoAlpha: 0 })
    gsap.set(contentRef.current, { y: 22, autoAlpha: 0 })
  }, [])

  useLayoutEffect(() => {
    gsap.set(cameraWrapRef.current,  { autoAlpha: 0, scale: 0, rotation: -25, transformOrigin: 'center center' })
    gsap.set(metricsEditRef.current, { height: 0, autoAlpha: 0, overflow: 'hidden' })
    gsap.set(mediaBtnRef.current,    { autoAlpha: 0, y: 24 })
    gsap.set(nameBorderRef.current,  { autoAlpha: 0 })
    gsap.set(ageBorderRef.current,   { autoAlpha: 0 })
    gsap.set(nameHintRef.current,    { height: 0, autoAlpha: 0, overflow: 'hidden' })
    gsap.set(metricsHintRef.current, { height: 0, autoAlpha: 0, overflow: 'hidden' })
    gsap.set(doneLabelRef.current,   { autoAlpha: 0, y: 6, position: 'absolute' })
    gsap.set(backLabelRef.current,   { autoAlpha: 0, y: 6, position: 'absolute' })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current,  { y: 0, autoAlpha: 1, duration: 0.42, ease: 'expo.out' })
      .to(avatarRef.current,  { scale: 1, autoAlpha: 1, y: 0, duration: 0.60, ease: 'back.out(1.4)' }, 0.10)
      .to(tabRef.current,     { y: 0, autoAlpha: 1, duration: 0.40, ease: 'power3.out' }, 0.22)
      .to(contentRef.current, { y: 0, autoAlpha: 1, duration: 0.44, ease: 'power3.out', clearProps: 'all' }, 0.30)
  })

  const switchTab = useCallback((id) => {
    if (id === activeTab || animatingTab.current) return
    animatingTab.current = true
    const toMedia = id === 'media'
    const target  = toMedia ? tab1Ref.current : tab0Ref.current
    if (tabIndicator.current && target) {
      gsap.to(tabIndicator.current, { left: target.offsetLeft, width: target.offsetWidth, duration: 0.34, ease: 'back.out(1.6)' })
    }
    if (doneBtnRef.current) {
      if (toMedia) {
        gsap.to(doneBtnRef.current, { autoAlpha: 0, x: 10, duration: 0.18, ease: 'power2.in' })
      } else {
        gsap.fromTo(doneBtnRef.current, { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0, duration: 0.30, ease: 'power3.out', delay: 0.14, clearProps: 'x' })
      }
    }
    if (mediaBtnRef.current) {
      gsap.to(mediaBtnRef.current, toMedia
        ? { autoAlpha: 1, y: 0, duration: 0.40, ease: 'back.out(1.3)', delay: 0.18 }
        : { autoAlpha: 0, y: 20, duration: 0.20, ease: 'power2.in' }
      )
    }
    if (toMedia) {
      gsap.to(cancelLabelRef.current, { autoAlpha: 0, y: -6, duration: 0.14, ease: 'power2.in' })
      gsap.fromTo(backLabelRef.current,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power3.out', delay: 0.10, clearProps: 'y' }
      )
    } else {
      gsap.to(backLabelRef.current,   { autoAlpha: 0, y: -6, duration: 0.14, ease: 'power2.in' })
      gsap.fromTo(cancelLabelRef.current,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power3.out', delay: 0.10, clearProps: 'y' }
      )
    }
    gsap.to(contentRef.current, {
      autoAlpha: 0, y: toMedia ? -12 : 12, duration: 0.20, ease: 'power2.in',
      onComplete() {
        setActiveTab(id)
        gsap.fromTo(contentRef.current,
          { autoAlpha: 0, y: toMedia ? 14 : -14 },
          { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power3.out', clearProps: 'transform,opacity,visibility', onComplete() { animatingTab.current = false } }
        )
      },
    })
  }, [activeTab])

  const SPIN_GRADIENT = 'conic-gradient(from var(--a, 0deg), #F5F5F7 0deg, #00000020 45deg, #F5F5F7 110deg, #F5F5F7 360deg)'

  const startBorderSpin = useCallback((borderRef, tweenRef) => {
    if (!borderRef.current) return
    gsap.set(borderRef.current, { '--a': '0deg', background: SPIN_GRADIENT })
    gsap.to(borderRef.current, { autoAlpha: 1, duration: 0.30, ease: 'power2.out' })
    tweenRef.current = gsap.to(borderRef.current, {
      '--a': '360deg',
      duration: 2.4,
      ease: 'none',
      repeat: -1,
    })
  }, [])

  const stopBorderSpin = useCallback((borderRef, tweenRef) => {
    tweenRef.current?.kill()
    if (!borderRef.current) return
    gsap.to(borderRef.current, {
      autoAlpha: 0, duration: 0.22, ease: 'power2.in',
      onComplete: () => {
        if (borderRef.current) gsap.set(borderRef.current, { background: '#E0E0E0', clearProps: '--a' })
      },
    })
  }, [])

  const animateHintIn = useCallback((ref) => {
    gsap.set(ref.current, { height: 'auto' })
    const h = ref.current.scrollHeight
    gsap.fromTo(ref.current,
      { height: 0, autoAlpha: 0 },
      { height: h, autoAlpha: 1, duration: 0.34, ease: 'power3.out',
        onComplete: () => gsap.set(ref.current, { height: 'auto' }) }
    )
  }, [])

  const animateHintOut = useCallback((ref) => {
    gsap.to(ref.current, { height: 0, autoAlpha: 0, duration: 0.20, ease: 'power2.inOut' })
  }, [])

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      profile.savePatch({ name: localName }).catch(logError)
      setIsEditing(false)

      stopBorderSpin(nameBorderRef, nameSpinTween)
      stopBorderSpin(ageBorderRef, ageSpinTween)

      gsap.to(cameraWrapRef.current,   { autoAlpha: 0, scale: 0, rotation: 20, duration: 0.22, ease: 'back.in(2.0)' })
      gsap.to(metricsEditRef.current,  { height: 0, autoAlpha: 0, duration: 0.22, ease: 'power2.inOut' })
      animateHintOut(nameHintRef)
      animateHintOut(metricsHintRef)

      gsap.to(doneLabelRef.current,  { autoAlpha: 0, y: -6, duration: 0.14, ease: 'power2.in' })
      gsap.fromTo(editLabelRef.current,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power3.out', delay: 0.10, clearProps: 'y' }
      )
    } else {
      setIsEditing(true)

      startBorderSpin(nameBorderRef, nameSpinTween)
      startBorderSpin(ageBorderRef, ageSpinTween)

      gsap.fromTo(cameraWrapRef.current,
        { autoAlpha: 0, scale: 0, rotation: -25 },
        { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.46, ease: 'back.out(3.2)', delay: 0.06 }
      )

      gsap.set(metricsEditRef.current, { height: 'auto' })
      const h = metricsEditRef.current.scrollHeight
      gsap.fromTo(metricsEditRef.current,
        { height: 0, autoAlpha: 0 },
        { height: h, autoAlpha: 1, duration: 0.38, ease: 'power3.out', delay: 0.10,
          onComplete: () => gsap.set(metricsEditRef.current, { height: 'auto' }) }
      )

      animateHintIn(nameHintRef)
      animateHintIn(metricsHintRef)

      gsap.to(editLabelRef.current,  { autoAlpha: 0, y: -6, duration: 0.14, ease: 'power2.in' })
      gsap.fromTo(doneLabelRef.current,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power3.out', delay: 0.10, clearProps: 'y' }
      )
    }
  }, [isEditing, localName, profile, startBorderSpin, stopBorderSpin, animateHintIn, animateHintOut])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      await profile.uploadAvatar(file)
    } catch (err) {
      logError('Avatar upload failed', err)
    }
  }

  const user = auth.user
  const displayName = auth.displayName()

  return (
    <section className="flex flex-col min-h-screen bg-white">
      <header ref={headerRef} className="w-full py-5 bg-white fixed top-0 z-50">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/more')}
            className="absolute left-4 px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            <span className="relative inline-block">
              <span ref={cancelLabelRef}>Отмена</span>
              <span ref={backLabelRef} className="absolute inset-0 flex items-center justify-center">Назад</span>
            </span>
          </button>
          <div className="w-full flex justify-center">
            <h1 className="text-black text-base/[100%] font-medium">Профиль</h1>
          </div>
          <button
            ref={doneBtnRef}
            onClick={handleEditToggle}
            className="absolute right-4 px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            <span className="relative inline-block">
              <span ref={editLabelRef}>Изм.</span>
              <span ref={doneLabelRef} className="absolute inset-0 flex items-center justify-center">Готово</span>
            </span>
          </button>
        </div>
      </header>

      <div className="flex flex-col pt-[72px]">
        <div ref={avatarRef} className="flex justify-center pt-6 pb-5">
          <div className="relative">
            <Avatar src={user?.photo_url} name={displayName} size={112} />
            <div ref={cameraWrapRef} className="absolute bottom-0 right-0" style={{ visibility: 'hidden' }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-9 h-9 rounded-full bg-[#FFE6F5] flex items-center justify-center shadow-md border-2 border-[#E2319B] active:scale-95 transition-transform"
              >
                <CameraIcon />
              </button>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <div ref={tabRef} className="flex justify-center mb-5">
          <div className="relative flex bg-[#F5F5F7] rounded-full p-1">
            <div
              ref={tabIndicator}
              className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm pointer-events-none"
              style={{ left: 4, width: '129px' }}
            />
            <TabBtn btnRef={tab0Ref} label="Информация" active={activeTab === 'info'}  onClick={() => switchTab('info')} />
            <TabBtn btnRef={tab1Ref} label="Медиа"       active={activeTab === 'media'} onClick={() => switchTab('media')} />
          </div>
        </div>

        <div ref={contentRef}>
          <div style={{ display: activeTab === 'info' ? '' : 'none' }} className="flex flex-col gap-4 container">

            {!profile.loaded ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 rounded-full border-2 border-[#E2319B] border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                <div className="relative rounded-2xl" style={{ padding: '1.5px' }}>
                  <div
                    ref={nameBorderRef}
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: '#F5F5F7' }}
                  />
                  <div className="relative rounded-[14px] overflow-hidden">
                    <input
                      type="text"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full text-black text-base/[100%] font-medium outline-none placeholder:text-[#ABABAB] p-5 bg-[#F5F5F7] rounded-[14px] ${!isEditing ? 'pointer-events-none' : ''}`}
                      placeholder="Ваше имя"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="relative rounded-2xl" style={{ padding: '1.5px' }}>
                    <div
                      ref={ageBorderRef}
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ background: '#F5F5F7' }}
                    />
                    <div className={`relative bg-[#F5F5F7] rounded-[14px] overflow-hidden ${!isEditing ? 'pointer-events-none' : ''}`}>
                      <SettingRowClickable
                        label="Возраст"
                        value={profile.age ? `${profile.age} года` : '—'}
                        onClick={() => setAgeOpen(true)}
                        isLast
                      />
                    </div>
                  </div>
                  <div ref={nameHintRef}>
                    <p className="text-[#7F7F7F] text-xs/[140%] font-normal px-1 pt-1.5">
                      Укажите ваше реальное имя и возраст. Эти данные отображаются в вашей анкете.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="bg-[#F5F5F7] rounded-2xl overflow-hidden py-2">
                    <SettingRow label="Рост"         value={profile.height ? `${profile.height} см` : null} />
                    <SettingRow label="Вес"          value={profile.weight ? `${profile.weight} кг` : null} />
                    <SettingRow label="Размер попы"  value={profile.buttSize} />
                    <SettingRow label="Размер груди" value={profile.breastSize} isLast />
                  </div>
                  <div className="px-1">
                    <div ref={metricsHintRef}>
                      <p className="text-[#7F7F7F] text-xs/[140%] font-normal pb-1.5">
                        Не знаете точных данных? Введите примерные значения, соответствующие вашему телосложению.
                      </p>
                    </div>
                    <div ref={metricsEditRef} style={{ overflow: 'hidden' }}>
                      <button
                        onClick={() => setMetricsOpen(true)}
                        className="text-[#E2319B] text-xs/[100%] font-medium mt-1.5 flex items-center gap-0.5 active:opacity-70 transition-opacity"
                      >
                        Изменить
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18l6-6-6-6" stroke="#E2319B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <ScheduleSelector
                  value={profile.schedule}
                  onChange={(id) => profile.savePatch({ schedule: id }).catch(logError)}
                  isEditing={isEditing}
                />
              </>
            )}
          </div>

          <div style={{ display: activeTab === 'media' ? '' : 'none' }} className="flex flex-col">
            <Media photos={profile.photos} />
          </div>
        </div>
      </div>

      <div
        ref={mediaBtnRef}
        className="fixed bottom-6 left-0 right-0 flex justify-center px-5 pointer-events-none z-[9500]"
        style={{ visibility: 'hidden' }}
      >
        <button
          onClick={() => setMediaEditOpen(true)}
          className="p-1 bg-[#DFDBDF] rounded-full pointer-events-auto"
        >
          <div className="p-3 rounded-full bg-white text-black text-base/[100%] font-medium active:scale-95 transition-transform">
            Изменить медиа
          </div>
        </button>
      </div>

      <AgeModal
        isOpen={ageOpen}
        onClose={() => setAgeOpen(false)}
        onSavePatch={(age) => profile.savePatch({ age }).catch(logError)}
      />
      <MetricsModal
        isOpen={metricsOpen}
        onClose={() => setMetricsOpen(false)}
        profile={profile}
        onSave={(data) => profile.savePatch(data).catch(logError)}
      />
      <ChangeMediaModal isOpen={mediaEditOpen} onClose={() => setMediaEditOpen(false)} />
    </section>
  )
}
