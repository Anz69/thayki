import { useState, useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import FaqModal from '@/components/modals/FaqModal'

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="15" viewBox="0 0 14 15" fill="none">
    <path d="M0.75 14.25C0.75 14.25 1.41667 9.88861 6.75 9.88861C12.0833 9.88861 12.75 14.25 12.75 14.25M10.125 4.125C10.125 5.98896 8.61396 7.5 6.75 7.5C4.88604 7.5 3.375 5.98896 3.375 4.125C3.375 2.26104 4.88604 0.75 6.75 0.75C8.61396 0.75 10.125 2.26104 10.125 4.125Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSupport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <g clipPath="url(#clip_sup_mm)">
      <path d="M4.875 15.2462L7.59984 12.5213M5.41959 10.459L2.81934 13.0592M5.41959 7.54085L2.75368 4.87493M4.91103 2.78965L7.37132 5.24993M13.0377 15.1589L10.5173 12.6386M12.5803 10.459L15.1736 13.0523M13.125 2.75354L10.5173 5.36124M12.6213 7.49993L15.1913 4.92984M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9ZM12.75 8.99998C12.75 11.071 11.0711 12.75 9 12.75C6.92893 12.75 5.25 11.071 5.25 8.99998C5.25 6.92891 6.92893 5.24998 9 5.24998C11.0711 5.24998 12.75 6.92891 12.75 8.99998Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs><clipPath id="clip_sup_mm"><rect width="18" height="18" fill="white" /></clipPath></defs>
  </svg>
)

function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em]">
      {children}
    </p>
  )
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 bg-[#F5F5F7] rounded-2xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span className="text-black text-[15px]/[100%] font-medium">{label}</span>
    </button>
  )
}

export default function ModelMorePage() {
  const navigate = useTransitionNavigate()
  const [faqOpen, setFaqOpen] = useState(false)

  const section1Ref = useRef(null)
  const section2Ref = useRef(null)

  useLayoutEffect(() => {
    if (section1Ref.current) gsap.set(section1Ref.current, { autoAlpha: 0, y: 24 })
    if (section2Ref.current) gsap.set(section2Ref.current, { autoAlpha: 0, y: 24 })
  }, [])

  usePageReady(() => {
    const s1 = section1Ref.current
    const s2 = section2Ref.current
    if (!s1 || !s2) return
    gsap.timeline()
      .to(s1, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'expo.out' })
      .to(s2, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.1)
  })

  return (
    <>
      <section className="flex flex-col min-h-screen bg-white">

        <div className="flex flex-col gap-4 container pt-[40px] pb-[120px]">

          <div ref={section1Ref} className="flex flex-col gap-4">
            <SectionLabel>Важное</SectionLabel>
            <MenuItem icon={<IconUser />} label="Профиль" onClick={() => navigate('/profile')} />
          </div>

          <div ref={section2Ref} className="flex flex-col gap-4">
            <SectionLabel>Другое</SectionLabel>
            <MenuItem icon={<IconSupport />} label="F.A.Q." onClick={() => setFaqOpen(true)} />
            <MenuItem icon={<IconSupport />} label="Написать в поддержку" onClick={() => navigate('/support')} />
          </div>

        </div>

      </section>

      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  )
}
