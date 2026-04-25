import { useState } from 'react'

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
  const letter = (String(name || '?').trim()[0] ?? '?').toUpperCase()

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className={`rounded-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }

  const bg = PALETTE[paletteIndex(name)]
  return (
    <div
      style={{ width: size, height: size, background: bg, flexShrink: 0 }}
      className={`rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.42) }}>{letter}</span>
    </div>
  )
}
