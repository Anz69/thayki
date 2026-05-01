import gsap from 'gsap'

const SCALE   = 0.88
const RADIUS  = 22
const OPACITY = 0.4
const SHELL_DARK  = '#444444'
const SHELL_LIGHT = '#ffffff'
let savedScrollY = 0

function getRoot()  { return document.getElementById('page-root') }
function getDepthTarget() { return document.getElementById('page-depth') ?? getRoot() }
function getShell() { return document.querySelector('.app-shell') }

function scrollTo(y, duration, ease = 'power3.out') {
  const root = getRoot()
  if (!root) return
  gsap.to(root, { scrollTop: y, duration, ease })
}

export function pushPageBack(duration = 0.44) {
  const el    = getDepthTarget()
  const root  = getRoot()
  const shell = getShell()
  if (!el || !root) return
  savedScrollY = root.scrollTop
  gsap.killTweensOf([el, root])
  scrollTo(0, duration * 0.85)
  gsap.to(el, {
    scale: SCALE,
    y: -24,
    borderRadius: `${RADIUS}px`,
    opacity: OPACITY,
    duration,
    ease: 'power3.out',
  })
  if (shell) {
    gsap.killTweensOf(shell)
    gsap.to(shell, { backgroundColor: SHELL_DARK, duration, ease: 'power3.out' })
  }
}

export function restorePageFront(duration = 0.38) {
  const el    = getDepthTarget()
  const root  = getRoot()
  const shell = getShell()
  if (!el || !root) return
  gsap.killTweensOf([el, root])
  const finalizeFrontState = () => {
    gsap.set(el, { clearProps: 'transform,opacity,borderRadius,transformOrigin' })
  }
  gsap.to(el, {
    scale: 1,
    y: 0,
    borderRadius: '0px',
    opacity: 1,
    duration,
    ease: 'power3.out',
    onComplete: finalizeFrontState,
  })
  if (duration === 0) finalizeFrontState()
  scrollTo(savedScrollY, duration, 'power2.out')
  if (shell) {
    gsap.killTweensOf(shell)
    gsap.to(shell, { backgroundColor: SHELL_LIGHT, duration, ease: 'power3.out' })
  }
}

export function setPageDepth(progress) {
  const el    = getDepthTarget()
  const shell = getShell()
  if (!el) return
  gsap.killTweensOf(el)
  gsap.set(el, {
    scale:        SCALE + (1 - SCALE) * progress,
    y:            -24 * (1 - progress),
    borderRadius: `${RADIUS * (1 - progress)}px`,
    opacity:      OPACITY + (1 - OPACITY) * progress,
  })
  if (shell) {
    const from = 0x44
    const to   = 0xff
    const c    = Math.round(from + (to - from) * progress)
    gsap.set(shell, { backgroundColor: `rgb(${c},${c},${c})` })
  }
}
