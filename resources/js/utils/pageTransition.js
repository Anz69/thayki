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
  Array.from(_listeners).forEach(fn => {
    try { fn(val) } catch { /* no listener should be able to cascade-fail */ }
  })
}

export function subscribePageReady(fn) {
  _listeners.add(fn)
  if (_pageReady) {
    queueMicrotask(() => {
      if (_listeners.has(fn)) {
        try { fn(true) } catch {}
      }
    })
  }
  return () => _listeners.delete(fn)
}


const _loaderListeners = new Set()
let _loaderDone = false

export function setLoaderDone() {
  _loaderDone = true
  const snapshot = Array.from(_loaderListeners)
  _loaderListeners.clear()
  snapshot.forEach(fn => {
    try { fn() } catch {}
  })
}

export function onLoaderDone(fn) {
  if (_loaderDone) {
    queueMicrotask(() => { try { fn() } catch {} })
    return () => {}
  }
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
