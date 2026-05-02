import axios from 'axios'

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

export function storeToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token) } catch {}
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}
export function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
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

    if (status === 419) {
      handleUnauthenticated()
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(err, fallback = 'Что-то пошло не так') {
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
