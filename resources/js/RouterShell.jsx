import { useEffect, useRef, lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerOverlay, registerPageRoot, setLoaderDone } from '@/utils/pageTransition'
import RouteChangeEffect from '@/components/RouteChangeEffect'
import BottomNav from '@/components/ui/BottomNav'
import ErrorBoundary from '@/components/ErrorBoundary'
import useAuthStore from '@/stores/useAuthStore'
import api, { getStoredToken, clearToken } from '@/utils/api'
import { logWarn } from '@/utils/logger'
import { parseTelegramStartParam } from '@/utils/telegramAuth'

import LandingPage from '@/views/LandingPage'
import StrangeWelcomePage from '@/views/StrangeWelcomePage'
import BannedPage from '@/views/BannedPage'
import ModalMiddle from '@/layout/ModalMiddle'

import HomePage from '@/views/HomePage'
import ModelPage from '@/views/ModelPage'
import MorePage from '@/views/MorePage'
import RequestPage from '@/views/RequestPage'
import RequestChatPage from '@/views/RequestChatPage'
import RequestsPage from '@/views/RequestsPage'
import ManagerHomePage from '@/views/manager/ManagerHomePage'
import ManagerMorePage from '@/views/manager/ManagerMorePage'
import ManagerLeadsPage from '@/views/manager/ManagerLeadsPage'
import ManagerSupportPage from '@/views/manager/ManagerSupportPage'
import RequisitesChatGate from '@/views/requisites/RequisitesChatGate'
import ProfilePage from '@/views/ProfilePage'
import SupportPage from '@/views/SupportPage'

