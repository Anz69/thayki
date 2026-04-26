import { useEffect, useRef } from 'react'

/**
 * Periodically invoke `loader()` while the page is visible and `enabled` is
 * true. Also invokes immediately when the document becomes visible (user
 * returns to the tab). Used as a fallback to ensure UI catches up with
 * server-side state changes when WebSocket delivery is missed (Reverb not
 * running, flaky connection, channel auth failure, etc.).
 *
 *   useStatusPolling(
 *     () => meeting.load(id),
 *     { enabled: !!id, intervalMs: 5000 },
 *   )
 *
 * `loader` may return a promise; concurrent invocations are guarded against.
 */
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
      try { await loaderRef.current?.() } catch { /* swallow */ }
      finally { inFlight = false }
    }

    // Run once immediately so the UI is up-to-date right away,
    // then continue polling on the interval.
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
