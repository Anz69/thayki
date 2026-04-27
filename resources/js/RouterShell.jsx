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

// LandingPage is eager — it's the first route users see
import LandingPage from '@/views/LandingPage'
// import LoginPage from '@/views/LoginPage'  // disabled — auto-login retries on reload
import StrangeWelcomePage from '@/views/StrangeWelcomePage'

// All other views are lazy-loaded to reduce initial bundle size
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

// Invisible fallback — GSAP transition overlay handles the visual loading state
function PageFallback() {
  return <div style={{ width: '100%', height: '100dvh', background: '#fff' }} />
}

/**
 * Reloads the page when auto-login (TG initData / stored token) failed.
 * This retries the full auth cycle instead of showing a login screen,
 * which makes sense for a Telegram Mini App where manual login is not used.
 * Login page is kept in the codebase but its route is disabled.
 */
function AuthGuard({ children }) {
  const { user, needsLogin, authPending } = useAuthStore()

  // Still waiting for TG auto-login — render nothing (AppLoader covers the screen)
  if (authPending) return null

  // Auto-login failed → reload to retry the auth cycle
  if (!user && needsLogin) {
    window.location.reload()
    return null
  }

  return children
}

/**
 * "Double-bottom" gate — strange (unverified) users are funneled to the
 * welcome stub no matter where they navigate. The only escape is to /start
 * the bot via a valid invite link, which flips is_strange=false on the
 * server. Routes whitelisted below are still reachable so we don't trap
 * users on the stub if they somehow have a token bound to /become-model
 * (model-invite flow logs them in already non-strange, but we keep the
 * route accessible just in case).
 */
function StrangeGuard({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user) return children
  if (!user.is_strange) return children

  // Allow only the welcome page itself; redirect everything else.
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
                    {/* <Route path="/login" element={<LoginPage />} /> — disabled, reload retries auto-login */}
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
                    {/* SPA catch-all → redirect unknown URLs to /home */}
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
