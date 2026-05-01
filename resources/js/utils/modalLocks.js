let pageRootLocks = 0
let swipeLocks = 0
let prevPageRootOverflow = null

function getPageRoot() {
  return document.getElementById('page-root')
}

export function lockPageRootScroll() {
  const root = getPageRoot()
  if (!root) return
  if (pageRootLocks === 0) {
    prevPageRootOverflow = root.style.overflowY
    root.style.overflowY = 'hidden'
  }
  pageRootLocks += 1
}

export function unlockPageRootScroll(force = false) {
  const root = getPageRoot()
  if (!root) return
  if (force) {
    pageRootLocks = 0
  } else {
    pageRootLocks = Math.max(0, pageRootLocks - 1)
  }
  if (pageRootLocks === 0) {
    root.style.overflowY = prevPageRootOverflow ?? ''
    prevPageRootOverflow = null
  }
}

export function lockTelegramVerticalSwipes() {
  if (swipeLocks === 0) {
    window.Telegram?.WebApp?.disableVerticalSwipes?.()
  }
  swipeLocks += 1
}

export function unlockTelegramVerticalSwipes(force = false) {
  if (force) {
    swipeLocks = 0
  } else {
    swipeLocks = Math.max(0, swipeLocks - 1)
  }
  if (swipeLocks === 0) {
    window.Telegram?.WebApp?.enableVerticalSwipes?.()
  }
}
