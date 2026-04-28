import { useEffect, useRef } from 'react'

export function useStatusPolling(loader, { enabled = true, intervalMs = 3000 } = {}) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false
    let inFlight  = false
    let timerId   = null

    const run = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== 'undefined' && document.hidden) return
      inFlight = true
      try { await loaderRef.current?.() } catch {}
      finally { inFlight = false }
    }

    run()
    timerId = setInterval(run, intervalMs)

    const onVisibility = () => {
      if (!document.hidden) run()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(timerId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])
}
