import { create } from 'zustand'
import api, { storeToken, clearToken } from '@/utils/api'

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
  user:          null,
  needsLogin:    false,
  authPending:   false,
  isBanned:      false,
  authErrorHint: null,

  setUser: (user, token) => {
    if (token) storeToken(token)
    set({ user, needsLogin: false, authPending: false, isBanned: false, authErrorHint: null })
  },

  setNeedsLogin: (hint = null) => {
    clearToken()
    set({ user: null, needsLogin: true, authPending: false, isBanned: false, authErrorHint: hint })
    resetDependentStores()
  },

  setBanned: () => {
    clearToken()
    set({ user: null, needsLogin: false, authPending: false, isBanned: true, authErrorHint: null })
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
    try {
      const res = await api.get('/auth/me')
      const user = res.data?.data
      if (user) set({ user })
    } catch {}
  },

  isAuthenticated: () => get().user !== null,
  isModel:  () => get().user?.role === 'model',
  isClient: () => get().user?.role === 'client',
  isAdmin:  () => get().user?.role === 'admin',

  displayName: () => {
    const u = get().user
    if (!u) return ''
    if (u.first_name) return [u.first_name, u.last_name].filter(Boolean).join(' ')
    return u.name ?? u.username ?? ''
  },
}))

export default useAuthStore
