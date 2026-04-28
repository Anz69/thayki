
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
      return { browserToken: null, inviteToken: null }
    }
  } catch {
    // Not a base64url route token -> treat as invite token.
  }

  return { browserToken: null, inviteToken: startParam }
}

