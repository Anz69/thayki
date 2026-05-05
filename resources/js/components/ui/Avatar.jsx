import { useState, useEffect, useMemo, useRef } from 'react'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'

const LOAD_TIMEOUT_MS = 14000

const PALETTE = ['#E2319B', '#7B5BFF', '#229ED9', '#22B573', '#FF7A3D', '#FFB01F']

function paletteIndex(name) {
  const str = String(name || '?')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % PALETTE.length
}

export default function Avatar({ src, name, size = 112, className = '' }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const letter = (String(name || '?').trim()[0] ?? '?').toUpperCase()
  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src])
  const loadWatchRef = useRef(null)
  const imgRef       = useRef(null)

  useEffect(() => {
    setFailed(false)
    setLoaded(false)
    if (!resolvedSrc) return undefined
    const t = window.setTimeout(() => {
      setFailed(true)
    }, LOAD_TIMEOUT_MS)
    loadWatchRef.current = t
    return () => {
      window.clearTimeout(t)
      loadWatchRef.current = null
    }
  }, [resolvedSrc])

  // Cached images fire onLoad before React attaches the handler — check .complete after mount
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      if (loadWatchRef.current) {
        window.clearTimeout(loadWatchRef.current)
        loadWatchRef.current = null
      }
      setLoaded(true)
    }
  }, [resolvedSrc])

  const bg = PALETTE[paletteIndex(name)]

  if (!resolvedSrc || failed) {
    return (
      <div
        style={{ width: size, height: size, background: bg, flexShrink: 0 }}
        className={`rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      >
        <span style={{ fontSize: Math.round(size * 0.42) }}>{letter}</span>
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size, flexShrink: 0, background: '#F0F0F0' }}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: 'linear-gradient(110deg, #F0F0F0 30%, #E5E5EA 50%, #F0F0F0 70%)',
          backgroundSize: '200% 100%',
          animation: 'avatar-shimmer 1.4s linear infinite',
        }}
      />
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt=""
        decoding="async"
        style={{ width: size, height: size }}
        className={`absolute inset-0 object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => {
          if (loadWatchRef.current) {
            window.clearTimeout(loadWatchRef.current)
            loadWatchRef.current = null
          }
          setLoaded(true)
        }}
        onError={() => {
          if (loadWatchRef.current) {
            window.clearTimeout(loadWatchRef.current)
            loadWatchRef.current = null
          }
          setFailed(true)
        }}
      />
      <style>{`
        @keyframes avatar-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
