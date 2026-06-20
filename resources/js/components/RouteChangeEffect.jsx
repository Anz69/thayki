import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { transitionOut, setPageReady } from '@/utils/pageTransition'
import useBookingStore from '@/stores/useBookingStore'
let isFirstNavigation = true

function closeGlobalModals() {
  try { if (useBookingStore.getState().isOpen) useBookingStore.getState().close() } catch { }
}

export default function RouteChangeEffect() {
  const location = useLocation()
  const prevKey = useRef(null)
  useEffect(() => {
    if (isFirstNavigation) {
      isFirstNavigation = false
      prevKey.current = location.key
      const id = setTimeout(() => setPageReady(true), 60)
      return () => clearTimeout(id)
    }
    if (prevKey.current !== location.key) {
      prevKey.current = location.key
      closeGlobalModals()
      transitionOut()
    }
  }, [location])
  return null
}