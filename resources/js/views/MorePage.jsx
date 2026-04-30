import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import FaqModal from '@/components/modals/FaqModal'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import WithdrawModal from '@/components/modals/WithdrawModal'
import GradientBorder from '@/components/ui/GradientBorder'
import useAuthStore from '@/stores/useAuthStore'
import Avatar from '@/components/ui/Avatar'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const IconQuestion = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <g clipPath="url(#clip_q_more)">
      <path d="M7.36153 7.31418C7.42966 7.1205 7.53199 6.94248 7.6622 6.7878C7.78455 6.64246 7.93151 6.51773 8.09783 6.41998C8.44115 6.21821 8.8448 6.14445 9.23729 6.21178C9.62978 6.2791 9.98578 6.48315 10.2422 6.7878C10.4987 7.09245 10.6391 7.47804 10.6385 7.87626C10.6385 9.00042 8.95222 9.5625 8.95222 9.5625V9.71778M8.97404 11.8125H8.98154M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="clip_q_more"><rect width="18" height="18" fill="white" /></clipPath>
    </defs>
  </svg>
)

const IconSupport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <g clipPath="url(#clip_sup_more)">
      <path d="M4.875 15.2462L7.59984 12.5213M5.41959 10.459L2.81934 13.0592M5.41959 7.54085L2.75368 4.87493M4.91103 2.78965L7.37132 5.24993M13.0377 15.1589L10.5173 12.6386M12.5803 10.459L15.1736 13.0523M13.125 2.75354L10.5173 5.36124M12.6213 7.49993L15.1913 4.92984M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9ZM12.75 8.99998C12.75 11.071 11.0711 12.75 9 12.75C6.92893 12.75 5.25 11.071 5.25 8.99998C5.25 6.92891 6.92893 5.24998 9 5.24998C11.0711 5.24998 12.75 6.92891 12.75 8.99998Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="clip_sup_more"><rect width="18" height="18" fill="white" /></clipPath>
    </defs>
  </svg>
)

