import { useEffect, useRef } from 'react'
import { getPageReady, subscribePageReady, onLoaderDone } from '@/utils/pageTransition'

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
      try { cbRef.current?.() } catch {}
    }

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
