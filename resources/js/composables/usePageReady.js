import { useEffect, useRef } from 'react'
import { getPageReady, subscribePageReady, onLoaderDone } from '@/utils/pageTransition'

/**
 * Fire `callback` once when the loader has finished its exit animation AND
 * the page-root transform has settled.
 *
 * Cleanup tears down any pending timer / subscriber if the component
 * unmounts before the callback could fire — important on slow networks
 * where the user can navigate away mid-load.
 */
export function usePageReady(callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    let timeoutId = null
    let unsubReady = null
    let cancelled = false

    const fire = () => {
      if (!cancelled) cbRef.current?.()
    }

    const unsubLoader = onLoaderDone(() => {
      if (cancelled) return
      if (getPageReady()) {
        timeoutId = setTimeout(fire, 0)
        return
      }
      unsubReady = subscribePageReady((ready) => {
        if (cancelled) return
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
    }
  }, [])
}
