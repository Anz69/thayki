import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import '../css/app.css'

function readTelegramStartParam() {
  const sdkValue = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  if (typeof sdkValue === 'string' && sdkValue !== '') return sdkValue
  const hash = (window.location.hash || '').replace(/^#/, '')
  if (!hash) return ''
  try {
    return new URLSearchParams(hash).get('tgWebAppStartParam') ?? ''
  } catch {
    return ''
  }
}

function decodeStartParamPath(sp) {
  if (typeof sp !== 'string' || sp === '' || sp.startsWith('browser_')) return null
  try {
    const padded = sp.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(padded)
    return decoded.startsWith('/') ? decoded : null
  } catch {
    return null
  }
}

let lastHandledStartParam = ''

function applyDeepLink(via) {
  const sp = readTelegramStartParam()
  if (!sp || sp === lastHandledStartParam) return
  const path = decodeStartParamPath(sp)
  if (!path) return

  lastHandledStartParam = sp

  if (via === 'cold') {
    window.history.replaceState({}, '', path)
  } else {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

try {
  applyDeepLink('cold')

  if (lastHandledStartParam === '' && window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1)
    if (typeof hashPath === 'string' && hashPath.startsWith('/')) {
      window.history.replaceState({}, '', hashPath)
    }
  }
} catch {}

window.addEventListener('hashchange', () => applyDeepLink('warm'))

try {
  window.Telegram?.WebApp?.onEvent?.('viewportChanged', () => applyDeepLink('warm'))
} catch {}

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
    return pages[`./Pages/${name}.jsx`]
  },

  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },

  progress: {
    color: '#E2319B',
  },
})
