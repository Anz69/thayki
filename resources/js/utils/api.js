import axios from 'axios'

/**
 * Centralised axios instance for the SPA.
 *
 * Notes
 * - `withCredentials: true` because the API uses Sanctum cookie session for the
 *   browser flow (TG widget login) and bearer token would need extra wiring.
 * - 25s timeout protects against hanging requests on flaky mobile networks.
 * - Request interceptor injects the CSRF token and unsets `Content-Type` for
 *   `FormData` so the browser can set the correct multipart boundary itself.
 * - Response interceptor reacts to 401 by flipping the auth store into the
 *   "needs login" state — this triggers the AuthGuard redirect to /login.
 */
const api = axios.create({
  baseURL:         '/api/v1',
  withCredentials: true,
  timeout:         25_000,
  headers: {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (csrf) config.headers['X-CSRF-TOKEN'] = csrf

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

// ─────────────────────────────────────────────────────────────────────────────
// Auth store wiring
// ─────────────────────────────────────────────────────────────────────────────
// We can't import useAuthStore at the top level because that store imports
// this `api` module itself → cycle. Instead we lazily resolve the store on the
// first invocation that needs it and cache the reference.
//
// Until the dynamic import resolves, 401 handling falls back to a "pending"
// queue so the very first 401 isn't lost.

let _authStore = null
let _pending401 = false

const resolveAuthStore = () => {
  if (_authStore) return Promise.resolve(_authStore)
  return import('@/stores/useAuthStore').then((m) => {
    _authStore = m.default
    if (_pending401 && _authStore) {
      _pending401 = false
      try {
        const state = _authStore.getState()
        if (state.user !== null) state.setNeedsLogin()
      } catch {}
    }
    return _authStore
  })
}

// kick off the import immediately so the store is ready before the first call
resolveAuthStore().catch(() => { /* will retry on next 401 */ })

const handleUnauthenticated = () => {
  if (_authStore) {
    try {
      const state = _authStore.getState()
      if (state.user !== null) state.setNeedsLogin()
    } catch {}
    return
  }
  // Store not yet imported — remember to flip on resolution.
  _pending401 = true
  resolveAuthStore().catch(() => {})
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize timeout errors so callers can show a friendly message.
    if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error') {
      error.isNetworkError = true
      if (!error.userMessage) {
        error.userMessage = error?.code === 'ECONNABORTED'
          ? 'Сервер не отвечает. Проверьте интернет.'
          : 'Нет соединения с сервером.'
      }
    }

    const status = error?.response?.status
    if (status === 401) {
      handleUnauthenticated()
    }

    // 419 = Laravel CSRF token mismatch (session expired). Treat like 401 so the
    // user is redirected to /login and forced to re-authenticate.
    if (status === 419) {
      handleUnauthenticated()
    }

    return Promise.reject(error)
  },
)

/**
 * Convenience helper for surfacing a human-readable error message from any
 * axios error (validation, network, generic 500, etc.).
 */
export function extractErrorMessage(err, fallback = 'Что-то пошло не так') {
  if (!err) return fallback
  if (err.userMessage) return err.userMessage
  const data = err.response?.data
  if (typeof data === 'string') return data
  if (data?.message) return data.message
  if (data?.error)   return data.error
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat?.()[0]
    if (first) return String(first)
  }
  if (err.message && err.message !== 'Network Error') return err.message
  return fallback
}

export default api
