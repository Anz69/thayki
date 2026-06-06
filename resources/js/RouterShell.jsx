import { useEffect, useRef, lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerOverlay, registerPageRoot } from '@/utils/pageTransition'
import RouteChangeEffect from '@/components/RouteChangeEffect'
import BottomNav from '@/components/ui/BottomNav'
import PhotoViewer from '@/components/modals/PhotoViewer'
import RegistrationModal from '@/components/modals/RegistrationModal'
import AppLoader from '@/components/ui/AppLoader'
import ErrorBoundary from '@/components/ErrorBoundary'
import useAuthStore from '@/stores/useAuthStore'
import useMeetingStore from '@/stores/useMeetingStore'
import api, { getStoredToken, clearToken } from '@/utils/api'
import { logWarn } from '@/utils/logger'
import { parseTelegramStartParam } from '@/utils/telegramAuth'

import LandingPage from '@/views/LandingPage'
import StrangeWelcomePage from '@/views/StrangeWelcomePage'
import BannedPage from '@/views/BannedPage'
import ModalMiddle from '@/layout/ModalMiddle'

const HomePage = lazy(() => import('@/views/HomePage'))
const ModelPage = lazy(() => import('@/views/ModelPage'))
const MeetingPage = lazy(() => import('@/views/MeetingPage'))
const ModelMeetingPage = lazy(() => import('@/views/ModelMeetingPage'))
const ChatPage = lazy(() => import('@/views/ChatPage'))
const RoadmapPage = lazy(() => import('@/views/RoadmapPage'))
const MorePage = lazy(() => import('@/views/MorePage'))
const ModelMorePage = lazy(() => import('@/views/ModelMorePage'))
const ProfilePage = lazy(() => import('@/views/ProfilePage'))
const ClientPage = lazy(() => import('@/views/ClientPage'))
const BecomeModelPage = lazy(() => import('@/views/BecomeModelPage'))
const ApplicationPendingPage = lazy(() => import('@/views/ApplicationPendingPage'))
const SupportPage = lazy(() => import('@/views/SupportPage'))
const FeedbackPage = lazy(() => import('@/views/FeedbackPage'))
const RequestPage = lazy(() => import('@/views/RequestPage'))
const RequestChatPage = lazy(() => import('@/views/RequestChatPage'))
const RequestsPage = lazy(() => import('@/views/RequestsPage'))
const ManagerHomePage = lazy(() => import('@/views/manager/ManagerHomePage'))
const ManagerMorePage = lazy(() => import('@/views/manager/ManagerMorePage'))
const ManagerLeadsPage = lazy(() => import('@/views/manager/ManagerLeadsPage'))
const ManagerEarningsPage = lazy(() => import('@/views/manager/ManagerEarningsPage'))

function LandingRoute() {
  const { user } = useAuthStore()
  if (!user) return <LandingPage />
  if (user?.role === 'model' || user?.role === 'manager') return <Navigate to="/home" replace />
  return <LandingPage />
}

function MainPage() {
  const { user } = useAuthStore()
  if (user?.role === 'model') return <ClientPage />
  if (user?.role === 'manager') return <ManagerHomePage />
  return <HomePage />
}

function MoreRolePage() {
  const { user } = useAuthStore()
  if (user?.role === 'model') return <ModelMorePage />
  if (user?.role === 'manager') return <ManagerMorePage />
  return <MorePage />
}

function MeetingRolePage() {
  const { user } = useAuthStore()
  return user?.role === 'model' ? <ModelMeetingPage /> : <MeetingPage />
}

function PageFallback() {
  return <div style={{ width: '100%', height: '100dvh', background: '#fff' }} />
}

let authRetried = false
const MODEL_APP_GUARD_TTL_MS = 10000
const MODEL_APP_GATE_PATHS = new Set(['/become-model', '/application-pending', '/home'])
/**
 * pending_review = заявка на модерации
 * finished = approved/rejected — остаёмся на /application-pending до анимации
 * absent = 404
 * draft_or_unknown = черновик и т.п.
 * error = сеть/API
 * @type {{ userId: number|null, outcome: 'pending_review'|'finished'|'absent'|'draft_or_unknown'|'error'|null, checkedAt: number }}
 */
let modelAppGuardCache = { userId: null, outcome: null, checkedAt: 0 }

export function resetModelAppGuardCache() {
  modelAppGuardCache = { userId: null, outcome: null, checkedAt: 0 }
}

