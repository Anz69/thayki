import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
const STAR_PATH =
  'M69.9305 8.04246C73.4147 -2.68082 88.5853 -2.68082 92.0695 8.04245L103.212 42.3349C104.77 47.1305 109.239 50.3774 114.281 50.3774H150.339C161.614 50.3774 166.302 64.8055 157.18 71.4328L128.009 92.6267C123.93 95.5906 122.223 100.844 123.781 105.64L134.923 139.932C138.407 150.655 126.134 159.573 117.012 152.945L87.8413 131.751C83.7619 128.787 78.238 128.787 74.1587 131.751L44.9877 152.945C35.866 159.573 23.5927 150.655 27.0769 139.932L38.2192 105.64C39.7774 100.844 38.0704 95.5906 33.9911 92.6267L4.82014 71.4328C-4.30162 64.8055 0.386344 50.3774 11.6615 50.3774H47.7187C52.7611 50.3774 57.23 47.1305 58.7882 42.3349L69.9305 8.04246Z'
function StarSVG({ size, color }) {
  return (
    <svg width={size} height={Math.round(size * (156 / 162))} viewBox="0 0 162 156" fill="none">
      <path d={STAR_PATH} fill={color} />
    </svg>
  )
}
const STAR_SIZE = 168
const STAR_H    = Math.round(STAR_SIZE * (156 / 162))
const CX        = STAR_SIZE / 2          
const CY        = STAR_H / 2            
const SIDE_SIZE = 148
const SPARKLES = [
  { dx: -60, dy: -88, r: 4.5 },
  { dx: -28, dy: -98, r: 3   },
  { dx:  46, dy: -88, r: 5   },
  { dx:  88, dy: -50, r: 3   },
  { dx: -52, dy:  60, r: 3.5 },
  { dx:  38, dy:  66, r: 4   },
].map((s) => ({
  r:    s.r,
  top:  CY + s.dy - s.r,   
  left: CX + s.dx - s.r,   
}))
export default function HowItWorksStep3({ isActive }) {
  const centerRef = useRef(null)
  const leftRef   = useRef(null)
  const rightRef  = useRef(null)
  const dotsRef   = useRef([])
  useLayoutEffect(() => {
    gsap.set(leftRef.current,   { autoAlpha: 0, x: -44 })
    gsap.set(rightRef.current,  { autoAlpha: 0, x:  44 })
    gsap.set(centerRef.current, { autoAlpha: 0, scale: 0.42 })
    gsap.set(dotsRef.current.filter(Boolean), { autoAlpha: 0, scale: 0 })
  }, [])
  useEffect(() => {
    if (!isActive) return undefined
    const center = centerRef.current
    const left   = leftRef.current
    const right  = rightRef.current
    const dots   = dotsRef.current.filter(Boolean)

    gsap.killTweensOf([center, left, right, ...dots])
    gsap.set(left,   { autoAlpha: 0, x: -44, y: 0 })
    gsap.set(right,  { autoAlpha: 0, x:  44, y: 0 })
    gsap.set(center, { autoAlpha: 0, scale: 0.42, y: 0 })
    gsap.set(dots,   { autoAlpha: 0, scale: 0 })

    const tl = gsap.timeline({
      delay: 0.45,
      onComplete() {
        gsap.to(center, {
          y: -14,
          duration: 2.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
        gsap.to(left, {
          y: 10,
          duration: 2.9,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.5,
        })
        gsap.to(right, {
          y: -9,
          duration: 3.3,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1.0,
        })
        dots.forEach((dot, i) => {
          gsap.fromTo(
            dot,
            { scale: 1, autoAlpha: 1 },
            {
              scale: 0.18,
              autoAlpha: 0.22,
              duration: 0.55 + i * 0.10,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
              delay: i * 0.25,
            },
          )
        })
      },
    })
    tl.to([left, right], {
      autoAlpha: 1,
      x: 0,
      duration: 0.62,
      stagger: 0.08,
      ease: 'back.out(1.5)',
    })
    tl.to(
      center,
      {
        autoAlpha: 1,
        scale: 1,
        duration: 0.75,
        ease: 'back.out(2.0)',
        clearProps: 'scale',
      },
      '-=0.40',
    )
    tl.to(
      dots,
      {
        autoAlpha: 1,
        scale: 1,
        duration: 0.40,
        stagger: 0.07,
        ease: 'back.out(2.8)',
      },
      '-=0.30',
    )
    return () => {
      tl.kill()
      gsap.killTweensOf([center, left, right, ...dots])
    }
  }, [isActive])
  return (
    <div className="flex items-center justify-center flex-1 relative overflow-hidden">
      <div
        ref={leftRef}
        style={{
          position: 'absolute',
          left: '-52px',
          top: '60%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      >
        <StarSVG size={SIDE_SIZE} color="#FFD6EA" />
      </div>
      <div
        ref={rightRef}
        style={{
          position: 'absolute',
          right: '-52px',
          top: '62%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      >
        <StarSVG size={SIDE_SIZE} color="#FFD6EA" />
      </div>
      <div
        ref={centerRef}
        className="relative z-10"
        style={{ width: STAR_SIZE, height: STAR_H, flexShrink: 0, willChange: 'transform, opacity' }}
      >
        {SPARKLES.map((s, i) => (
          <div
            key={`sparkle-${i}`}
            ref={(el) => { dotsRef.current[i] = el }}
            style={{
              position: 'absolute',
              top:    s.top,
              left:   s.left,
              width:  s.r * 2,
              height: s.r * 2,
              borderRadius: '50%',
              background: '#E2319B',
              willChange: 'transform, opacity',
            }}
          />
        ))}
        <StarSVG size={STAR_SIZE} color="#E2319B" />
      </div>
    </div>
  )
}