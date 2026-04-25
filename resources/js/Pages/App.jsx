import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import RouterShell from '@/RouterShell'
import useAuthStore from '@/stores/useAuthStore'
import useMeetingStore from '@/stores/useMeetingStore'

/**
 * Single Inertia page — the React app shell.
 *
 * Responsibilities:
 * 1. Pull auth.user from Inertia shared props (HandleInertiaRequests)
 * 2. If no session → attempt Telegram WebApp initData auth
 * 3. If no Telegram context (plain browser) → set needsLogin flag
 * 4. After auth resolves → load latest meeting into store
 */
export default function App() {
  const { auth }   = usePage().props
  const authStore  = useAuthStore()
  const meetingStore = useMeetingStore()

  useEffect(() => {
    // Already authenticated via Laravel session (Inertia shared props)
    if (auth?.user) {
      authStore.setUser(auth.user)
      // Pre-load meeting so BottomNav knows if an active meeting exists
      meetingStore.loadLatest()
      return
    }

    // Try Telegram Mini App auto-auth
    const tg       = window.Telegram?.WebApp
    const initData = tg?.initData

    if (initData) {
      authStore.setAuthPending()
      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''

      // If opened via browser deep-link (?start=browser_TOKEN), pass the token
      // so the backend can mark it as authenticated for the polling browser tab.
      const startParam  = tg?.initDataUnsafe?.start_param ?? ''
      const browserToken = startParam.startsWith('browser_') ? startParam.slice(8) : null

      fetch('/auth/telegram', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
        credentials: 'same-origin',
        body:        JSON.stringify({
          init_data: initData,
          ...(browserToken ? { browser_token: browserToken } : {}),
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.user) {
            authStore.setUser(data.user)
            meetingStore.loadLatest()
          } else {
            authStore.setNeedsLogin()
          }
        })
        .catch(() => authStore.setNeedsLogin())
      return
    }

    // Plain browser — no Telegram context → show login page
    authStore.setNeedsLogin()
  }, [])

  return <RouterShell />
}
