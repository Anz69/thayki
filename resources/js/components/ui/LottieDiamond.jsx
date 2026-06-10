import { useState, useEffect } from 'react'
import Lottie from 'lottie-react'

// The CRYSTALL Lottie is ~350KB — fetch it once and cache the parsed data so
// every diamond (modal hero, badge, header) shares a single download.
let cachedData = null
let cachedPromise = null
function loadCrystall() {
  if (cachedData) return Promise.resolve(cachedData)
  if (!cachedPromise) {
    cachedPromise = fetch('/img/crystall.json')
      .then((r) => r.json())
      .then((d) => { cachedData = d; return d })
      .catch(() => null)
  }
  return cachedPromise
}

export default function LottieDiamond({ size = 172, className = '', style }) {
  const [data, setData] = useState(cachedData)
  useEffect(() => {
    let on = true
    loadCrystall().then((d) => { if (on && d) setData(d) })
    return () => { on = false }
  }, [])

  const box = { width: size, height: size, ...style }
  if (!data) return <div className={className} style={box} aria-hidden />
  return (
    <Lottie
      animationData={data}
      loop
      autoplay
      className={className}
      style={box}
      rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
    />
  )
}
