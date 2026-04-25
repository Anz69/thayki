import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import '../css/app.css'

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
