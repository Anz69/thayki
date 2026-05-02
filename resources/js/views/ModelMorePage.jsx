import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import FaqModal from '@/components/modals/FaqModal'
import WithdrawModal from '@/components/modals/WithdrawModal'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'
import { resolveMediaUrl } from '@/utils/resolveMediaUrl'
import { subscribeActiveMeetingsRefresh } from '@/utils/activeMeetingsBus'
import { logError } from '@/utils/logger'

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="15" viewBox="0 0 14 15" fill="none">
    <path d="M0.75 14.25C0.75 14.25 1.41667 9.88861 6.75 9.88861C12.0833 9.88861 12.75 14.25 12.75 14.25M10.125 4.125C10.125 5.98896 8.61396 7.5 6.75 7.5C4.88604 7.5 3.375 5.98896 3.375 4.125C3.375 2.26104 4.88604 0.75 6.75 0.75C8.61396 0.75 10.125 2.26104 10.125 4.125Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSupport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <g clipPath="url(#clip_sup_mm)">
      <path d="M4.875 15.2462L7.59984 12.5213M5.41959 10.459L2.81934 13.0592M5.41959 7.54085L2.75368 4.87493M4.91103 2.78965L7.37132 5.24993M13.0377 15.1589L10.5173 12.6386M12.5803 10.459L15.1736 13.0523M13.125 2.75354L10.5173 5.36124M12.6213 7.49993L15.1913 4.92984M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9ZM12.75 8.99998C12.75 11.071 11.0711 12.75 9 12.75C6.92893 12.75 5.25 11.071 5.25 8.99998C5.25 6.92891 6.92893 5.24998 9 5.24998C11.0711 5.24998 12.75 6.92891 12.75 8.99998Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs><clipPath id="clip_sup_mm"><rect width="18" height="18" fill="white" /></clipPath></defs>
  </svg>
)

function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em]">
      {children}
    </p>
  )
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 bg-[#F5F5F7] rounded-2xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span className="text-black text-[15px]/[100%] font-medium">{label}</span>
    </button>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={[
        'relative w-[46px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0',
        value ? 'bg-[#E2319B]' : 'bg-[#D1D1D6]',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-[6px] size-3 rounded-full bg-white transition-transform duration-200',
          !value ? 'translate-x-[-16px]' : 'translate-x-[4px]',
        ].join(' ')}
      />
    </button>
  )
}

const STATUS_MAP = {
  pending:   'Ожидает подтверждения',
  accepted:  'Принято',
  paid:      'Оплачено',
  confirmed: 'Подтверждено',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d    = new Date(iso)
    if (isNaN(d)) return '—'
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const dd   = String(d.getDate()).padStart(2, '0')
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const hh   = String(d.getHours()).padStart(2, '0')
    const min  = String(d.getMinutes()).padStart(2, '0')
    return `${days[d.getDay()]}, ${dd}.${mm}, ${hh}:${min}`
  } catch { return '—' }
}

const IconWithdraw = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M9.6665 9.33366C12.0597 9.33366 13.9998 7.39356 13.9998 5.00033C13.9998 2.60709 12.0597 0.666992 9.6665 0.666992C7.27327 0.666992 5.33317 2.60709 5.33317 5.00033M4.08048 7.83366H5.08048V11.5003M4.08048 11.5003H6.08048M0.666504 9.66699C0.666504 12.0602 2.6066 14.0003 4.99984 14.0003C7.39307 14.0003 9.33317 12.0602 9.33317 9.66699C9.33317 7.27376 7.39307 5.33366 4.99984 5.33366C2.6066 5.33366 0.666504 7.27376 0.666504 9.66699Z" stroke="black" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function BookingCard({ meeting, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  const clientName   = meeting.client?.first_name ?? meeting.client?.username ?? '—'
  const clientPhoto  = resolveMediaUrl(meeting.client?.photo_url ?? null)
  const statusLabel  = STATUS_MAP[meeting.status] ?? meeting.status
  const price        = meeting.price_thb ?? 0
  const duration     = meeting.duration_hours ? `${meeting.duration_hours} ч` : '—'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl px-4 py-3.5 flex flex-col gap-2.5 active:bg-[#F5F5F7] transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full shrink-0 overflow-hidden bg-[#7B5BFF] flex items-center justify-center">
            {clientPhoto && !imgFailed
              ? <img src={clientPhoto} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
              : <span className="text-white text-[10px] font-bold">{clientName[0]?.toUpperCase()}</span>
            }
          </div>
          <span className="text-black text-[15px]/[100%] font-[500]">{clientName}</span>
        </div>
        <span className="text-[#777779] text-xs/[100%] font-medium">{formatDate(meeting.scheduled_at)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#777779] text-sm/[100%] font-medium">{statusLabel}</span>
        <span className="text-black text-sm/[100%] font-[500]">฿ {price.toLocaleString()} / {duration}</span>
      </div>
    </button>
  )
}

