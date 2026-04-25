import gsap from 'gsap'

let _overlay  = null
let _pageRoot = null

const _listeners = new Set()
let _pageReady = false

export function registerOverlay(el)  { _overlay  = el }
export function registerPageRoot(el) { _pageRoot = el }
export function getPageReady()       { return _pageReady }

export function setPageReady(val) {
  _pageReady = val
  _listeners.forEach(fn => fn(val))
}

export function subscribePageReady(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

// ─── Loader done signal ─────────────────────────────────────────
// AppLoader calls setLoaderDone() when its exit animation reaches
// the point where content starts to be revealed. RouteChangeEffect
// uses onLoaderDone() instead of a raw setTimeout on the first load,
// so page entrance animations fire in sync with the loader exit.

const _loaderListeners = new Set()
let _loaderDone = false

export function setLoaderDone() {
  _loaderDone = true
  _loaderListeners.forEach(fn => fn())
  _loaderListeners.clear()
}

export function onLoaderDone(fn) {
  if (_loaderDone) { fn(); return () => {} }
  _loaderListeners.add(fn)
  return () => _loaderListeners.delete(fn)
}

export function transitionIn() {
  return Promise.resolve()
}

export function transitionOut() {
  if (_overlay)  gsap.set(_overlay,  { autoAlpha: 0 })
  if (_pageRoot) gsap.set(_pageRoot, { clearProps: 'xPercent,x,transform' })
  setPageReady(true)
}
