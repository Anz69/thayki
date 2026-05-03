/**
 * Основной ввод — тач (телефон / планшет). На типичном ПК с мышью — false.
 */
export function isTouchUi() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}
