import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import TransitionLink from '@/components/TransitionLink'
import { getEmojiUrl } from '@/utils/emoji'
import { useCompactMode } from '@/composables/useCompactMode'
import OptimizedImage from '@/components/ui/OptimizedImage'

const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?/gu

function NameWithEmoji({ name }) {
  const parts = []
  let last = 0
  let m
  EMOJI_RE.lastIndex = 0 // reset stateful /g regex — intentional property mutation
  while ((m = EMOJI_RE.exec(name)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{name.slice(last, m.index)}</span>)
    parts.push(
      <img
        key={m.index}
        src={getEmojiUrl(m[0])}
        alt={m[0]}
        width={18}
        height={18}
        draggable={false}
        style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: 2 }}
      />
    )
    last = m.index + m[0].length
  }
  if (last < name.length) parts.push(<span key={last}>{name.slice(last)}</span>)
  return <>{parts}</>
}

const CARD_H   = 68
const CARD_GAP = 12
const BOT_Y    = CARD_H + CARD_GAP

const messages = [
  { id: 1, name: 'Симла 💋',  text: 'Отправила локацию', img: '/img/girls/1.png' },
  { id: 2, name: 'Кимнай 👅', text: 'Хочет увидеться',  img: '/img/girls/2.png' },
  { id: 3, name: 'Малия 🌸',  text: 'Свободна сегодня', img: '/img/girls/3.png' },
  { id: 4, name: 'Нана 😘',   text: 'Онлайн сейчас',    img: '/img/girls/4.png' },
  { id: 5, name: 'Тия 💕',    text: 'Отправила фото',   img: '/img/girls/5.png' },
  { id: 6, name: 'Рин 🔥',    text: 'Свободна сегодня', img: '/img/girls/6.png' },
]

const bubblesConfig = [
  { img: '/img/girls/3.png', inner: 40, border: 8,  color: '#C4E7FB', left: '2%',  top: '22%' },
  { img: '/img/girls/2.png', inner: 34, border: 7,  color: '#D1D5DB', left: '14%', top: '58%' },
  { img: '/img/girls/5.png', inner: 60, border: 12, color: '#DCD1F9', left: '35%', top: '20%' },
  { img: '/img/girls/4.png', inner: 30, border: 6,  color: '#BAF3C9', left: '16%', top: '0%'  },
  { img: '/img/girls/6.png', inner: 38, border: 8,  color: '#FCA5A5', left: '64%', top: '0%'  },
  { img: '/img/girls/7.png', inner: 36, border: 7,  color: '#FBCFE8', left: '76%', top: '33%' },
  { img: '/img/girls/8.png', inner: 32, border: 7,  color: '#FFD7A1', left: '68%', top: '64%' },
]

// phone.png aspect ratio: 1720×2608 → 1.516
// At 393px (iPhone 16 Pro) → rendered height ≈ 596px → overlaps 20px into bottom glass bar