function importWithRetry(importer, attempt = 0) {
  return importer().catch((err) => {
    if (attempt < 2) {
      return new Promise((res) => setTimeout(res, 500 * (attempt + 1)))
        .then(() => importWithRetry(importer, attempt + 1))
    }
    try {
      const buildId = String(window.__APP_BUILD_ID__ ?? 'unknown')
      const key = `__chunk_reload_once__:${buildId}`
      if (sessionStorage.getItem(key) !== '1') {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      // Already reloaded once and the chunk still won't load — show an explicit
      // reload screen instead of letting it fall through to a blank/Suspense state.
      if (typeof window.__showFatalScreen === 'function') {
        window.__showFatalScreen()
        return new Promise(() => {})
      }
    } catch { }
    throw err
  })
}

const PREFETCH = []
function route(importer, { prefetch = false } = {}) {
  if (prefetch) PREFETCH.push(importer)
  return lazy(() => importWithRetry(importer))
}

const ManagerEarningsPage = route(() => import('@/views/manager/ManagerEarningsPage'), { prefetch: true })

let _prefetchedRoutes = false
function prefetchHotRoutes() {
  if (_prefetchedRoutes) return
  _prefetchedRoutes = true
  const run = () => PREFETCH.forEach((importer) => { try { importer()?.catch?.(() => {}) } catch {} })
  const ric = window.requestIdleCallback
  if (typeof ric === 'function') ric(run, { timeout: 2500 })
  else setTimeout(run, 1200)
}

function LandingRoute() {
  const { user } = useAuthStore()
  if (!user) return <LandingPage />
  if (user?.role === 'manager' || user?.role === 'requisite') return <Navigate to="/home" replace />
  return <LandingPage />
}

function MainPage() {
  const { user } = useAuthStore()
  if (user?.role === 'manager') return <ManagerHomePage />
  if (user?.role === 'requisite') return <RequisitesChatGate />
  return <HomePage />
}

function MoreRolePage() {
  const { user } = useAuthStore()
  if (user?.role === 'requisite') return <Navigate to="/home" replace />
  if (user?.role === 'manager') return <ManagerMorePage />
  return <MorePage />
}

function PageFallback() {
  return (
    <div style={{ width: '100%', height: '100dvh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes rmspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #f1d8e8', borderTopColor: '#E2319B', animation: 'rmspin .8s linear infinite' }} />
    </div>
  )
}

let authRetried = false

function AuthErrorScreen() {
  const { t } = useTranslation()
  const authStore = useAuthStore()
  const hint = authStore.authErrorHint
  const detail = authStore.authErrorDetail
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (authRetried) return
    authRetried = true

    authStore.setAuthPending()

    async function retry() {
      const storedToken = getStoredToken()
      if (storedToken) {
        try {
          const { data } = await api.get('/auth/me')
          if (data?.data) {
            authStore.setUser(data.data)
            return
          }
        } catch (e) {
          logWarn('[AuthErrorScreen] /auth/me retry failed', { error: e?.message })
        }
        clearToken()
      }

      const tg = window.Telegram?.WebApp
      const initData = tg?.initData
      if (initData) {
        const startParam = tg?.initDataUnsafe?.start_param ?? ''
        const { browserToken, inviteToken } = parseTelegramStartParam(startParam)
        const loginPayload = {
          init_data: initData,
          ...(browserToken ? { browser_token: browserToken } : {}),
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        }

        try {
          const { data } = await api.post('/auth/telegram', loginPayload)
          if (data.ok && data.data?.token && data.data?.user) {
            authStore.setUser(data.data.user, data.data.token)
            return
          }
        } catch (err) {
          if (err?.response?.status === 419) {
            try {
              const second = await api.post('/auth/telegram', loginPayload)
              const data = second?.data
              if (data?.ok && data?.data?.token && data?.data?.user) {
                authStore.setUser(data.data.user, data.data.token)
                return
              }
            } catch {
            }
          }

          logWarn('[AuthErrorScreen] /auth/telegram retry failed', {
            hasBrowserToken: !!browserToken,
            hasInviteToken: !!inviteToken,
            error: err?.message,
          })
          const code = err?.response?.data?.error?.code
          if (code === 'USER_BANNED') {
            authStore.setBanned()
            return
          }
          const retryDetail = {
            step: 'retry POST /auth/telegram',
            status: err?.response?.status ?? null,
            code: code ?? null,
            message: err?.response?.data?.error?.message ?? err?.message ?? null,
            hasBrowserToken: !!browserToken,
            hasInviteToken: !!inviteToken,
          }
          const serverMsg = err?.response?.data?.error?.message ?? null
          const hintMsg = code === 'INIT_DATA_INVALID'
            ? (serverMsg && serverMsg.includes('BOT_TOKEN') ? serverMsg : 'Ошибка конфигурации бота. Проверьте TELEGRAM_BOT_TOKEN на сервере.')
            : null
          authStore.setNeedsLogin(hintMsg, retryDetail)
          return
        }
      }

      authStore.setNeedsLogin(null, { step: 'retry', message: initData ? 'Сервер вернул пустой ответ' : 'initData недоступен' })
    }

    retry().catch(() => authStore.setNeedsLogin())
  }, [])

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-8 text-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl select-none">😕</span>
          <h1 className="text-xl font-semibold text-black">{t('auth.loginErrorTitle')}</h1>
          <p className="text-sm text-[#7F7F7F] leading-relaxed whitespace-pre-line">
            {t('auth.loginErrorText')}
          </p>
          {hint && (
            <p className="text-xs text-[#AAAAAA] leading-relaxed mt-1 max-w-xs">
              {hint}
            </p>
          )}
        </div>
        <button
          onClick={() => { authRetried = false; window.location.reload() }}
          className="w-full max-w-xs py-4 rounded-full bg-[#E2319B] text-white text-base font-semibold active:opacity-80 transition-opacity"
        >
          {t('auth.reload')}
        </button>
        <button
          onClick={() => setShowDetail(true)}
          className="text-xs text-[#CCCCCC] underline underline-offset-2 active:opacity-60 transition-opacity"
        >
          {t('auth.showError')}
        </button>
      </div>

      <ModalMiddle isOpen={showDetail} onClose={() => setShowDetail(false)}>
        <div className="px-5 pb-6">
          <p className="text-base font-semibold text-gray-900 mb-3">{t('auth.errorDetails')}</p>
          <pre className="text-[11px] leading-relaxed text-gray-600 bg-gray-50 rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(detail ?? { message: 'Детали ошибки недоступны' }, null, 2)}
          </pre>
          <button
            onClick={() => setShowDetail(false)}
            className="mt-4 w-full py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-medium active:opacity-70 transition-opacity"
          >
            {t('common.close')}
          </button>
        </div>
      </ModalMiddle>
    </>
  )
}