export default function ModelMorePage() {
  const navigate = useTransitionNavigate()
  const location = useLocation()
  const auth     = useAuthStore()
  const [faqOpen, setFaqOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [balance, setBalance]           = useState(0)
  const [meetings, setMeetings]             = useState([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)

  const [notifications, setNotifications] = useState(
    auth.user?.notifications_enabled ?? true
  )
  const handleNotificationsChange = useCallback(async (next) => {
    setNotifications(next)
    try {
      const res = await api.patch('/me', { notifications_enabled: next })
      const updated = res?.data?.data
      if (updated && auth.setUser) auth.setUser(updated)
    } catch {
      setNotifications((v) => !v)
    }
  }, [auth])

  const headerRef   = useRef(null)
  const ordersRef   = useRef(null)
  const section1Ref = useRef(null)
  const section2Ref = useRef(null)

  const fetchMeetings = useCallback((silent = false) => {
    if (!silent) setLoadingMeetings(true)
    api.get('/meetings', {
      params: {
        per_page: 20,
        role: 'model',
        statuses: 'pending,accepted,paid,confirmed',
      },
    })
      .then(r => setMeetings(r.data.data ?? []))
      .catch(logError)
      .finally(() => { if (!silent) setLoadingMeetings(false) })
  }, [])

  useEffect(() => {
    fetchMeetings(false)
  }, [location.key, fetchMeetings])

  useEffect(() => {
    api.get('/wallet')
      .then((r) => {
        const w = r.data?.data
        const minor = (w?.available_minor ?? w?.balance_minor ?? 0)
        setBalance(Math.floor(minor / 100))
      })
      .catch(() => setBalance(0))
  }, [])

  useEffect(() => {
    return subscribeActiveMeetingsRefresh(() => {
      fetchMeetings(true)
    })
  }, [fetchMeetings])

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) fetchMeetings(true)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [fetchMeetings])

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) fetchMeetings(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fetchMeetings])

  const activeBookings = meetings

  useLayoutEffect(() => {
    gsap.set(headerRef.current,    { autoAlpha: 0, y: -44 })
    gsap.set(ordersRef.current,    { autoAlpha: 0, y: 20  })
    gsap.set(section1Ref.current,  { autoAlpha: 0, y: 24  })
    gsap.set(section2Ref.current,  { autoAlpha: 0, y: 24  })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current,    { autoAlpha: 1, y: 0, duration: 0.38, ease: 'expo.out' })
      .to(ordersRef.current,     { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.08)
      .to(section1Ref.current,   { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.14)
      .to(section2Ref.current,   { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.20)
  })

  useEffect(() => {
    if (!loadingMeetings && activeBookings.length > 0) {
      gsap.fromTo(
        ordersRef.current,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' },
      )
    } else if (!loadingMeetings && activeBookings.length === 0) {
      gsap.to(ordersRef.current, { autoAlpha: 0, duration: 0.25 })
    }
  }, [loadingMeetings, activeBookings.length])

  return (
    <>
      <section className="flex flex-col min-h-screen bg-white">

        <header ref={headerRef} className="w-full py-6 bg-white fixed top-0 z-50">
          <div className="container flex justify-center">
            <h1 className="text-black text-base/[100%] font-[500]">Еще</h1>
          </div>
        </header>

        <div className="flex flex-col gap-4 container pt-[76px] pb-[120px]">

          <div ref={ordersRef} className="flex flex-col gap-3">
            {loadingMeetings ? (
              <p className="text-[#7F7F7F] text-sm/[100%] font-medium">Загрузка...</p>
            ) : activeBookings.length > 0 ? (
              <>
                <SectionLabel>Текущие заказы</SectionLabel>
                <div className="flex flex-col gap-2 rounded-2xl overflow-hidden">
                  {activeBookings.map(m => (
                    <BookingCard
                      key={m.id}
                      meeting={m}
                      onClick={() => navigate(`/meeting?id=${m.id}`)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div ref={section1Ref} className="flex flex-col gap-4">
            <SectionLabel>Важное</SectionLabel>
            <MenuItem icon={<IconUser />} label="Профиль" onClick={() => navigate('/profile')} />
            <MenuItem icon={<IconWithdraw />} label="Вывести средства" onClick={() => setWithdrawOpen(true)} />
            <div className="w-full flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-4">
              <span className="text-black text-[15px]/[100%] font-medium">Получать уведомления в ТГ</span>
              <Toggle value={notifications} onChange={handleNotificationsChange} />
            </div>
          </div>

          <div ref={section2Ref} className="flex flex-col gap-4">
            <SectionLabel>Другое</SectionLabel>
            <MenuItem icon={<IconSupport />} label="F.A.Q." onClick={() => setFaqOpen(true)} />
            <MenuItem icon={<IconSupport />} label="Написать в поддержку" onClick={() => navigate('/support')} />
          </div>

        </div>

      </section>

      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance}
      />
    </>
  )
}