function AuthErrorScreen() {
  const { t } = useTranslation()
  const authStore = useAuthStore()
  const meetingStore = useMeetingStore()
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
            meetingStore.loadLatest()
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
            meetingStore.loadLatest()
            return
          }
        } catch (err) {
          if (err?.response?.status === 419) {
            try {
              const second = await api.post('/auth/telegram', loginPayload)
              const data = second?.data
              if (data?.ok && data?.data?.token && data?.data?.user) {
                authStore.setUser(data.data.user, data.data.token)
                meetingStore.loadLatest()
                return
              }
            } catch {
              // Fall through to existing error handling below.
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

function AuthGuard({ children }) {
  const { user, needsLogin, authPending, isBanned } = useAuthStore()

  if (authPending) return null
  if (isBanned) return <BannedPage />
  if (!user && needsLogin) return <AuthErrorScreen />

  return children
}

function StrangeGuard({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()

  // Только явный флаг: иначе пропускаем «обычный» доступ и не ломаем UI из‑за undefined.
  if (!user || user.is_strange !== true) return children

  // `/application-pending` нужен, иначе ModelApplicationPendingGuard кидает на заявку,
  // StrangeGuard — обратно на /welcome, получается цикл и «пустая» страница.
  const allowed = new Set(['/welcome', '/application-pending', '/become-model'])
  if (allowed.has(location.pathname)) return children

  return <Navigate to="/welcome" replace />
}

function ModelApplicationPendingGuard({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()
  const [gateReady, setGateReady] = useState(false)
  const [applicationOutcome, setApplicationOutcome] = useState(
    /** @type {'pending_review'|'finished'|'absent'|'draft_or_unknown'|'error'|null} */ (null),
  )
  // Tracks which key the current applicationOutcome was computed for.
  // When the key changes (route change), we treat state as stale until the
  // new fetch completes — prevents applying an old outcome to the new route.
  const [outcomeForKey, setOutcomeForKey] = useState(null)

  const modelAppGateRefetchKey = MODEL_APP_GATE_PATHS.has(location.pathname)
    ? location.pathname
    : '_'

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setApplicationOutcome('absent')
      setOutcomeForKey(modelAppGateRefetchKey)
      setGateReady(true)
      return () => { cancelled = true }
    }

    const skipTtl = MODEL_APP_GATE_PATHS.has(location.pathname)
    const now = Date.now()
    if (
      !skipTtl
      && modelAppGuardCache.userId === user.id
      && modelAppGuardCache.outcome !== null
      && now - modelAppGuardCache.checkedAt < MODEL_APP_GUARD_TTL_MS
    ) {
      setApplicationOutcome(modelAppGuardCache.outcome)
      setOutcomeForKey(modelAppGateRefetchKey)
      setGateReady(true)
      return () => { cancelled = true }
    }

    setGateReady(false)
    api.get('/model-application')
      .then((res) => {
        if (cancelled) return
        const status = res?.data?.data?.status
        let outcome
        if (status === 'submitted') {
          outcome = 'pending_review'
        } else if (status === 'approved' || status === 'rejected') {
          outcome = 'finished'
        } else {
          outcome = 'draft_or_unknown'
        }
        setApplicationOutcome(outcome)
        setOutcomeForKey(modelAppGateRefetchKey)
        modelAppGuardCache = { userId: user.id, outcome, checkedAt: Date.now() }
        setGateReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        const httpStatus = err?.response?.status
        if (httpStatus === 404) {
          const outcome = 'absent'
          setApplicationOutcome(outcome)
          modelAppGuardCache = { userId: user.id, outcome, checkedAt: Date.now() }
        } else {
          const outcome = 'error'
          setApplicationOutcome(outcome)
          modelAppGuardCache = { userId: user.id, outcome, checkedAt: Date.now() }
        }
        setOutcomeForKey(modelAppGateRefetchKey)
        setGateReady(true)
      })

    return () => { cancelled = true }
  }, [user?.id, modelAppGateRefetchKey])

  // Render children (no redirect) while:
  // - fetch is in progress (!gateReady), OR
  // - the stored outcome is from a previous route (outcomeForKey !== current key),
  //   which happens on the very first render after a route change before the
  //   new effect has run — prevents applying a stale outcome to the new route.
  if (!gateReady || outcomeForKey !== modelAppGateRefetchKey) {
    return children
  }

  if (applicationOutcome === 'pending_review' && location.pathname !== '/application-pending') {
    return <Navigate to="/application-pending" replace />
  }

  if (
    user?.role === 'model'
    && applicationOutcome === 'absent'
    && location.pathname !== '/become-model'
  ) {
    return <Navigate to="/become-model" replace />
  }

  if (
    applicationOutcome === 'absent'
    && location.pathname === '/application-pending'
  ) {
    return <Navigate to="/home" replace />
  }

  return children
}

export default function App() {
  const overlayRef = useRef(null)
  const pageRootRef = useRef(null)

  useEffect(() => {
    registerOverlay(overlayRef.current)
    registerPageRoot(pageRootRef.current)
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouteChangeEffect />
      <div className="app-shell">
        <div id="page-root" ref={pageRootRef} className="page-root">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <AuthGuard>
                <StrangeGuard>
                  <ModelApplicationPendingGuard>
                    <>
                      <Routes>
                        <Route path="/welcome" element={<StrangeWelcomePage />} />
                        <Route path="/" element={<LandingRoute />} />
                        <Route path="/home" element={<MainPage />} />
                        <Route path="/more" element={<MoreRolePage />} />
                        <Route path="/models" element={<Navigate to="/home" replace />} />
                        <Route path="/model-more" element={<Navigate to="/more" replace />} />
                        <Route path="/model/:id" element={<ModelPage />} />
                        <Route path="/meeting" element={<MeetingRolePage />} />
                        <Route path="/model-meeting" element={<Navigate to="/meeting" replace />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/request" element={<RequestPage />} />
                        <Route path="/request/chat" element={<RequestChatPage />} />
                        <Route path="/requests" element={<RequestsPage />} />
                        <Route path="/manager" element={<Navigate to="/home" replace />} />
                        <Route path="/manager/leads" element={<ManagerLeadsPage />} />
                        <Route path="/manager/earnings" element={<ManagerEarningsPage />} />
                        <Route path="/roadmap" element={<RoadmapPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/become-model" element={<BecomeModelPage />} />
                        <Route path="/application-pending" element={<ApplicationPendingPage />} />
                        <Route path="/feedback" element={<FeedbackPage />} />
                        <Route path="*" element={<Navigate to="/home" replace />} />
                      </Routes>
                      <BottomNav />
                    </>
                  </ModelApplicationPendingGuard>
                </StrangeGuard>
              </AuthGuard>
            </Suspense>
          </ErrorBoundary>
        </div>

        <PhotoViewer />
        <RegistrationModal />

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

      <AppLoader />

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
  )
}
