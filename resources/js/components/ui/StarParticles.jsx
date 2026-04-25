import { useRef, useEffect } from 'react'
import gsap from 'gsap'
const STAR_SVG = (
  <svg width="120" height="116" viewBox="0 0 162 156" fill="none">
    <path d="M69.9305 8.04246C73.4147 -2.68082 88.5853 -2.68082 92.0695 8.04245L103.212 42.3349C104.77 47.1305 109.239 50.3774 114.281 50.3774H150.339C161.614 50.3774 166.302 64.8055 157.18 71.4328L128.009 92.6267C123.93 95.5906 122.223 100.844 123.781 105.64L134.923 139.932C138.407 150.655 126.134 159.573 117.012 152.945L87.8413 131.751C83.7619 128.787 78.238 128.787 74.1587 131.751L44.9877 152.945C35.866 159.573 23.5927 150.655 27.0769 139.932L38.2192 105.64C39.7774 100.844 38.0704 95.5906 33.9911 92.6267L4.82014 71.4328C-4.30162 64.8055 0.386344 50.3774 11.6615 50.3774H47.7187C52.7611 50.3774 57.23 47.1305 58.7882 42.3349L69.9305 8.04246Z" fill="#E2319B" />
  </svg>
)
const PARTICLES = [
  { angle: 0,   dist: 108, size: 12, color: '#E2319B', delay: 0.1, shape: 'circle' },
  { angle: 45,  dist: 130, size: 9,  color: '#B331E2', delay: 0.15, shape: 'star' },
  { angle: 90,  dist: 115, size: 14, color: '#E2319B', delay: 0.08, shape: 'circle' },
  { angle: 135, dist: 125, size: 8,  color: '#FF6BB5', delay: 0.2,  shape: 'circle' },
  { angle: 180, dist: 110, size: 10, color: '#B331E2', delay: 0.12, shape: 'star' },
  { angle: 225, dist: 132, size: 7,  color: '#E2319B', delay: 0.18, shape: 'circle' },
  { angle: 270, dist: 118, size: 13, color: '#E2314C', delay: 0.06, shape: 'circle' },
  { angle: 315, dist: 128, size: 9,  color: '#FF6BB5', delay: 0.22, shape: 'star' },
  { angle: 22,  dist: 165, size: 6,  color: '#E2319B', delay: 0.25, shape: 'circle' },
  { angle: 90,  dist: 172, size: 5,  color: '#B331E2', delay: 0.3,  shape: 'circle' },
  { angle: 160, dist: 168, size: 7,  color: '#E2314C', delay: 0.28, shape: 'circle' },
  { angle: 240, dist: 170, size: 5,  color: '#FF6BB5', delay: 0.32, shape: 'circle' },
  { angle: 310, dist: 162, size: 6,  color: '#E2319B', delay: 0.26, shape: 'circle' },
]
function toXY(angle, dist) {
  const rad = (angle * Math.PI) / 180
  return { x: Math.cos(rad) * dist, y: Math.sin(rad) * dist }
}
export default function StarParticles({ className = '' }) {
  const starRef     = useRef(null)
  const glowRef     = useRef(null)
  const particleRefs = useRef([])
  useEffect(() => {
    const star       = starRef.current
    const glow       = glowRef.current
    const particles  = particleRefs.current
    gsap.set(star,  { scale: 0, opacity: 0, rotation: -20 })
    gsap.set(glow,  { scale: 0.3, opacity: 0 })
    particles.forEach((p) => p && gsap.set(p, { scale: 0, opacity: 0, x: 0, y: 0 }))
    const tl = gsap.timeline()
    tl.to(glow, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
    tl.to(star, { scale: 1, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(2.2)' }, 0.1)
    tl.to(star, { scale: 1.06, rotation: 5, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.9)
    PARTICLES.forEach((p, i) => {
      const el = particles[i]
      if (!el) return
      const { x, y } = toXY(p.angle, p.dist)
      tl.to(el, {
        x, y, scale: 1, opacity: 1,
        duration: 0.55,
        ease: 'back.out(1.6)',
      }, 0.2 + p.delay)
    })
    PARTICLES.forEach((p, i) => {
      const el = particles[i]
      if (!el) return
      const { x, y } = toXY(p.angle, p.dist)
      const floatY = 6 + (i % 3) * 4
      const floatX = 4 + (i % 4) * 2
      gsap.to(el, {
        x: x + floatX * (i % 2 === 0 ? 1 : -1),
        y: y - floatY,
        scale: p.shape === 'star' ? 1.2 : 1.08,
        duration: 1.4 + (i % 5) * 0.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 0.8 + p.delay,
      })
    })
    return () => { tl.kill() }
  }, [])
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: 360, height: 360 }}
    >
      <div
        ref={glowRef}
        style={{
          position:     'absolute',
          width:        200,
          height:       200,
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(226,49,155,0.22) 0%, transparent 70%)',
          pointerEvents:'none',
        }}
      />
      <div
        ref={starRef}
        style={{ position: 'absolute', transformOrigin: 'center center' }}
      >
        {STAR_SVG}
      </div>
      {PARTICLES.map((p, i) => (
        <div
          key={`particle-${i}`}
          ref={(el) => { particleRefs.current[i] = el }}
          style={{
            position:        'absolute',
            width:           p.size,
            height:          p.size,
            borderRadius:    p.shape === 'circle' ? '50%' : '2px',
            background:      p.color,
            transformOrigin: 'center center',
            rotate:          p.shape === 'star' ? '45deg' : '0deg',
            boxShadow:       `0 0 ${p.size * 1.5}px ${p.color}88`,
            pointerEvents:   'none',
          }}
        />
      ))}
    </div>
  )
}