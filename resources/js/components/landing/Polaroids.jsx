import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { modelName } from '@/utils/modelName'

// Different cities (cobe-style) — cycled across the floating polaroids.
const CITIES = ['Москва', 'Санкт-Петербург', 'Сочи', 'Казань', 'Дубай', 'Пхукет', 'Тбилиси', 'Минск']

// Scatter slots around the globe (corners / mid-edges of the square box).
const SLOTS = [
  { top: '1%', left: '-3%', rot: -8 },
  { top: '0%', right: '-2%', rot: 7 },
  { top: '40%', left: '-9%', rot: -5 },
  { top: '38%', right: '-9%', rot: 6 },
  { bottom: '4%', left: '3%', rot: -7 },
  { bottom: '1%', right: '5%', rot: 9 },
]

/**
 * Floating polaroid photos of catalog models (with their city) scattered around
 * the globe — cobe.vercel.app vibe. Decorative only: pointer-events-none so the
 * globe underneath stays draggable. The centre logo + orbit text are untouched.
 */
export default function Polaroids() {
  const [models, setModels] = useState([])
  const rootRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.get('/catalog/models', { params: { per_page: 16 } })
      .then((r) => {
        if (cancelled) return
        const list = (r?.data?.data ?? []).filter((m) => m.photos?.[0]?.url).slice(0, SLOTS.length)
        setModels(list)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!models.length) return
    const cards = rootRef.current?.querySelectorAll('[data-pol]') ?? []
    cards.forEach((c, i) => {
      gsap.killTweensOf(c)
      gsap.fromTo(
        c,
        { autoAlpha: 0, scale: 0.6, y: 26 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, delay: 0.7 + i * 0.11, ease: 'back.out(1.6)' },
      )
      // Gentle, endless float (each card slightly out of phase).
      gsap.to(c, {
        y: '+=12',
        rotation: i % 2 ? 2.5 : -2.5,
        duration: 2.6 + i * 0.35,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1.1 + i * 0.12,
      })
    })
    return () => cards.forEach((c) => gsap.killTweensOf(c))
  }, [models])

  if (!models.length) return null

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none z-10">
      {models.map((m, i) => {
        const slot = SLOTS[i]
        const photo = resolveMediaUrl(m.photos[0].url)
        const city = CITIES[i % CITIES.length]
        return (
          <div
            key={m.id}
            data-pol
            className="absolute"
            style={{ top: slot.top, bottom: slot.bottom, left: slot.left, right: slot.right, width: 'clamp(62px, 17%, 100px)', opacity: 0 }}
          >
            <div
              className="bg-white rounded-[14px] p-1.5 pb-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
              style={{ transform: `rotate(${slot.rot}deg)` }}
            >
              <div className="w-full aspect-[3/4] rounded-[10px] overflow-hidden bg-[#EFEAEE]">
                <img src={photo} alt="" className="w-full h-full object-cover object-top" draggable={false} />
              </div>
              <div className="px-0.5 pt-1.5">
                <p className="text-black text-[11px] font-semibold leading-none truncate">{modelName(m)}</p>
                <p className="text-[#9B9AA0] text-[9px] leading-none mt-1 truncate">📍 {city}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