function SectionLabel({ children }) {
  return (
    <p className="text-[#7F7F7F] text-[14px]/[100%] font-medium uppercase tracking-[0.1em] px-1">
      {children}
    </p>
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
  pending: 'Ожидает подтверждения',
  accepted: 'Принято',
  paid: 'Оплачено',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  expired: 'Истекло',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d)) return '—'
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${days[d.getDay()]}, ${dd}.${mm}, ${hh}:${min}`
  } catch { return '—' }
}

function OrderCard({ meeting, currentUserId, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)

  const isClient = meeting.client_id === currentUserId
  const counterName = isClient
    ? (meeting.model_profile?.display_name ?? '—')
    : (meeting.client?.first_name ?? meeting.client?.username ?? 'Клиент')
  const counterPhoto = isClient
    ? (meeting.model_profile?.user?.photo_url ?? meeting.model_profile?.photos?.find(p => p.is_main)?.url ?? meeting.model_profile?.photos?.[0]?.url ?? null)
    : (meeting.client?.photo_url ?? null)

  const statusLabel = STATUS_MAP[meeting.status] ?? meeting.status
  const price = meeting.price_thb ?? 0
  const duration = meeting.duration_hours ? `${meeting.duration_hours} ч` : '—'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#F5F5F7] rounded-2xl px-4 py-3.5 flex flex-col gap-2.5 active:bg-[#ECEAEC] transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full shrink-0 overflow-hidden flex items-center justify-center" {...(!counterPhoto ? { style: { background: '#E2319B' } } : {})}>
            {counterPhoto && !imgFailed
              ? <img src={counterPhoto} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
              : <span className="text-white text-[10px] font-bold">{counterName[0]?.toUpperCase()}</span>
            }
          </div>
          <span className="text-black text-[15px]/[100%] font-[500]">{counterName}</span>
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

const IconWithdraw = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M9.6665 9.33366C12.0597 9.33366 13.9998 7.39356 13.9998 5.00033C13.9998 2.60709 12.0597 0.666992 9.6665 0.666992C7.27327 0.666992 5.33317 2.60709 5.33317 5.00033M4.08048 7.83366H5.08048V11.5003M4.08048 11.5003H6.08048M0.666504 9.66699C0.666504 12.0602 2.6066 14.0003 4.99984 14.0003C7.39307 14.0003 9.33317 12.0602 9.33317 9.66699C9.33317 7.27376 7.39307 5.33366 4.99984 5.33366C2.6066 5.33366 0.666504 7.27376 0.666504 9.66699Z" stroke="black" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function MorePage() {
  const navigate = useTransitionNavigate()
  const auth = useAuthStore()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
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
  const [meetings, setMeetings] = useState([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [balance, setBalance] = useState(auth.user?.balance ?? 0)
  const [withdrawMethods, setWithdrawMethods] = useState(['usdt', 'btc', 'ton'])

  const headerRef = useRef(null)
  const userCardRef = useRef(null)
  const ordersRef = useRef(null)
  const section1Ref = useRef(null)
  const section2Ref = useRef(null)

  useEffect(() => {
    api.get('/meetings', {
      params: {
        per_page: 20,
        statuses: 'pending,accepted,paid,confirmed',
      },
    })
      .then(r => setMeetings(r.data.data ?? []))
      .catch(logError)
      .finally(() => setLoadingMeetings(false))

    api.get('/wallet')
      .then(r => {
        const w = r.data.data
        setBalance(Math.floor((w?.available_minor ?? w?.balance_minor ?? 0) / 100))
        const methods = Array.isArray(w?.withdrawal_methods) ? w.withdrawal_methods : []
        setWithdrawMethods(methods.length ? methods : ['usdt', 'btc', 'ton'])
      })
      .catch(() => setBalance(0))
  }, [])

  useLayoutEffect(() => {
    gsap.set(headerRef.current, { autoAlpha: 0, y: -44 })
    gsap.set(userCardRef.current, { autoAlpha: 0, y: 16 })
    gsap.set(ordersRef.current, { autoAlpha: 0, y: 20 })
    gsap.set(section1Ref.current, { autoAlpha: 0, y: 24 })
    gsap.set(section2Ref.current, { autoAlpha: 0, y: 24 })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'expo.out' })
      .to(userCardRef.current, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.08)
      .to(section1Ref.current, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.14)
      .to(section2Ref.current, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.20)
  })

  const activeMeetings = meetings

  useEffect(() => {
    if (!loadingMeetings && activeMeetings.length > 0) {
      gsap.fromTo(
        ordersRef.current,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' },
      )
    } else if (!loadingMeetings && activeMeetings.length === 0) {
      gsap.to(ordersRef.current, { autoAlpha: 0, duration: 0.25 })
    }
  }, [loadingMeetings, activeMeetings.length])

  return (
    <>
      <section className="flex flex-col min-h-screen bg-white">

        <header ref={headerRef} className="w-full py-6 bg-white fixed top-0 z-50">
          <div className="container flex justify-center">
            <h1 className="text-black text-base/[100%] font-[500]">Еще</h1>
          </div>
        </header>

        <div className="flex flex-col gap-4 container pt-[76px] pb-[120px]">

          <div ref={userCardRef} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-2xl p-4">
              <Avatar src={auth.user?.photo_url} name={auth.displayName()} size={56} />
              <div className="flex flex-col">
                <span className="text-black text-base font-medium">{auth.displayName()}</span>
                {auth.user?.username && (
                  <span className="text-[#7F7F7F] text-xs">@{auth.user.username}</span>
                )}
              </div>
            </div>
          </div>


          <div ref={ordersRef} className="flex flex-col gap-3">
            {activeMeetings.length > 0 && (
              <>
                <SectionLabel>Текущие заказы</SectionLabel>
                <div className="flex flex-col gap-2 rounded-2xl overflow-hidden">
                  {activeMeetings.map(m => (
                    <OrderCard
                      key={m.id}
                      meeting={m}
                      currentUserId={auth.user?.id}
                      onClick={() => navigate(`/meeting?id=${m.id}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div ref={section1Ref} className="flex flex-col gap-4">
            <SectionLabel>Важное</SectionLabel>

            <button
              onClick={() => setHowItWorksOpen(true)}
              className="w-full flex items-center gap-2.5 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <IconQuestion />
              </span>
              <span className="text-black text-[16px]/[100%] font-medium">Как это работает?</span>
            </button>

            <div className="w-full flex items-center justify-between bg-[#EFEEF3] rounded-xl px-4 py-4.5">
              <span className="text-black text-[16px]/[100%] font-medium">Изменить город</span>
              <span className="text-[#777779] text-sm/[100%] font-medium">Пока недоступно</span>
            </div>

            <div className="w-full flex items-center justify-between bg-[#EFEEF3] rounded-xl px-4 py-4">
              <span className="text-black text-[16px]/[100%] font-medium">Получать уведомления в ТГ</span>
              <Toggle value={notifications} onChange={handleNotificationsChange} />
            </div>
          </div>

          <div ref={section2Ref} className="flex flex-col gap-4">
            <SectionLabel>Дополнительно</SectionLabel>

            <button
              onClick={() => setFaqOpen(true)}
              className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <IconQuestion />
              </span>
              <span className="text-black text-[16px]/[100%] font-medium">F.A.Q.</span>
            </button>

            <button
              onClick={() => navigate('/support')}
              className="w-full flex items-center gap-3 bg-[#EFEEF3] rounded-xl px-4 py-4.5 active:bg-[#ECEAEC] transition-colors"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                <IconSupport />
              </span>
              <span className="text-black text-[16px]/[100%] font-medium">Написать в поддержку</span>
            </button>
          </div>

        </div>

      </section>

      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <FaqModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance}
        methods={withdrawMethods}
      />
    </>
  )
}
