import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { useTranslation } from 'react-i18next'

const PinIcon = ({ color = '#E2319B' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
      stroke={color} strokeWidth="1.6" strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.4" stroke={color} strokeWidth="1.6" />
  </svg>
)

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="m5 12.5 4.5 4.5L19 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Classic arrow cursor used to "click" a suggestion.
const CursorIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M5 3l14 7-6 1.6L9.8 18 5 3z" fill="#111" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

const SUGGESTIONS = {
  ru: ['Москва', 'Московский', 'Мосальск'],
  en: ['Moscow', 'Moscow Mills', 'Mostar'],
}

/**
 * Step 2 — a self-playing demo of "leave a request": the city is typed in, a
 * suggestions dropdown opens, a cursor taps the right city, then a parameter
 * chip selects and the submit button flips to a "sent" confirmation.
 */
export default function HowItWorksStep2({ isActive }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('en') ? 'en' : 'ru'
  const suggestions = SUGGESTIONS[lang]
  const demoCity = suggestions[0]

  const rowsRef = useRef([])
  const cityValRef = useRef(null)
  const caretRef = useRef(null)
  const ddRef = useRef(null)
  const sugRef = useRef(null)
  const cursorRef = useRef(null)
  const chipRef = useRef(null)
  const btnRef = useRef(null)
  const labelRef = useRef(null)
  const sentRef = useRef(null)
  const played = useRef(false)

  const setRow = (i) => (el) => { rowsRef.current[i] = el }

  useLayoutEffect(() => {
    gsap.set(rowsRef.current.filter(Boolean), { autoAlpha: 0, y: 26 })
    if (ddRef.current) gsap.set(ddRef.current, { autoAlpha: 0, y: -6, scale: 0.96, transformOrigin: 'top center' })
    if (cursorRef.current) gsap.set(cursorRef.current, { autoAlpha: 0, x: 26, y: 22 })
    if (sentRef.current) gsap.set(sentRef.current, { autoAlpha: 0, y: 10 })
    if (caretRef.current) gsap.set(caretRef.current, { autoAlpha: 1 })
  }, [])

  useEffect(() => {
    if (!isActive || played.current) return
    played.current = true

    const caretBlink = gsap.to(caretRef.current, {
      autoAlpha: 0, duration: 0.5, repeat: -1, yoyo: true, ease: 'steps(1)',
    })

    const partial = demoCity.slice(0, Math.min(4, demoCity.length))

    const tl = gsap.timeline({ delay: 0.1 })

    // 1) Cards rise in.
    tl.to(rowsRef.current.filter(Boolean), {
      y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out',
    })

    // 2) Type the first letters.
    tl.to({ i: 0 }, {
      i: partial.length, duration: 0.45, ease: 'none',
      onUpdate() {
        const n = Math.round(this.targets()[0].i)
        if (cityValRef.current) cityValRef.current.textContent = partial.slice(0, n)
      },
    }, '-=0.1')

    // 3) Suggestions dropdown opens.
    tl.to(ddRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.6)' }, '+=0.05')

    // 4) Cursor flies in and taps the first suggestion.
    tl.fromTo(cursorRef.current,
      { autoAlpha: 0, x: 26, y: 22 },
      { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'power3.out' }, '-=0.05')
    tl.to(sugRef.current, { backgroundColor: '#FDE8F5', duration: 0.15 }, '+=0.12')
    tl.to(cursorRef.current, { scale: 0.82, duration: 0.1, ease: 'power2.in' }, '<')
    tl.to(cursorRef.current, { scale: 1, duration: 0.16, ease: 'back.out(2.4)' })

    // 5) City fills, caret + dropdown + cursor disappear.
    tl.add(() => {
      caretBlink.kill()
      if (cityValRef.current) cityValRef.current.textContent = demoCity
    })
    tl.to(caretRef.current, { autoAlpha: 0, duration: 0.15 }, '<')
    tl.to(ddRef.current, { autoAlpha: 0, y: -6, scale: 0.96, duration: 0.22, ease: 'power2.in' }, '+=0.06')
    tl.to(cursorRef.current, { autoAlpha: 0, x: 14, y: 12, duration: 0.2 }, '<')

    // 6) A goal chip selects with a pop.
    tl.to(chipRef.current, {
      backgroundColor: '#E2319B', color: '#ffffff', borderColor: 'transparent',
      boxShadow: '0 6px 16px rgba(226,49,155,0.28)', duration: 0.22,
    }, '+=0.05')
    tl.fromTo(chipRef.current, { scale: 1 }, { scale: 1.1, duration: 0.16, ease: 'back.out(3)' }, '<')
    tl.to(chipRef.current, { scale: 1, duration: 0.16 })

    // 7) Submit press → flip to "sent".
    tl.to(btnRef.current, { scale: 0.96, duration: 0.12, ease: 'power2.in' }, '+=0.15')
    tl.to(btnRef.current, { scale: 1, duration: 0.2, ease: 'back.out(2.2)' })
    tl.to(labelRef.current, { autoAlpha: 0, y: -10, duration: 0.2 }, '-=0.1')
    tl.fromTo(sentRef.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power3.out' }, '<')
    tl.to(btnRef.current, { backgroundColor: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.32)', duration: 0.3 }, '<')

    return () => { tl.kill(); caretBlink.kill() }
  }, [isActive, demoCity])

  return (
    <div className="flex flex-col justify-center flex-1 px-5 gap-3">
      {/* City field + suggestions dropdown */}
      <div ref={setRow(0)} className="relative z-20">
        <div className="bg-[#F5F5F7] rounded-2xl px-4 py-3.5 w-full">
          <span className="text-[#9B9AA0] text-[12px]/[100%] font-medium">{t('request.city')}</span>
          <div className="mt-2 flex items-center gap-2.5">
            <PinIcon />
            <span className="inline-flex items-center text-black text-[15px]/[120%] font-medium min-h-[18px]">
              <span ref={cityValRef} />
              <span ref={caretRef} className="inline-block w-[1.5px] h-[16px] bg-[#E2319B] ml-[1px]" />
            </span>
          </div>
        </div>

        <div
          ref={ddRef}
          className="absolute left-0 right-0 top-full mt-2 z-30 bg-white rounded-2xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)] border border-black/5"
        >
          {suggestions.map((city, i) => (
            <div
              key={city}
              ref={i === 0 ? sugRef : undefined}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            >
              <PinIcon color={i === 0 ? '#E2319B' : '#C4C4C4'} />
              <span className={`text-[14px]/[100%] font-medium ${i === 0 ? 'text-black' : 'text-[#9B9AA0]'}`}>
                {city}
              </span>
            </div>
          ))}
          <div ref={cursorRef} className="absolute right-3 top-[34px] pointer-events-none drop-shadow">
            <CursorIcon />
          </div>
        </div>
      </div>

      {/* Goal chips */}
      <div ref={setRow(1)} className="bg-[#F5F5F7] rounded-2xl px-4 py-3.5 w-full">
        <span className="text-[#9B9AA0] text-[12px]/[100%] font-medium">{t('request.goal')}</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span
            ref={chipRef}
            className="px-3.5 py-2 rounded-full text-[13px]/[100%] font-medium bg-white text-black border border-black/5"
          >
            {t('request.goals.travel')}
          </span>
          <Chip>{t('request.goals.leisure')}</Chip>
          <Chip>{t('request.goals.events')}</Chip>
        </div>
      </div>

      {/* Submit button */}
      <div ref={setRow(2)} className="w-full">
        <div
          ref={btnRef}
          className="relative w-full py-4 rounded-full bg-[#E2319B] shadow-[0_8px_24px_rgba(226,49,155,0.32)] overflow-hidden"
        >
          <span
            ref={labelRef}
            className="absolute inset-0 flex items-center justify-center text-white text-[15px]/[100%] font-semibold"
          >
            {t('request.submit')}
          </span>
          <span
            ref={sentRef}
            className="absolute inset-0 flex items-center justify-center gap-2 text-white text-[15px]/[100%] font-semibold"
          >
            <CheckIcon />
            {t('hiw.sent')}
          </span>
          {/* keeps the button height without showing text */}
          <span className="invisible text-[15px]/[100%] font-semibold block text-center">{t('request.submit')}</span>
        </div>
      </div>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span className="px-3.5 py-2 rounded-full text-[13px]/[100%] font-medium bg-white text-black border border-black/5">
      {children}
    </span>
  )
}
