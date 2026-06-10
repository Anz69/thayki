const listeners = new Set()

export function subscribeActiveMeetingsRefresh(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emitActiveMeetingsRefresh() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
    }
  })
}
