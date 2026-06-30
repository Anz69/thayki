import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/js/app.jsx', 'resources/css/app.css'],
      refresh: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'resources/js'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    // Keep previous builds' hashed assets on deploy. Telegram's iOS WebView can hold
    // a stale cached HTML shell that references old chunk hashes; if those were wiped
    // the app dead-ends on a 404 → blank white screen with no loader and no JS. By not
    // emptying the dir, a stale shell still finds its chunks and boots (old version),
    // while no-store HTML hands fresh devices the current build.
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // Split heavy third-party libs into their own chunks so they cache
        // separately from app code on deploys.
        manualChunks: {
          react:    ['react', 'react-dom', 'react-router-dom'],
          gsap:     ['gsap'],
          cobe:     ['cobe'],
          swiper:   ['swiper', 'swiper/react', 'swiper/modules'],
          realtime: ['laravel-echo', 'pusher-js'],
        },
      },
    },
  },
})
