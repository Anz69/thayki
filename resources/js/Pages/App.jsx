import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import RouterShell from '@/RouterShell'
import useAuthStore from '@/stores/useAuthStore'
import api, { getStoredToken, clearToken, getStoredAuthUid, storeAuthUid } from '@/utils/api'
import { logWarn } from '@/utils/logger'
import { parseTelegramStartParam, buildDevInitData, getOrCreateDevTelegramId } from '@/utils/telegramAuth'
import { lockTelegramVerticalSwipes } from '@/utils/modalLocks'

export default function App() {
  const { auth, appEnv } = usePage().props
  const authStore    = useAuthStore()

  useEffect(() => {
    let cancelled = false
    // The Telegram SDK is deferred (so it doesn't render-block the splash) — wait
    // briefly for it before reading initData, so auth never starts before
    // window.Telegram.WebApp exists.
    const waitForTelegram = (timeoutMs = 1500) => new Promise((resolve) => {
      if (window.Telegram?.WebApp) { resolve(); return }
      const start = Date.now()
      const id = setInterval(() => {
        if (window.Telegram?.WebApp || Date.now() - start > timeoutMs) { clearInterval(id); resolve() }
      }, 30)
    })

    authStore.setAuthPending()

    async function resolveAuth() {
      const tg       = window.Telegram?.WebApp
      const initData = tg?.initData
      const currentTgId = tg?.initDataUnsafe?.user?.id ?? null

      const storedToken = getStoredToken()
      const storedUid = getStoredAuthUid()
      // Only trust a stored token if it was issued for the Telegram account that is
      // open right now. Otherwise a second account opened in the same WebView would
      // resume the first account's session (its verification, chats, etc.).
      const accountMatches = currentTgId == null || storedUid == null || storedUid === String(currentTgId)
      if (storedToken && accountMatches) {
        try {
          // Resume the session, but re-sync the profile from the live initData so a
          // changed Telegram username/name/photo propagates (the login action that
          // normally refreshes these is skipped on the stored-token fast path).
          const { data } = initData
            ? await api.post('/auth/sync', { init_data: initData })
            : await api.get('/auth/me')
          const user = data?.data
          if (user) {
            authStore.setUser(user)
            storeAuthUid(currentTgId)
            return
          }
        } catch {
        }
        clearToken()
      } else if (storedToken) {
        clearToken()
      }

      if (initData) {
        const startParam   = tg?.initDataUnsafe?.start_param ?? ''
        const { browserToken, inviteToken } = parseTelegramStartParam(startParam)
        const payload = {
          init_data: initData,
          ...(browserToken ? { browser_token: browserToken } : {}),
          ...(inviteToken  ? { invite_token:  inviteToken  } : {}),
        }

        // Boot login is a POST, so the global retry interceptor skips it. Retry transient
        // network/5xx failures here so a momentary connection blip (common when opening from a
        // notification) doesn't dead-end on a blank/error screen.
        for (let attempt = 0; ; attempt++) {
          try {
            const { data } = await api.post('/auth/telegram', payload, { timeout: 12000 })

            if (data.ok && data.data?.token && data.data?.user) {
              authStore.setUser(data.data.user, data.data.token)
              storeAuthUid(currentTgId)
              return
            }
            authStore.setNeedsLogin(null, { step: 'POST /auth/telegram', message: 'Ответ сервера не содержал токен' })
            return
          } catch (err) {
            const status = err?.response?.status ?? null
            const code = err?.response?.data?.error?.code
            if (code === 'USER_BANNED') {
              authStore.setBanned()
              return
            }
            const transient = !err?.response || (status >= 500 && status <= 599)
            if (transient && attempt < 3) {
              await new Promise((res) => setTimeout(res, 800 * (attempt + 1)))
              continue
            }
            logWarn('[App auth] /auth/telegram failed', {
              hasInitData: !!initData,
              hasBrowserToken: !!browserToken,
              hasInviteToken: !!inviteToken,
              attempt,
              error: err?.message,
            })
            const detail = {
              step: 'POST /auth/telegram',
              status,
              code: code ?? null,
              message: err?.response?.data?.error?.message ?? err?.message ?? null,
              hasBrowserToken: !!browserToken,
              hasInviteToken: !!inviteToken,
            }
            authStore.setNeedsLogin('Telegram вернул ошибку авторизации. Попробуйте перезагрузить через несколько секунд.', detail)
            return
          }
        }
      }

      if (appEnv === 'local') {
        try {
          const devId = getOrCreateDevTelegramId()
          const { data } = await api.post('/auth/telegram', {
            init_data: buildDevInitData(devId),
          })
          if (data.ok && data.data?.token && data.data?.user) {
            authStore.setUser(data.data.user, data.data.token)
            storeAuthUid(devId)
            return
          }
        } catch (err) {
          logWarn('[App auth] dev login failed', { error: err?.message })
        }
      }

      authStore.setNeedsLogin('Не удалось получить данные авторизации из Telegram.', { step: 'initData check', message: 'window.Telegram.WebApp.initData отсутствует' })
    }

    // Boot watchdog: a request that never settles (zombie connection, common when
    // cold-opening from a notification) would leave authPending stuck forever — an
    // endless blank/spinner screen. Cap the boot so the user always gets a reload
    // screen instead of a dead app. Cleared as soon as auth resolves either way.
    const watchdog = setTimeout(() => {
      const s = useAuthStore.getState()
      if (!s.user && !s.isBanned && !s.needsLogin) {
        s.setNeedsLogin('Не удалось загрузить приложение. Попробуйте перезагрузить.', { step: 'boot watchdog' })
      }
    }, 20000)

    ;(async () => {
      await waitForTelegram()
      if (cancelled) return
      try { window.Telegram?.WebApp?.expand?.() } catch {}
      // Permanent baseline: disable Telegram's vertical-swipe gesture so scrolling the
      // page down doesn't trigger swipe-to-minimize (which restores the WebView in a
      // broken/blank state). Never unlocked — modals add/remove on top of this depth.
      try { lockTelegramVerticalSwipes() } catch {}

      if (auth?.user) {
        authStore.setUser(auth.user)
        // The server-shared session user can be stale (changed Telegram username);
        // refresh from live initData. Best-effort.
        const initData = window.Telegram?.WebApp?.initData
        if (initData) {
          api.post('/auth/sync', { init_data: initData })
            .then(({ data }) => { if (!cancelled && data?.data) authStore.setUser(data.data) })
            .catch(() => {})
        }
        clearTimeout(watchdog)
        return
      }

      await resolveAuth().catch(() => authStore.setNeedsLogin())
      clearTimeout(watchdog)
    })()

    return () => { cancelled = true; clearTimeout(watchdog) }
  }, [])

  return <RouterShell />
}
