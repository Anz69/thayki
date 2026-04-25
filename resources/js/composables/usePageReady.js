import { useEffect } from 'react'
import { getPageReady, subscribePageReady, onLoaderDone } from '@/utils/pageTransition'

export function usePageReady(callback) {
  useEffect(() => {
    // Wrap in onLoaderDone so page entrance animations only fire
    // after AppLoader has started its exit and revealed the content.
    // On subsequent navigations (loaderDone already true), onLoaderDone
    // fires the inner callback immediately, falling through to the normal
    // pageReady subscription logic.
    const unsubLoader = onLoaderDone(() => {
      if (getPageReady()) {
        const id = setTimeout(callback, 0)
        return () => clearTimeout(id)
      }
      const unsub = subscribePageReady((ready) => {
        if (ready) {
          unsub()
          callback()
        }
      })
    })
    return unsubLoader
  }, [])
}