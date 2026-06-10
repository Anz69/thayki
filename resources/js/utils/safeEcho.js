import echo from '@/utils/echo'

export function subscribePrivate(channelName, listeners = {}) {
  if (!channelName || typeof channelName !== 'string') return () => {}
  if (!echo || typeof echo.private !== 'function') return () => {}

  let channel = null
  try {
    channel = echo.private(channelName)
  } catch (err) {
    console.warn(`[safeEcho] failed to subscribe to ${channelName}:`, err)
    return () => {}
  }

  const wired = []
  for (const [event, handler] of Object.entries(listeners)) {
    if (typeof handler !== 'function') continue
    try {
      channel.listen(event, handler)
      wired.push(event)
    } catch (err) {
      console.warn(`[safeEcho] listen(${event}) failed on ${channelName}:`, err)
    }
  }

  return () => {
    for (const event of wired) {
      try { channel.stopListening(event) } catch {}
    }
    try { echo.leave(channelName) } catch {}
  }
}

/**
 * Returns the underlying private channel (same cached instance Echo uses for
 * subscribePrivate), so callers can send/receive client events (whispers) —
 * e.g. a "typing…" indicator that needs no backend event. Returns null if Echo
 * isn't available.
 */
export function privateChannel(channelName) {
  if (!channelName || typeof channelName !== 'string') return null
  if (!echo || typeof echo.private !== 'function') return null
  try {
    return echo.private(channelName)
  } catch {
    return null
  }
}

export default { subscribePrivate, privateChannel }
