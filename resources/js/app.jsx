import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import '../css/app.css'

// ────────────────────────────────────────────────────────────────────────
// Telegram Mini App deep-link handling.
// Bot notifications attach an inline button whose URL is
//   https://t.me/<bot>/<app>?startapp=<base64url(/some/path?args)>
// Telegram opens the Mini App and exposes that base64 string as
// `Telegram.WebApp.initDataUnsafe.start_param`.
//
// Plain web URL fallback: if the bot was configured with a non-t.me URL,
// the deep-link encodes the in-app path as `#/some/path?args`. We mirror
// that here too so a regular browser tab opened from the bot button still
// lands on the right page.
//
// We rewrite the browser URL via history.replaceState BEFORE React mounts
// so BrowserRouter picks up the right route on first render. Doing it
// after React mounts means the user briefly sees the home page before
// being redirected — which we want to avoid.
//
// Edge cases:
//   - `browser_<token>` (browser-tab auth flow) is NOT a deep link; skip it.
//   - Anything that doesn't decode to a /-prefixed path is treated as junk
//     and ignored — never navigate to a non-app URL from start_param.
// ────────────────────────────────────────────────────────────────────────
function navigateToDeepLinkPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return false
  // Replace, don't push, so the back button doesn't loop to "/".
  window.history.replaceState({}, '', path)
  return true
}

try {
  // 1. Telegram Mini App deep-link via start_param
  const sp = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? ''
  if (sp && !sp.startsWith('browser_')) {
    // base64url → base64
    const padded = sp.replace(/-/g, '+').replace(/_/g, '/')
    try {
      const decoded = atob(padded)
      navigateToDeepLinkPath(decoded)
    } catch { /* malformed start_param — fall through to hash check */ }
  }

  // 2. Plain-browser fallback: read window.location.hash. Bot inline
  //    buttons that target a non-t.me URL pass the in-app path as
  //    `#/some/path?args` (see TelegramBotService::buildMiniAppUrl).
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1) // drop the '#'
    if (navigateToDeepLinkPath(hashPath)) {
      // Strip the hash now that BrowserRouter has the path so the URL is clean.
      // Note: the navigateToDeepLinkPath above already replaceState'd to the
      // canonical pathname — no further work needed.
    }
  }
} catch { /* boot at the default URL — never break first paint */ }

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
