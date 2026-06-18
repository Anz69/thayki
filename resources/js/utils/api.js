import axios from 'axios'
import i18n from '@/i18n'

const api = axios.create({
  baseURL:         '/api/v1',
  withCredentials: true,
  timeout:         25_000,
  headers: {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  },
})

const TOKEN_KEY = '_tg_auth_token'
const AUTH_UID_KEY = '_tg_auth_uid'

export function storeToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token) } catch {}
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(AUTH_UID_KEY) } catch {}
}
export function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function storeAuthUid(uid) {
  try { if (uid != null) localStorage.setItem(AUTH_UID_KEY, String(uid)) } catch {}
}
export function getStoredAuthUid() {
  try { return localStorage.getItem(AUTH_UID_KEY) } catch { return null }
}

api.interceptors.request.use((config) => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (csrf) config.headers['X-CSRF-TOKEN'] = csrf

  const token = getStoredToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

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

resolveAuthStore().catch(() => {})

const handleUnauthenticated = () => {
  if (_authStore) {
    try {
      const state = _authStore.getState()
      if (state.user !== null) state.setNeedsLogin()
    } catch {}
    return
  }
  _pending401 = true
  resolveAuthStore().catch(() => {})
}

const MAX_RETRIES = 3
const RETRY_BASE_MS = 600

function isNetworkFailure(error) {
  return error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || !error?.response
}

function isRetryable(error) {
  const cfg = error?.config
  if (!cfg) return false
  const method = (cfg.method || 'get').toLowerCase()
  const status = error?.response?.status
  const safeMethod = method === 'get' || method === 'head' || method === 'options'
  const headers = cfg.headers || {}
  const hasIdempotency = !!(headers['Idempotency-Key'] || headers['idempotency-key'])
  const failed = isNetworkFailure(error) || (status >= 500 && status <= 599)
  return failed && (safeMethod || hasIdempotency)
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    if (status === 401 || status === 419) {
      handleUnauthenticated()
      return Promise.reject(error)
    }

    const cfg = error?.config
    if (cfg && isRetryable(error)) {
      cfg.__retryCount = (cfg.__retryCount || 0) + 1
      if (cfg.__retryCount <= MAX_RETRIES) {
        const delay = RETRY_BASE_MS * 2 ** (cfg.__retryCount - 1) + Math.floor(Math.random() * 250)
        await new Promise((res) => setTimeout(res, delay))
        return api(cfg)
      }
    }

    if (isNetworkFailure(error)) {
      error.isNetworkError = true
      if (!error.userMessage) {
        const exhausted = (cfg?.__retryCount || 0) >= MAX_RETRIES
        error.userMessage = exhausted
          ? i18n.t('net.offline')
          : (error?.code === 'ECONNABORTED' ? i18n.t('net.noResponse') : i18n.t('net.noConnection'))
      }
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(err, fallback = i18n.t('common.somethingWrong')) {
  if (!err) return fallback
  if (err.userMessage) return err.userMessage
  const data = err.response?.data
  if (typeof data === 'string') return data
  if (data?.message) return data.message
  if (data?.error) {
    if (typeof data.error === 'string') return data.error
    if (data.error?.message) return data.error.message
  }
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat?.()[0]
    if (first) return String(first)
  }
  if (err.message && err.message !== 'Network Error') return err.message
  return fallback
}

export default api
