import gsap from 'gsap'
export function freezeHeight(el) {
  gsap.set(el, { height: el.offsetHeight })
}
export function animateHeightToContent(el, opts = {}) {
  const { duration = 0.38, ease = 'power3.out' } = opts
  requestAnimationFrame(() => requestAnimationFrame(() => {
    gsap.to(el, {
      height: el.scrollHeight, duration, ease,
      onComplete: () => gsap.set(el, { clearProps: 'height' }),
    })
  }))
}