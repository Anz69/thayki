import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import RouterShell from '@/RouterShell'
import useAuthStore from '@/stores/useAuthStore'
import useMeetingStore from '@/stores/useMeetingStore'
import api, { getStoredToken, clearToken } from '@/utils/api'

/**
 * Single Inertia page — the React app shell.
 *
 * Auth priority (highest → lowest):
 * 1. Laravel session in Inertia shared props (HandleInertiaRequests sets auth.user)
 * 2. Stored Sanctum Bearer token in localStorage  → verified via GET /api/v1/auth/me
 * 3. Telegram Mini App initData               → POST /api/v1/auth/telegram (returns token)
 * 4. No auth context available               → redirect to /login
 *
 * Using token-based auth (not session) ensures the Mini App works regardless
 * of the SANCTUM_STATEFUL_DOMAINS configuration on the server.
 */
export default function App() {
  const { auth }     = usePage().props
  const authStore    = useAuthStore()
  const meetingStore = useMeetingStore()

  useEffect(() => {
    // ── 1. Laravel session already active (Inertia shared props) ──────────
    if (auth?.user) {
      authStore.setUser(auth.user)
      meetingStore.loadLatest()
      return
    }

    // ── Show loader while we determine auth state ───────────────────────
    authStore.setAuthPending()

    async function resolveAuth() {
      // ── 2. Try stored Sanctum token ──────────────────────────────────
      const storedToken = getStoredToken()
      if (storedToken) {
        try {
          const { data } = await api.get('/auth/me')
          const user = data?.data
          if (user) {
            authStore.setUser(user)
            meetingStore.loadLatest()
            return
          }
        } catch {
          // 401 or network error — token is invalid/expired, clear it
        }
        clearToken()
      }

      // ── 3. Telegram Mini App initData ────────────────────────────────
      const tg       = window.Telegram?.WebApp
      const initData = tg?.initData

      if (initData) {
        // If opened via browser deep-link (?start=browser_TOKEN), pass the
        // token so the backend can mark the browser tab as authenticated.
        const startParam   = tg?.initDataUnsafe?.start_param ?? ''
        const browserToken = startParam.startsWith('browser_') ? startParam.slice(8) : null

        try {
          // Use api (axios) instead of fetch so the CSRF token interceptor fires.
          // Without it, Sanctum rejects the request with 419 when the domain is
          // listed in SANCTUM_STATEFUL_DOMAINS.
          const { data } = await api.post('/auth/telegram', {
            init_data: initData,
            ...(browserToken ? { browser_token: browserToken } : {}),
          })

          if (data.ok && data.data?.token && data.data?.user) {
            authStore.setUser(data.data.user, data.data.token)
            meetingStore.loadLatest()
            return
          }
        } catch { /* network or validation error */ }

        authStore.setNeedsLogin()
        return
      }

      // ── 4. Plain browser — no Telegram context ───────────────────────
      authStore.setNeedsLogin()
    }

    resolveAuth().catch(() => authStore.setNeedsLogin())
  }, [])

  return <RouterShell />
}
