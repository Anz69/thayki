
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

export function getOrCreateDevTelegramId() {
  try {
    const stored = localStorage.getItem('__dev_tg_id')
    if (stored) return parseInt(stored, 10)
    const id = Math.floor(Math.random() * 900_000_000) + 100_000_000
    localStorage.setItem('__dev_tg_id', String(id))
    return id
  } catch {
    return 123456789
  }
}

export function buildDevInitData(telegramId, firstName = 'Dev', username) {
  const user = JSON.stringify({
    id: telegramId,
    first_name: firstName || 'Dev',
    last_name: 'User',
    username: username || `dev_${telegramId}`,
    language_code: 'ru',
    is_premium: false,
    allows_write_to_pm: true,
  })
  const authDate = Math.floor(Date.now() / 1000)
  const nonce = `${Date.now()}${Math.random().toString(36).slice(2, 10)}`
  return `auth_date=${authDate}&hash=devmode_${nonce}&user=${encodeURIComponent(user)}`
}

