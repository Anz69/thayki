import { useState, useEffect } from 'react'

const COMPACT_HEIGHT = 880

export function useCompactMode() {
  const [isCompact, setIsCompact] = useState(() => window.innerHeight <= COMPACT_HEIGHT)

  useEffect(() => {
    const handler = () => setIsCompact(window.innerHeight <= COMPACT_HEIGHT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isCompact
}
