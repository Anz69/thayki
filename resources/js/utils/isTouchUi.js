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

function isVisiblyFocusable(el) {
  if (!el) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
  if (el.disabled || el.readOnly) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

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

    const visibleH = vv.offsetTop + vv.height - containerRect.top
    if (visibleH <= 0) return

    const inputs = Array.from(
      scrollEl.querySelectorAll(
        'input[type="text"], input:not([type]), input[inputmode], textarea',
      ),
    ).filter(isVisiblyFocusable)
    const idx = inputs.findIndex((el) => el === inputEl)
    const targetEl = idx >= 0 && idx + 1 < inputs.length ? inputs[idx + 1] : inputEl

    const targetRect = targetEl.getBoundingClientRect()

    const targetMid = targetRect.top + targetRect.height / 2 - containerRect.top
    const delta = targetMid - visibleH * 0.5

    if (Math.abs(delta) > 8) {
      scrollEl.scrollBy({ top: delta, behavior: 'smooth' })
    }
  }

  const onResize = () => {
    vv.removeEventListener('resize', onResize)
    clearTimeout(timer)
    doScroll()
  }
  vv.addEventListener('resize', onResize)

  const timer = setTimeout(() => {
    vv.removeEventListener('resize', onResize)
    doScroll()
  }, fallbackDelay)
}
