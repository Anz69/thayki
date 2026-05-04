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
 * On focus of a form input, scroll the nearest scrollable ancestor so that:
 *   - the focused input is visible, AND
 *   - the next input in the container is also visible above the keyboard.
 *
 * Uses visualViewport to account for the on-screen keyboard height.
 * Only runs on touch devices (no-op on desktop).
 */
export function scrollInputWithNext(inputEl, { delay = 220 } = {}) {
  if (!inputEl || !isTouchUi()) return
  setTimeout(() => {
    const vv = window.visualViewport
    if (!vv) return

    const scrollEl = getScrollParent(inputEl)

    // All text-style inputs inside this container
    const inputs = Array.from(
      scrollEl.querySelectorAll(
        'input[type="text"], input:not([type]), input[inputmode], textarea',
      ),
    )
    const idx = inputs.findIndex((el) => el === inputEl)
    // Scroll enough to show the NEXT input; fall back to current if no next
    const targetEl = idx >= 0 && idx + 1 < inputs.length ? inputs[idx + 1] : inputEl

    const targetRect = targetEl.getBoundingClientRect()
    // Bottom of the visible area in layout-viewport coordinates
    const visibleBottom = vv.offsetTop + vv.height
    const gap = 20

    const overflow = targetRect.bottom - (visibleBottom - gap)
    if (overflow > 0) {
      scrollEl.scrollBy({ top: overflow, behavior: 'smooth' })
    }
  }, delay)
}
