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

// LandingPage is eager — it's the first route users see
import LandingPage from '@/views/LandingPage'
import LoginPage   from '@/views/LoginPage'

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
 * Redirects to /login when:
 * - User is not authenticated (no session / TG auth failed)
 * - AND we're not still waiting for TG initData to resolve
 * - AND we're not already on /login
 */
function AuthGuard({ children }) {
  const { user, needsLogin, authPending } = useAuthStore()
  const location = useLocation()

  // Still waiting for TG auto-login — render nothing (AppLoader covers the screen)
  if (authPending) return null

  // Browser without login and not on /login → redirect
  if (!user && needsLogin && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  // Authenticated but landed on /login → go to main app
  if (user && location.pathname === '/login') {
    return <Navigate to="/home" replace />
  }

  return children
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
                <Routes>
                  <Route path="/login"         element={<LoginPage />} />
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
                  {/* SPA catch-all → redirect unknown URLs to /home */}
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
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
