import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import '../css/app.css'
import '@/i18n'

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

function showFatalScreen() {
  try {
    const wrap = document.createElement('div')
    wrap.setAttribute('style', 'position:fixed;inset:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;z-index:2147483647')
    const emoji = document.createElement('div')
    emoji.setAttribute('style', 'font-size:42px')
    emoji.textContent = '😕'
    const title = document.createElement('div')
    title.setAttribute('style', 'color:#111;font-size:17px;font-weight:600')
    title.textContent = 'Не удалось загрузить приложение'
    const sub = document.createElement('div')
    sub.setAttribute('style', 'color:#888;font-size:14px;line-height:1.5;max-width:280px')
    sub.textContent = 'Проверьте интернет-соединение и попробуйте ещё раз.'
    const btn = document.createElement('button')
    btn.setAttribute('style', 'margin-top:6px;padding:14px 28px;border:none;border-radius:9999px;background:#E2319B;color:#fff;font-size:15px;font-weight:600')
    btn.textContent = 'Перезагрузить'
    btn.addEventListener('click', () => { try { sessionStorage.clear() } catch {} window.location.reload() })
    wrap.append(emoji, title, sub, btn)
    document.body.appendChild(wrap)
  } catch {}
}
try { window.__showFatalScreen = showFatalScreen } catch {}

try {
  window.addEventListener('vite:preloadError', (event) => {
    event?.preventDefault?.()
    try {
      const buildId = String(window.__APP_BUILD_ID__ ?? 'unknown')
      const key = `__chunk_reload_once__:${buildId}`
      const alreadyReloaded = sessionStorage.getItem(key) === '1'
      // Already retried once and chunks still fail → don't loop-reload into a blank
      // screen; show an explicit reload/offline screen instead.
      if (alreadyReloaded) { showFatalScreen(); return }
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

function requestTelegramWriteAccess() {
  const KEY = '__tg_write_access_granted__'

  const pingBackend = (attempt = 0) => {
    let token = null
    try { token = localStorage.getItem('_tg_auth_token') } catch {}
    if (!token) { if (attempt < 20) setTimeout(() => pingBackend(attempt + 1), 600); return }
    fetch('/api/v1/auth/write-access', {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }

  let asked = false

  const tryAsk = () => {
    if (asked) return true
    const tg = window.Telegram?.WebApp
    const u = tg?.initDataUnsafe?.user
    if (!tg || !u) return false
    try { tg.ready() } catch {}

    if (u.allows_write_to_pm === true || localStorage.getItem(KEY) === '1') {
      asked = true
      pingBackend()
      return true
    }
    if (typeof tg.requestWriteAccess !== 'function') { asked = true; return true }

    asked = true
    try {
      tg.requestWriteAccess((granted) => {
        if (!granted) return
        try { localStorage.setItem(KEY, '1') } catch {}
        pingBackend()
      })
    } catch { }
    return true
  }

  let tries = 0
  const poll = () => { if (tryAsk()) return; if (tries++ < 30) setTimeout(poll, 300) }
  setTimeout(poll, 800)

  const onGesture = () => {
    if (tryAsk() && asked) {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('touchstart', onGesture)
    }
  }
  window.addEventListener('pointerdown', onGesture, { passive: true })
  window.addEventListener('touchstart', onGesture, { passive: true })
}

try { requestTelegramWriteAccess() } catch {}

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
    return pages[`./Pages/${name}.jsx`]
  },

  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
    try { window.Telegram?.WebApp?.ready?.() } catch {}
    // React has taken over — fade out the inline boot splash.
    requestAnimationFrame(() => {
      const sp = document.getElementById('boot-splash')
      if (sp) { sp.style.opacity = '0'; setTimeout(() => { try { sp.remove() } catch {} }, 280) }
    })
  },

  progress: {
    color: '#E2319B',
  },
})
