import { useEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

const HomePage         = lazy(() => import('@/views/HomePage'))
const ModelPage        = lazy(() => import('@/views/ModelPage'))
const MeetingPage      = lazy(() => import('@/views/MeetingPage'))
const ModelMeetingPage = lazy(() => import('@/views/ModelMeetingPage'))
const ChatPage         = lazy(() => import('@/views/ChatPage'))
const RoadmapPage      = lazy(() => import('@/views/RoadmapPage'))
const MorePage         = lazy(() => import('@/views/MorePage'))
const ModelMorePage    = lazy(() => import('@/views/ModelMorePage'))
const ProfilePage      = lazy(() => import('@/views/ProfilePage'))
const ClientPage       = lazy(() => import('@/views/ClientPage'))
const BecomeModelPage          = lazy(() => import('@/views/BecomeModelPage'))
const ApplicationPendingPage   = lazy(() => import('@/views/ApplicationPendingPage'))
const SupportPage              = lazy(() => import('@/views/SupportPage'))
const FeedbackPage             = lazy(() => import('@/views/FeedbackPage'))

function MainPage() {
  const { user } = useAuthStore()
  return user?.role === 'model' ? <ClientPage /> : <HomePage />
}

function MoreRolePage() {
  const { user } = useAuthStore()
  return user?.role === 'model' ? <ModelMorePage /> : <MorePage />
}

function MeetingRolePage() {
  const { user } = useAuthStore()
  return user?.role === 'model' ? <ModelMeetingPage /> : <MeetingPage />
}

function PageFallback() {
  return <div style={{ width: '100%', height: '100dvh', background: '#fff' }} />
}

let authRetried = false

function AuthErrorScreen() {
  const authStore    = useAuthStore()
  const meetingStore = useMeetingStore()

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

      const tg       = window.Telegram?.WebApp
      const initData = tg?.initData
      if (initData) {
        const startParam   = tg?.initDataUnsafe?.start_param ?? ''
        const { browserToken, inviteToken } = parseTelegramStartParam(startParam)
        try {
          const { data } = await api.post('/auth/telegram', {
            init_data: initData,
            ...(browserToken ? { browser_token: browserToken } : {}),
            ...(inviteToken  ? { invite_token:  inviteToken  } : {}),
          })
          if (data.ok && data.data?.token && data.data?.user) {
            authStore.setUser(data.data.user, data.data.token)
            meetingStore.loadLatest()
            return
          }
        } catch (e) {
          logWarn('[AuthErrorScreen] /auth/telegram retry failed', {
            hasBrowserToken: !!browserToken,
            hasInviteToken: !!inviteToken,
            error: e?.message,
          })
        }
      }

      authStore.setNeedsLogin()
    }

    retry().catch(() => authStore.setNeedsLogin())
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-8 text-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl select-none">😕</span>
        <h1 className="text-xl font-semibold text-black">Ошибка входа</h1>
        <p className="text-sm text-[#7F7F7F] leading-relaxed">
          Не удалось войти в приложение.<br />Попробуйте перезагрузить страницу.
        </p>
      </div>
      <button
        onClick={() => { authRetried = false; window.location.reload() }}
        className="w-full max-w-xs py-4 rounded-full bg-[#E2319B] text-white text-base font-semibold active:opacity-80 transition-opacity"
      >
        Перезагрузить страницу
      </button>
    </div>
  )
}

function AuthGuard({ children }) {
  const { user, needsLogin, authPending } = useAuthStore()

  if (authPending) return null
  if (!user && needsLogin) return <AuthErrorScreen />

  return children
}

function StrangeGuard({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user) return children
  if (!user.is_strange) return children

  const allowed = ['/welcome']
  if (allowed.includes(location.pathname)) return children

  return <Navigate to="/welcome" replace />
}

export default function App() {
  const overlayRef  = useRef(null)
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
                  <Routes>
                    <Route path="/welcome"       element={<StrangeWelcomePage />} />
                    <Route path="/"              element={<LandingPage />} />
                    <Route path="/home"          element={<MainPage />} />
                    <Route path="/more"          element={<MoreRolePage />} />
                    <Route path="/models"        element={<Navigate to="/home" replace />} />
                    <Route path="/model-more"    element={<Navigate to="/more" replace />} />
                    <Route path="/model/:id"     element={<ModelPage />} />
                    <Route path="/meeting"       element={<MeetingRolePage />} />
                    <Route path="/model-meeting" element={<Navigate to="/meeting" replace />} />
                    <Route path="/chat"          element={<ChatPage />} />
                    <Route path="/support"       element={<SupportPage />} />
                    <Route path="/roadmap"       element={<RoadmapPage />} />
                    <Route path="/profile"              element={<ProfilePage />} />
                    <Route path="/become-model"         element={<BecomeModelPage />} />
                    <Route path="/application-pending"  element={<ApplicationPendingPage />} />
                    <Route path="/feedback"             element={<FeedbackPage />} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                </StrangeGuard>
              </AuthGuard>
            </Suspense>
          </ErrorBoundary>
        </div>

        <BottomNav />

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
          will-change: transform;
        }
        .page-root::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </BrowserRouter>
  )
}
