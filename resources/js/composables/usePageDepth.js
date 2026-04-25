import gsap from 'gsap'

const SCALE   = 0.88
const RADIUS  = 22
const OPACITY = 0.4
const SHELL_DARK  = '#444444'
const SHELL_LIGHT = '#ffffff'
let savedScrollY = 0

function getRoot()  { return document.getElementById('page-root') }
function getShell() { return document.querySelector('.app-shell') }

function scrollTo(y, duration, ease = 'power3.out') {
  gsap.to(document.documentElement, { scrollTop: y, duration, ease })
}

export function pushPageBack(duration = 0.44) {
  const el    = getRoot()
  const shell = getShell()
  if (!el) return
  savedScrollY = window.scrollY
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
  const el    = getRoot()
  const shell = getShell()
  if (!el) return
  gsap.to(el, {
    scale: 1,
    y: 0,
    borderRadius: '0px',
    opacity: 1,
    duration,
    ease: 'power3.out',
    onComplete: () => { el.style.transformOrigin = '' },
  })
  scrollTo(savedScrollY, duration, 'power2.out')
  if (shell) {
    gsap.killTweensOf(shell)
    gsap.to(shell, { backgroundColor: SHELL_LIGHT, duration, ease: 'power3.out' })
  }
}

export function setPageDepth(progress) {
  const el    = getRoot()
  const shell = getShell()
  if (!el) return
  gsap.set(el, {
    scale:        SCALE + (1 - SCALE) * progress,
    y:            14 * (1 - progress),
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
