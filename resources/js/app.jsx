import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import '../css/app.css'
import '@/i18n'

gsap.config({ nullTargetWarn: false })

// Debug beacon: ship uncaught client errors to the server log so mobile-only
// (iOS Telegram WebView) crashes are visible. Cheap, fire-and-forget.
function beaconError(kind, data) {
  try {
    const tg = window.Telegram?.WebApp
    const payload = JSON.stringify({
      kind,
      message: String(data?.message ?? data ?? '').slice(0, 1000),
      stack: data?.stack ? String(data.stack).slice(0, 2000) : null,
      url: location.href,
      ua: navigator.userAgent,
      tgver: tg?.version ?? null,
      platform: tg?.platform ?? null,
      build: window.__APP_BUILD_ID__ ?? null,
      t: new Date().toISOString(),
    })
    const url = '/api/v1/client-log'
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
    else fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
  } catch {}
}
try { window.__beaconError = beaconError } catch {}

// Guarded auto-reload. Telegram recreates a fresh WebView on each retry, which wipes
// sessionStorage — so a sessionStorage "reload once" guard resets every time and can
// loop forever (Telegram's own "failed to load" error every few seconds). Cap with
// localStorage (survives WebView recreation): at most 2 auto-reloads per 30s, then
// stop looping and show a manual recovery screen instead. Cleared on a good boot.
function safeReload() {
  try {
    const KEY = '__rm_reload_guard__'
    const now = Date.now()
    let rec = null
    try { rec = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { rec = null }
    if (!rec || (now - (rec.t || 0)) > 30000) rec = { n: 0, t: now }
    if (rec.n >= 2) {
      try { window.__showFatalScreen?.() } catch {}
      return
    }
    rec.n += 1
    try { localStorage.setItem(KEY, JSON.stringify(rec)) } catch {}
  } catch {}
  try { window.location.reload() } catch {}
}
try { window.__safeReload = safeReload } catch {}
try { window.__clearReloadGuard = () => { try { localStorage.removeItem('__rm_reload_guard__') } catch {} } } catch {}

// Lifecycle logging to the server beacon — so we can see EXACTLY what happens on a
// quick close+reopen ("white moment"). Low volume; temporary diagnostic.
let __seq = 0
function logLife(stage, extra) {
  try {
    __seq += 1
    const root = document.getElementById('app')
    beaconError('lifecycle', {
      message: '#' + __seq + ' ' + stage,
      stack: JSON.stringify({
        vis: document.visibilityState,
        root: root ? root.childElementCount : -1,
        splash: !!document.getElementById('boot-splash'),
        ...(extra || {}),
      }),
    })
  } catch {}
}
try { window.__logLife = logLife } catch {}
logLife('script-eval')

// Resume handling — intentionally minimal and SAFE. iOS sometimes doesn't repaint a
// foregrounded WebView, so we nudge a repaint. We NEVER touch the boot splash here
// (AuthGuard owns it — removing it during a fresh load caused the empty flash) and we
// reload ONLY if the screen is genuinely empty (no app content AND no splash).
function rmRepaint() {
  try {
    const el = document.documentElement
    el.style.transform = 'translateZ(0)'
    void document.body.offsetHeight
    requestAnimationFrame(() => { try { el.style.transform = '' } catch {} })
  } catch {}
}
function rmOnResume() {
  rmRepaint()
  setTimeout(() => {
    try {
      const root = document.getElementById('app')
      const empty = (!root || root.childElementCount === 0) && !document.getElementById('boot-splash')
      logLife('resume-check', { empty })
      if (empty) safeReload()
    } catch {}
  }, 1200)
}
try {
  window.addEventListener('pageshow', (e) => {
    logLife('pageshow', { persisted: !!(e && e.persisted) })
    if (e && e.persisted) { safeReload() }
  })
  document.addEventListener('visibilitychange', () => {
    logLife('visibility:' + document.visibilityState)
    if (document.visibilityState === 'visible') rmOnResume()
  })
} catch {}
try {
  window.addEventListener('error', (e) => beaconError('error', {
    message: e?.message,
    stack: e?.error?.stack ?? `${e?.filename ?? ''}:${e?.lineno ?? ''}:${e?.colno ?? ''}`,
  }))
  window.addEventListener('unhandledrejection', (e) => beaconError('unhandledrejection', {
    message: e?.reason?.message ?? String(e?.reason ?? 'unhandledrejection'),
    stack: e?.reason?.stack ?? null,
  }))
} catch {}

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
    // safeReload caps retries across WebView recreations, so a persistently failing
    // asset can't loop-reload forever — it falls back to the manual recovery screen.
    safeReload()
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
    try { window.__logLife?.('react-render') } catch {}
    try { window.Telegram?.WebApp?.ready?.() } catch {}
    // Last-resort watchdog: if React never paints anything into the root (hard crash
    // before any UI), don't leave the user staring at a blank screen — show reload.
    try {
      setTimeout(() => {
        try {
          if ((el?.childElementCount ?? 0) === 0) {
            try { document.getElementById('boot-splash')?.remove() } catch {}
            showFatalScreen()
          }
        } catch {}
      }, 12000)
    } catch {}
    // NOTE: the inline #boot-splash is the single loader and is removed by AuthGuard
    // only once auth has actually resolved (real readiness) — NOT here. Removing it
    // eagerly (before content paints) flashed a blank white screen on slow loads.
  },

  progress: {
    color: '#E2319B',
  },
})
