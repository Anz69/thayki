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
// We decode it ONCE here, BEFORE React mounts, and rewrite the browser URL
// via history.replaceState so BrowserRouter picks up the right route on
// first render. Doing it after React mounts means the user briefly sees
// the home page before being redirected — which we want to avoid.
//
// Edge cases:
//   - `browser_<token>` (browser-tab auth flow) is NOT a deep link; skip it.
//   - Anything that doesn't decode to a /-prefixed path is treated as junk
//     and ignored — never navigate to a non-app URL from start_param.
// ────────────────────────────────────────────────────────────────────────
try {
  const sp = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? ''
  if (sp && !sp.startsWith('browser_')) {
    // base64url → base64
    const padded = sp.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(padded)
    if (decoded.startsWith('/')) {
      // Replace, don't push, so the back button doesn't loop to "/".
      window.history.replaceState({}, '', decoded)
    }
  }
} catch { /* malformed start_param — boot at the default URL */ }

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
