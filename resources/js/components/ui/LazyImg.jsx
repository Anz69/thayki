import { useState, useEffect } from 'react'

export default function LazyImg({
  src,
  alt = '',
  className = '',
  style,
  onClick,
  objectFit = 'cover',
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [src])

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: failed ? '#E5E5EA' : '#F0F0F0', ...style }}
      onClick={onClick}
    >
      {!failed && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${loaded ? 'opacity-0' : 'opacity-100'}`}
          style={{
            background: 'linear-gradient(110deg, #F0F0F0 30%, #E5E5EA 50%, #F0F0F0 70%)',
            backgroundSize: '200% 100%',
            animation: 'avatar-shimmer 1.4s linear infinite',
          }}
        />
      )}
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectFit }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      <style>{`
        @keyframes avatar-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
