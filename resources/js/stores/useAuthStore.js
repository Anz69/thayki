import { create } from 'zustand'
import api from '@/utils/api'

/**
 * Reset every other domain store back to a clean slate. Called on logout / 401
 * so the next user (or guest session) does not see leftover data.
 *
 * Imports are dynamic on purpose:
 *   - avoids a circular dependency with useProfileStore (which imports
 *     useAuthStore for refreshUser);
 *   - keeps the cold-start bundle small.
 *
 * Errors are swallowed individually so one missing store does not break the
 * whole logout flow.
 */
async function resetDependentStores() {
  const stores = await Promise.all([
    import('@/stores/useMeetingStore').catch(() => null),
    import('@/stores/useBookingStore').catch(() => null),
    import('@/stores/useProfileStore').catch(() => null),
    import('@/stores/useModelMeetingStore').catch(() => null),
    import('@/stores/usePhotoViewerStore').catch(() => null),
  ])
  for (const m of stores) {
    try { m?.default?.getState?.().reset?.() } catch { /* noop */ }
  }
}

const useAuthStore = create((set, get) => ({
  user:        null,
  /** true = not in TG Mini App and no session → must go to /login */
  needsLogin:  false,
  /** true = currently waiting for TG initData auth to resolve */
  authPending: false,

  setUser:        (user)  => set({ user, needsLogin: false, authPending: false }),
  setNeedsLogin:  ()      => {
    set({ user: null, needsLogin: true, authPending: false })
    resetDependentStores()
  },
  setAuthPending: ()      => set({ authPending: true }),
  clear:          ()      => {
    set({ user: null, needsLogin: false, authPending: false })
    resetDependentStores()
  },

  /**
   * Hit /auth/logout to invalidate the Sanctum token / session, then wipe local
   * state. Network failures are tolerated — local state is still cleared so the
   * user is not stuck "logged in" if the server is unreachable.
   */
  logout: async () => {
    try { await api.post('/auth/logout') } catch { /* noop */ }
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

  /** Display name derived from first_name / name / username */
  displayName: () => {
    const u = get().user
    if (!u) return ''
    if (u.first_name) return [u.first_name, u.last_name].filter(Boolean).join(' ')
    return u.name ?? u.username ?? ''
  },
}))

export default useAuthStore
