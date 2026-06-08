import { create } from 'zustand'
import api, { storeToken, clearToken } from '@/utils/api'
import i18n from '@/i18n'

const SUPPORTED_LANGS = ['ru', 'en']

// The bot stores the user's chosen language server-side. Treat the server as the
// source of truth on load so the mini app opens in the language picked in the
// bot — not the Telegram client language. (In-app changes go through
// setLanguage, which also PATCHes /me, so the server stays in sync.)
function syncLanguageFromUser(user) {
  const code = (user?.language_code || '').slice(0, 2).toLowerCase()

  // Server already knows the user's language → adopt it (source of truth) so the
  // mini app AND Telegram notifications speak the same language.
  if (SUPPORTED_LANGS.includes(code)) {
    if (i18n.language !== code) {
      i18n.changeLanguage(code)
      try { localStorage.setItem('lang', code) } catch {}
    }
    return
  }

  // Server has NO language stored yet → push the client's current UI language so
  // notifications (built server-side) match what the user actually sees.
  const current = (i18n.language || 'ru').slice(0, 2).toLowerCase()
  const lang = SUPPORTED_LANGS.includes(current) ? current : 'ru'
  import('@/utils/api')
    .then(({ default: api }) => api.patch('/me', { language_code: lang }))
    .catch(() => {})
}

async function resetDependentStores() {
  const stores = await Promise.all([
    import('@/stores/useMeetingStore').catch(() => null),
    import('@/stores/useBookingStore').catch(() => null),
    import('@/stores/useProfileStore').catch(() => null),
    import('@/stores/useModelMeetingStore').catch(() => null),
    import('@/stores/usePhotoViewerStore').catch(() => null),
  ])
  for (const m of stores) {
    try { m?.default?.getState?.().reset?.() } catch {}
  }
}

const useAuthStore = create((set, get) => ({
  user:            null,
  needsLogin:      false,
  authPending:     true,  // true until first auth resolution — prevents unauth flash
  isBanned:        false,
  authErrorHint:   null,
  authErrorDetail: null,

  setUser: (user, token) => {
    if (token) storeToken(token)
    syncLanguageFromUser(user)
    set({ user, needsLogin: false, authPending: false, isBanned: false, authErrorHint: null, authErrorDetail: null })
  },

  setNeedsLogin: (hint = null, detail = null) => {
    clearToken()
    set({ user: null, needsLogin: true, authPending: false, isBanned: false, authErrorHint: hint, authErrorDetail: detail })
    resetDependentStores()
  },

  setBanned: () => {
    clearToken()
    set({ user: null, needsLogin: false, authPending: false, isBanned: true, authErrorHint: null, authErrorDetail: null })
    resetDependentStores()
  },

  setAuthPending: () => set({ authPending: true }),
  clear: () => {
    clearToken()
    set({ user: null, needsLogin: false, authPending: false, isBanned: false, authErrorHint: null })
    resetDependentStores()
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    clearToken()
    set({ user: null, needsLogin: true, authPending: false })
    await resetDependentStores()
  },

  refreshUser: async () => {
    const res = await api.get('/auth/me')
    const user = res.data?.data ?? null
    if (user) { syncLanguageFromUser(user); set({ user }) }
    return user
  },

  isAuthenticated: () => get().user !== null,
  isModel:   () => get().user?.role === 'model',
  isClient:  () => get().user?.role === 'client',
  isAdmin:   () => get().user?.role === 'admin',
  isManager: () => get().user?.role === 'manager',

  displayName: () => {
    const u = get().user
    if (!u) return ''
    if (u.first_name) return [u.first_name, u.last_name].filter(Boolean).join(' ')
    return u.name ?? u.username ?? ''
  },
}))

export default useAuthStore
