
export function parseTelegramStartParam(rawStartParam) {
  const startParam = typeof rawStartParam === 'string' ? rawStartParam.trim() : ''

  if (!startParam) {
    return { browserToken: null, inviteToken: null }
  }

  if (startParam.startsWith('browser_')) {
    const token = startParam.slice(8)
    return { browserToken: token || null, inviteToken: null }
  }

  try {
    const padded = startParam.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(padded)
    if (decoded.startsWith('/')) {
      const inviteToken = extractInviteTokenFromPath(decoded)
      return { browserToken: null, inviteToken }
    }
  } catch {
    // Not a base64url route token -> treat as invite token.
  }

  return { browserToken: null, inviteToken: startParam }
}

function extractInviteTokenFromPath(pathWithQuery) {
  if (typeof pathWithQuery !== 'string' || !pathWithQuery.startsWith('/')) {
    return null
  }

  const [pathname, query = ''] = pathWithQuery.split('?')
  if (!pathname.startsWith('/')) return null
  if (!query) return null

  try {
    const params = new URLSearchParams(query)
    const token = params.get('invite_token')
    return token ? token.trim() || null : null
  } catch {
    return null
  }
}

