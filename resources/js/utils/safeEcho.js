import echo from '@/utils/echo'

/**
 * Subscribe to a private Reverb channel and one or more events with automatic
 * teardown on cleanup. All Echo / Pusher errors are swallowed and logged with
 * console.warn so a flaky WebSocket cannot crash the React tree.
 *
 *   const unsub = subscribePrivate(`chats.${id}`, {
 *     '.message.sent':  onSent,
 *     '.messages.read': onRead,
 *   })
 *   // …later
 *   unsub()
 *
 * Returns a no-op cleanup function on failure so callers can use the result
 * directly inside a useEffect cleanup without null-checking.
 */
export function subscribePrivate(channelName, listeners = {}) {
  if (!channelName || typeof channelName !== 'string') return () => {}
  if (!echo || typeof echo.private !== 'function') return () => {}

  let channel = null
  try {
    channel = echo.private(channelName)
  } catch (err) {
    // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.warn(`[safeEcho] listen(${event}) failed on ${channelName}:`, err)
    }
  }

  return () => {
    for (const event of wired) {
      try { channel.stopListening(event) } catch { /* noop */ }
    }
    try { echo.leave(channelName) } catch { /* noop */ }
  }
}

export default { subscribePrivate }
