import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import '../css/app.css'
import '@/i18n'

// Silence "GSAP target null not found" warnings that appear when refs point
// to conditionally-rendered elements. GSAP already handles null gracefully
// (skips the tween); this just removes the console noise.
gsap.config({ nullTargetWarn: false })

function resolveBuildId() {
  try {
    const explicit = import.meta.env.VITE_APP_BUILD_ID
    if (typeof explicit === 'string' && explicit) return explicit
  } catch {}
  try {
    const script = document.querySelector('script[src*="/build/assets/app-"]')
    const src = script?.getAttribute('src') ?? ''
    const match = src.match(/app-([^.]+)\.js$/)
    if (match?.[1]) return match[1]
  } catch {}
  return 'unknown'
}

try {
  window.__APP_BUILD_ID__ = resolveBuildId()
} catch {}

try {
  window.addEventListener('vite:preloadError', (event) => {
    event?.preventDefault?.()
    try {
      const buildId = String(window.__APP_BUILD_ID__ ?? 'unknown')
      const key = `__chunk_reload_once__:${buildId}`
      const alreadyReloaded = sessionStorage.getItem(key) === '1'
      if (alreadyReloaded) return
      sessionStorage.setItem(key, '1')
    } catch {}
    window.location.reload()
  })
} catch {}

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

// Users who open the app via a friend's deep link skip /start, so the bot has no
// permission to message them. Ask for write access once on launch (Telegram shows
// a native prompt); remember once granted so we don't nag.
try {
  const tg = window.Telegram?.WebApp
  const KEY = '__tg_write_access_granted__'
  if (tg?.requestWriteAccess && localStorage.getItem(KEY) !== '1') {
    setTimeout(() => {
      try {
        tg.requestWriteAccess((granted) => {
          if (granted) { try { localStorage.setItem(KEY, '1') } catch {} }
        })
      } catch {}
    }, 900)
  }
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
