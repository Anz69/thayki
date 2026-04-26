import { useEffect, useRef } from 'react'
import { getPageReady, subscribePageReady, onLoaderDone } from '@/utils/pageTransition'

/**
 * Fire `callback` once when the loader has finished its exit animation AND
 * the page-root transform has settled.
 *
 * SAFETY: a hard timeout (default 4s) guarantees the callback fires even if
 * the loader signal or page-ready signal never arrive. This prevents the
 * "infinite loader" failure mode where a missed event would leave the user
 * staring at a spinner forever.
 *
 * Cleanup tears down any pending timer / subscriber if the component
 * unmounts before the callback could fire — important on slow networks
 * where the user can navigate away mid-load.
 */
export function usePageReady(callback, { safetyMs = 4000 } = {}) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    let cancelled  = false
    let fired      = false
    let timeoutId  = null
    let safetyId   = null
    let unsubReady = null
    let unsubLoader = null

    const fire = () => {
      if (cancelled || fired) return
      fired = true
      try { cbRef.current?.() } catch (e) { /* never let user code break the loader */ }
    }

    // SAFETY: no matter what happens upstream, fire after `safetyMs`.
    safetyId = setTimeout(fire, safetyMs)

    unsubLoader = onLoaderDone(() => {
      if (cancelled || fired) return
      if (getPageReady()) {
        timeoutId = setTimeout(fire, 0)
        return
      }
      unsubReady = subscribePageReady((ready) => {
        if (cancelled || fired) return
        if (ready) {
          unsubReady?.()
          unsubReady = null
          fire()
        }
      })
    })

    return () => {
      cancelled = true
      unsubLoader?.()
      unsubReady?.()
      if (timeoutId) clearTimeout(timeoutId)
      if (safetyId)  clearTimeout(safetyId)
    }
  }, [])
}
