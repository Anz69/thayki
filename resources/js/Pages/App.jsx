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
    if (auth?.user) {
      authStore.setUser(auth.user)
      meetingStore.loadLatest()
      return
    }

    authStore.setAuthPending()

    async function resolveAuth() {
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
        }
        clearToken()
      }

      const tg       = window.Telegram?.WebApp
      const initData = tg?.initData

      if (initData) {
        const startParam   = tg?.initDataUnsafe?.start_param ?? ''
        const browserToken = startParam.startsWith('browser_') ? startParam.slice(8) : null

        let inviteToken = null
        if (!browserToken && startParam !== '') {
          try {
            const padded  = startParam.replace(/-/g, '+').replace(/_/g, '/')
            const decoded = atob(padded)
            if (!decoded.startsWith('/')) inviteToken = startParam
          } catch {
            inviteToken = startParam
          }
        }

        try {
          const { data } = await api.post('/auth/telegram', {
            init_data: initData,
            ...(browserToken ? { browser_token: browserToken } : {}),
            ...(inviteToken  ? { invite_token:  inviteToken  } : {}),
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

      authStore.setNeedsLogin()
    }

    resolveAuth().catch(() => authStore.setNeedsLogin())
  }, [])

  return <RouterShell />
}