function AuthPendingScreen() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#fff' }}>
      <style>{`@keyframes rmspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #f1d8e8', borderTopColor: '#E2319B', animation: 'rmspin .8s linear infinite' }} />
    </main>
  )
}

function AuthGuard({ children }) {
  const { user, needsLogin, authPending, isBanned } = useAuthStore()

  // The inline boot splash is the single loader and stays up until the app is
  // ACTUALLY ready — i.e. auth has resolved (user, needs-login, or banned). Only
  // then do we reveal the real UI: release the page entry animations and drop the
  // splash after this commit paints. No cosmetic timed overlay flashing over content.
  const resolved = !authPending
  useEffect(() => {
    if (!resolved) return
    requestAnimationFrame(() => {
      try { setLoaderDone() } catch {}
      try {
        const sp = document.getElementById('boot-splash')
        if (sp) { sp.style.opacity = '0'; setTimeout(() => { try { sp.remove() } catch {} }, 220) }
      } catch {}
    })
  }, [resolved])

  // While auth is in flight the boot splash covers everything; this spinner is the
  // fallback if the splash was already removed.
  if (authPending) return <AuthPendingScreen />
  if (isBanned) return <BannedPage />
  if (!user && needsLogin) return <AuthErrorScreen />
  if (!user) return <AuthPendingScreen />

  return children
}

// Frontend role gate (defense-in-depth on top of API 403s): keeps manager/admin
// surfaces from rendering for clients who hit a direct URL.
function RoleRoute({ roles, children }) {
  const { user } = useAuthStore()
  if (user && roles.includes(user.role)) return children
  return <Navigate to="/home" replace />
}

function StrangeGuard({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user || user.is_strange !== true) return children

  const allowed = new Set(['/welcome'])
  if (allowed.has(location.pathname)) return children

  return <Navigate to="/welcome" replace />
}

export default function App() {
  const overlayRef = useRef(null)
  const pageRootRef = useRef(null)

  useEffect(() => {
    registerOverlay(overlayRef.current)
    registerPageRoot(pageRootRef.current)
    prefetchHotRoutes()
  }, [])

  useEffect(() => {
    const update = () => {
      document.documentElement.classList.toggle('compact-h', window.innerHeight <= 700)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <ErrorBoundary>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouteChangeEffect />
      <div className="app-shell">
        <div id="page-root" ref={pageRootRef} className="page-root">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <AuthGuard>
                <StrangeGuard>
                  <>
                    <Routes>
                      <Route path="/welcome" element={<StrangeWelcomePage />} />
                      <Route path="/" element={<LandingRoute />} />
                      <Route path="/home" element={<MainPage />} />
                      <Route path="/more" element={<MoreRolePage />} />
                      <Route path="/model/:id" element={<ModelPage />} />
                      <Route path="/model-view" element={<ModelPage preview />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/request" element={<RequestPage />} />
                      <Route path="/request/chat" element={<RequestChatPage />} />
                      <Route path="/requisites/open" element={<RequisitesChatGate />} />
                      <Route path="/requests" element={<RequestsPage />} />
                      <Route path="/manager/leads" element={<RoleRoute roles={['manager']}><ManagerLeadsPage /></RoleRoute>} />
                      <Route path="/manager/earnings" element={<RoleRoute roles={['manager']}><ManagerEarningsPage /></RoleRoute>} />
                      <Route path="/manager/support" element={<RoleRoute roles={['manager']}><ManagerSupportPage /></RoleRoute>} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="*" element={<Navigate to="/home" replace />} />
                    </Routes>
                    <BottomNav />
                  </>
                </StrangeGuard>
              </AuthGuard>
            </Suspense>
          </ErrorBoundary>
        </div>

        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#ffffff',
            opacity: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />
      </div>

      <style>{`
        .app-shell {
          background: #ffffff;
          min-height: 100dvh;
          overflow: hidden;
        }
        .page-root {
          background: #fff;
          height: 100dvh;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          position: relative;
        }
        .page-root::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