export default function LandingPage() {
  const isCompact = useCompactMode()

  const [cardAData, setCardAData] = useState(messages[0])
  const [cardBData, setCardBData] = useState(messages[1])

  // Track bottom section height so we can size the phone correctly
  const bottomRef    = useRef(null)
  const phoneWrapRef = useRef(null)

  const phoneRef    = useRef(null)
  const cardARef    = useRef(null)
  const cardBRef    = useRef(null)
  const textLine1   = useRef(null)
  const textLine2   = useRef(null)
  const subtitleRef = useRef(null)
  const btnWrapRef  = useRef(null)
  const bubbleRefs  = useRef([])

  const isATop      = useRef(true)
  const nextMsgIdx  = useRef(2)
  const cycleTimer  = useRef(null)
  const isAnimating = useRef(false)

  // Dynamically size phone wrapper so it fills the screen top-to-bottom
  // and always overlaps slightly into the glass bar (no gap)
  useEffect(() => {
    const resize = () => {
      if (!bottomRef.current || !phoneWrapRef.current) return
      const vh = window.innerHeight
      const bottomH = bottomRef.current.offsetHeight
      // Phone should reach 20px BELOW the bottom section top edge (overlap)
      const phoneH = vh - bottomH + 20
      phoneWrapRef.current.style.height = phoneH + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const cycleCards = () => {
    if (isAnimating.current) return
    isAnimating.current = true
    const topEl = isATop.current ? cardARef.current : cardBRef.current
    const botEl = isATop.current ? cardBRef.current : cardARef.current
    const tl = gsap.timeline({ onComplete: () => { isAnimating.current = false } })
    tl.to(botEl, { y: BOT_Y + 90, opacity: 0, scale: 0.88, duration: 0.3, ease: 'power3.in' })
      .to(topEl, { y: BOT_Y, duration: 0.3, ease: 'power3.in' }, 0)
      .call(() => {
        const next = messages[nextMsgIdx.current % messages.length]
        nextMsgIdx.current++
        if (isATop.current) setCardBData({ ...next })
        else setCardAData({ ...next })
        gsap.set(botEl, { y: -80, opacity: 0, scale: 0.9 })
        gsap.to(botEl, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
        isATop.current = !isATop.current
      })
  }

  const startAnimations = () => {
    const validBubbles = bubbleRefs.current.filter(Boolean)
    const tl = gsap.timeline()
    tl.to(phoneRef.current, { y: 0, autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out' })
      .to(cardARef.current, { y: 0, autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.2)' }, 0.2)
      .to(cardBRef.current, { y: BOT_Y, autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.2)' }, 0.34)
      .to(
        validBubbles,
        { scale: 1, autoAlpha: 1, duration: 0.5, stagger: { each: 0.08, from: 'random' }, ease: 'back.out(2.2)' },
        0.44,
      )
      .to(
        [textLine1.current, textLine2.current],
        { y: '0%', opacity: 1, duration: 0.7, stagger: 0.13, ease: 'expo.out' },
        0.54,
      )
      .to(subtitleRef.current, { y: 0, autoAlpha: 0.5, duration: 0.55, ease: 'power3.out' }, 0.8)
      .to(btnWrapRef.current, { y: 0, autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.8)' }, 0.92)
      .call(() => {
        validBubbles.forEach((el, i) => {
          gsap.to(el, {
            y: `+=${10 + (i % 4) * 4}`,
            x: `+=${((i % 3) - 1) * 5}`,
            duration: 2.0 + (i % 4) * 0.45,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: i * 0.22,
          })
          gsap.to(el, {
            rotation: `+=${i % 2 === 0 ? 6 : -6}`,
            duration: 2.6 + i * 0.3,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: i * 0.15 + 0.4,
          })
        })
        gsap.to(btnWrapRef.current, {
          scale: 1.04,
          duration: 1.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.4,
        })
        cycleTimer.current = setInterval(cycleCards, 2000)
      })
  }

  // ─── Initial GSAP state (before paint) ───────────────────────────
  useLayoutEffect(() => {
    gsap.set(phoneRef.current,    { autoAlpha: 0, y: 80, scale: 0.95 })
    gsap.set(cardARef.current,    { autoAlpha: 0, y: -60, scale: 0.92 })
    gsap.set(cardBRef.current,    { autoAlpha: 0, y: BOT_Y - 50, scale: 0.92 })
    gsap.set(textLine1.current,   { y: '120%', opacity: 0 })
    gsap.set(textLine2.current,   { y: '120%', opacity: 0 })
    gsap.set(subtitleRef.current, { autoAlpha: 0, y: 20 })
    gsap.set(btnWrapRef.current,  { autoAlpha: 0, y: 16, scale: 0.88 })
    bubbleRefs.current.forEach((el) => { if (el) gsap.set(el, { autoAlpha: 0, scale: 0 }) })
  }, [])

  // ─── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (cycleTimer.current) clearInterval(cycleTimer.current)
      bubbleRefs.current.forEach((el) => { if (el) gsap.killTweensOf(el) })
      gsap.killTweensOf([
        phoneRef.current, cardARef.current, cardBRef.current,
        textLine1.current, textLine2.current, subtitleRef.current, btnWrapRef.current,
      ])
    }
  }, [])

  usePageReady(startAnimations)

  // Responsive values
  const bubbleScale    = isCompact ? 0.75 : 1
  const bubblesH       = isCompact ? 100 : 160
  const cardTopPercent = isCompact ? '45%' : '45%'
  const cardsGap       = isCompact ? 'gap-0.5' : 'gap-5'
  const titleSize      = isCompact ? 'text-[26px]' : 'text-[32px]'
  const bottomPt       = isCompact ? 'pt-3' : 'pt-4'
  const bottomGap      = isCompact ? 'gap-3' : 'gap-5'
  const textGap        = isCompact ? 'gap-1' : 'gap-2.5'

  return (
    <main className="flex flex-col h-dvh overflow-hidden">

      {/* ── Phone + decorative elements — fills from top, overlaps into glass bar ── */}
      <div className="absolute inset-x-0 top-0 pointer-events-none z-0 flex justify-center">
        {/* Phone wrapper: JS-sized to touch bottom section with 20px overlap */}
        <div
          ref={phoneWrapRef}
          className="relative w-full max-w-[500px] overflow-visible"
        >
          {/* Phone image — scales to fill wrapper width, clipped at bottom by wrapper height */}
          <OptimizedImage
            ref={phoneRef}
            src="/img/phone.png"
            alt=""
            className="invisible w-full select-none block"
            style={{ willChange: 'transform, opacity' }}
            draggable={false}
          />

          {/* Cards + bubbles */}
          <div
            className={`absolute left-13 right-13 flex flex-col ${cardsGap}`}
            style={{ top: cardTopPercent }}
          >
            {/* Notification cards */}
            <div className="relative" style={{ height: CARD_H * 2 + CARD_GAP, overflow: 'visible' }}>
              {/* Card A */}
              <div
                ref={cardARef}
                className="invisible absolute inset-x-0 flex px-4.5 py-2 items-center bg-[#FDFDFD] rounded-2xl shadow-lg"
                style={{ willChange: 'transform, opacity' }}
              >
                <OptimizedImage src={cardAData.img} alt="avatar" className="size-13 rounded-full object-cover flex-shrink-0" />
                <div className="flex flex-col gap-2.5 flex-1 min-w-0 ml-4">
                  <p className="text-black text-lg/[100%] font-medium">
                    <NameWithEmoji name={cardAData.name} />
                  </p>
                  <p className="text-black text-base/[100%] font-medium opacity-50 truncate">{cardAData.text}</p>
                </div>
                <span className="text-black text-sm/[100%] opacity-30 absolute right-4.5 top-3.5">now</span>
              </div>

              {/* Card B */}
              <div
                ref={cardBRef}
                className="invisible absolute inset-x-0 flex px-4.5 py-2 items-center bg-[#FDFDFD] rounded-2xl shadow-lg"
                style={{ willChange: 'transform, opacity' }}
              >
                <OptimizedImage src={cardBData.img} alt="avatar" className="size-13 rounded-full object-cover flex-shrink-0" />
                <div className="flex flex-col gap-2.5 flex-1 min-w-0 ml-4">
                  <p className="text-black text-lg/[100%] font-medium">
                    <NameWithEmoji name={cardBData.name} />
                  </p>
                  <p className="text-black text-base/[100%] font-medium opacity-50 truncate">{cardBData.text}</p>
                </div>
                <span className="text-black text-sm/[100%] opacity-30 absolute right-4.5 top-3.5">now</span>
              </div>
            </div>

            {/* Bubbles */}
            <div
              className="relative"
              style={{ height: bubblesH, pointerEvents: 'none', overflow: 'visible' }}
            >
              {bubblesConfig.map((bubble, i) => {
                const inner  = Math.round(bubble.inner  * bubbleScale)
                const border = Math.round(bubble.border * bubbleScale)
                return (
                  <div
                    key={`bubble-${i}`}
                    ref={(el) => { bubbleRefs.current[i] = el }}
                    className="invisible absolute"
                    style={{ left: bubble.left, top: bubble.top, willChange: 'transform, opacity' }}
                  >
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        background: bubble.color,
                        padding: border + 'px',
                        display: 'inline-block',
                        lineHeight: 0,
                      }}
                    >
                      <OptimizedImage
                        src={bubble.img}
                        className="rounded-full object-cover block"
                        style={{ width: inner + 'px', height: inner + 'px' }}
                        draggable={false}
                        alt=""
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom section: text + button ── */}
      <div
        ref={bottomRef}
        className={`mt-auto relative z-50 container flex flex-col items-center bg-white/5 backdrop-blur-xs border-t-2 border-white/50 ${bottomPt} ${bottomGap}`}
        style={{
          paddingBottom: `max(${isCompact ? '4vh' : '4vh'}, calc(env(safe-area-inset-bottom) + ${isCompact ? '12px' : '16px'}))`,
        }}
      >

        {/* Title + subtitle */}
        <div className={`flex flex-col items-center text-center ${textGap}`}>
          <h1 className={`text-black font-semibold leading-[110%] ${titleSize}`}>
            <span className="block" style={{ overflow: 'hidden', paddingBottom: 4 }}>
              <span ref={textLine1} className="block">Проверенные модели</span>
            </span>
            <span className="block" style={{ overflow: 'hidden', paddingBottom: 4 }}>
              <span ref={textLine2} className="block">из Тайланда</span>
            </span>
          </h1>
          <p
            ref={subtitleRef}
            className={`invisible text-black font-medium opacity-50 ${isCompact ? 'text-sm/[100%]' : 'text-base/[100%]'}`}
          >
            Выбирайте лучших девушек и еще пару слов.
          </p>
        </div>

        {/* CTA button */}
        <div ref={btnWrapRef} className="invisible">
          <TransitionLink
            to="/home"
            className="bg-black w-[191px] flex items-center gap-2.5 justify-center text-white text-base/[100%] font-medium rounded-full group"
            style={{ paddingTop: isCompact ? 14 : 16, paddingBottom: isCompact ? 14 : 16 }}
          >
            Начать
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-all duration-300"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.28592 8.04705H12.6193M7.99996 12.7611L12.714 8.04705L7.99996 3.33301"
                stroke="white"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </TransitionLink>
        </div>
      </div>
    </main>
  )
}
