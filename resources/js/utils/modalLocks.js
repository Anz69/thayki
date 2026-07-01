let pageRootLockDepth = 0
let telegramSwipeLockDepth = 0

let savedBodyOverflow = ''
let savedBodyOverscrollBehavior = ''
let savedBodyTouchAction = ''

function resolveTelegramWebApp() {
  return window?.Telegram?.WebApp ?? null
}

function lockBodyScrollStyles() {
  const { style } = document.body

  if (pageRootLockDepth === 0) {
    savedBodyOverflow = style.overflow
    savedBodyOverscrollBehavior = style.overscrollBehavior
    savedBodyTouchAction = style.touchAction
  }

  pageRootLockDepth += 1
  style.overflow = 'hidden'
  style.overscrollBehavior = 'none'
  style.touchAction = 'none'
}

function unlockBodyScrollStyles(force = false) {
  if (force) {
    pageRootLockDepth = 0
  } else if (pageRootLockDepth > 0) {
    pageRootLockDepth -= 1
  }

  if (pageRootLockDepth > 0) return

  const { style } = document.body
  style.overflow = savedBodyOverflow
  style.overscrollBehavior = savedBodyOverscrollBehavior
  style.touchAction = savedBodyTouchAction
}

export function lockPageRootScroll() {
  if (typeof document === 'undefined' || !document.body) return
  lockBodyScrollStyles()
}

export function unlockPageRootScroll(force = false) {
  if (typeof document === 'undefined' || !document.body) return
  unlockBodyScrollStyles(force)
}

export function telegramSwipeBehaviorSupported() {
  const tg = resolveTelegramWebApp()
  return Boolean(
    tg &&
    typeof tg.isVersionAtLeast === 'function' &&
    tg.isVersionAtLeast('7.7'),
  )
}

export function lockTelegramVerticalSwipes() {
  const tg = resolveTelegramWebApp()
  // Call whenever the method exists — do NOT gate on isVersionAtLeast('7.7'), which
  // returns false on some Android builds even though disableVerticalSwipes works,
  // leaving the swipe-collapse/pull-to-refresh gesture active (page breaks on scroll).
  if (typeof tg?.disableVerticalSwipes !== 'function') return

  telegramSwipeLockDepth += 1
  try { tg.disableVerticalSwipes() } catch { /* noop */ }
}

export function unlockTelegramVerticalSwipes(force = false) {
  const tg = resolveTelegramWebApp()
  if (typeof tg?.enableVerticalSwipes !== 'function') return

  if (force) {
    telegramSwipeLockDepth = 0
  } else if (telegramSwipeLockDepth > 0) {
    telegramSwipeLockDepth -= 1
  }

  if (telegramSwipeLockDepth > 0) return
  try { tg.enableVerticalSwipes() } catch { /* noop */ }
}
