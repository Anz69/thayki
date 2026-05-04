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

function getScrollParent(el) {
  let node = el.parentElement
  while (node && node !== document.body) {
    const { overflow, overflowY } = getComputedStyle(node)
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) return node
    node = node.parentElement
  }
  return document.documentElement
}

/**
 * On focus of a form input, scroll the nearest scrollable ancestor so that the
 * NEXT input after the focused one is centered in the visible area above the
 * keyboard. If there is no next input, centers the focused input itself.
 *
 * Fires on visualViewport.resize (keyboard open event) for accuracy, with a
 * 320 ms fallback in case the event doesn't fire (e.g. keyboard already open).
 * No-op on desktop.
 */
export function scrollInputWithNext(inputEl, { fallbackDelay = 320 } = {}) {
  if (!inputEl || !isTouchUi()) return

  const vv = window.visualViewport
  if (!vv) return

  let fired = false

  const doScroll = () => {
    if (fired) return
    fired = true

    const scrollEl = getScrollParent(inputEl)
    const containerRect = scrollEl.getBoundingClientRect()

    // Visible height of the container above the keyboard
    const visibleH = vv.offsetTop + vv.height - containerRect.top
    if (visibleH <= 0) return

    // Find the next input inside the same scroll container
    const inputs = Array.from(
      scrollEl.querySelectorAll(
        'input[type="text"], input:not([type]), input[inputmode], textarea',
      ),
    )
    const idx = inputs.findIndex((el) => el === inputEl)
    const targetEl = idx >= 0 && idx + 1 < inputs.length ? inputs[idx + 1] : inputEl

    const targetRect = targetEl.getBoundingClientRect()

    // Center the target element in the visible area
    const targetMid = targetRect.top + targetRect.height / 2 - containerRect.top
    const delta = targetMid - visibleH * 0.5

    if (Math.abs(delta) > 8) {
      scrollEl.scrollBy({ top: delta, behavior: 'smooth' })
    }
  }

  // Primary trigger: fires as soon as the keyboard finishes opening
  const onResize = () => {
    vv.removeEventListener('resize', onResize)
    clearTimeout(timer)
    doScroll()
  }
  vv.addEventListener('resize', onResize)

  // Fallback: keyboard may already be open (switching between inputs)
  const timer = setTimeout(() => {
    vv.removeEventListener('resize', onResize)
    doScroll()
  }, fallbackDelay)
}
