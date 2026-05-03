/**
 * Primary interaction is touch (phone / tablet), not desktop mouse.
 * Used to gate scroll-into-view on text fields; selects scroll regardless.
 */
export function isTouchUi() {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true
    if (window.matchMedia('(hover: none)').matches && navigator.maxTouchPoints > 0) return true
  } catch {
    return 'ontouchstart' in window && navigator.maxTouchPoints > 0
  }
  return false
}
