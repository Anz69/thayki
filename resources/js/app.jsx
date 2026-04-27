import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import '../css/app.css'

// ────────────────────────────────────────────────────────────────────────
// Telegram Mini App deep-link handling.
//
// Bot notifications attach an inline button whose URL is
//   https://t.me/<bot>/<app>?startapp=<base64url(/some/path?args)>
// Telegram opens the Mini App and exposes that base64url string both as
// `Telegram.WebApp.initDataUnsafe.start_param` and as the
// `tgWebAppStartParam` fragment in window.location.hash.
//
// Two distinct scenarios we have to handle:
//
//   COLD open  — Mini App is not running yet. Telegram launches the
//      webview, our entry script runs, we decode start_param and rewrite
//      the URL via replaceState BEFORE React mounts → BrowserRouter sees
//      the right path on first render, no flicker.
//
//   WARM open — Mini App is already running. The user taps a NEW
//      notification button and Telegram brings the existing webview to
//      front. Our script does NOT re-execute, but Telegram updates
//      `tgWebAppStartParam` in the URL hash. We listen on `hashchange`
//      (and on Telegram's `viewportChanged` event), re-read the value,
//      decode, pushState + dispatch popstate so React Router transitions
//      to the new page without reload.
//
// Without the warm path, clicking a second notification while the Mini App
// is alive silently does nothing — which produced the "always opens the
// first booking" / "opens chat with the wrong user" bugs.
//
// Plain-browser fallback: when the bot was configured with a non-t.me URL,
// the deep-link encodes the path as `#/some/path?args`. We mirror that.
//
// Edge cases:
//   - `browser_<token>` (browser-tab auth flow) is NOT a deep link; skip.
//   - Anything that doesn't decode to a /-prefixed path is treated as junk.
// ────────────────────────────────────────────────────────────────────────

function readTelegramStartParam() {
  const sdkValue = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  if (typeof sdkValue === 'string' && sdkValue !== '') return sdkValue
  // Fallback: parse the URL hash directly. Telegram updates
  // `tgWebAppStartParam` here on every Mini App open, including warm opens
  // where the SDK's cached `initDataUnsafe.start_param` is stale.
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

// Idempotency guard — if Telegram fires both `hashchange` and
// `viewportChanged` for the same warm open, we only act once.
let lastHandledStartParam = ''

function applyDeepLink(via /* 'cold' | 'warm' */) {
  const sp = readTelegramStartParam()
  if (!sp || sp === lastHandledStartParam) return
  const path = decodeStartParamPath(sp)
  if (!path) return

  lastHandledStartParam = sp

  if (via === 'cold') {
    // Pre-mount: replace so back button doesn't loop to "/".
    window.history.replaceState({}, '', path)
  } else {
    // Post-mount: push so swipe-back goes where the user came from, then
    // dispatch popstate so React Router actually re-renders.
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

try {
  // 1) Cold open via start_param.
  applyDeepLink('cold')

  // 2) Plain-browser fallback for non-t.me deploys: hash like "#/path".
  if (lastHandledStartParam === '' && window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1)
    if (typeof hashPath === 'string' && hashPath.startsWith('/')) {
      window.history.replaceState({}, '', hashPath)
    }
  }
} catch { /* never break first paint over a deep-link parse */ }

// 3) Warm open — user clicked another deep-link while Mini App was alive.
window.addEventListener('hashchange', () => applyDeepLink('warm'))

// 4) Belt-and-braces: some Telegram clients fire `viewportChanged` when
//    the WebApp is brought back to front. applyDeepLink is idempotent
//    via lastHandledStartParam so calling it again is free.
try {
  window.Telegram?.WebApp?.onEvent?.('viewportChanged', () => applyDeepLink('warm'))
} catch { /* SDK may not expose onEvent on older clients */ }

createInertiaApp({
  // Resolve component from Pages/ directory
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
    return pages[`./Pages/${name}.jsx`]
  },

  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },

  // Show progress bar during Inertia navigations (not used here since React Router handles nav,
  // but keeping it for any future Inertia-managed pages)
  progress: {
    color: '#E2319B',
  },
})
