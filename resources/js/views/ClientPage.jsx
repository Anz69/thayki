import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import GradientBorder from '@/components/ui/GradientBorder'
import WithdrawModal from '@/components/modals/WithdrawModal'
import InfoModal from '@/components/modals/InfoModal'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/utils/api'

const STATUS_MAP = {
  pending:   { label: 'Ожидает подтверждения' },
  accepted:  { label: 'Принято' },
  paid:      { label: 'Оплачено' },
  confirmed: { label: 'Подтверждено' },
  completed: { label: 'Завершено' },
  cancelled: { label: 'Отменено' },
  expired:   { label: 'Истекло' },
  rejected:  { label: 'Отклонено' },
}

function formatMeetingDate(iso) {
  if (!iso) return '—'
  try {
    const d    = new Date(iso)
    if (isNaN(d)) return '—'
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const day  = days[d.getDay()]
    const dd   = String(d.getDate()).padStart(2, '0')
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const hh   = String(d.getHours()).padStart(2, '0')
    const min  = String(d.getMinutes()).padStart(2, '0')
    return `${day}, ${dd}.${mm}, ${hh}:${min}`
  } catch {
    return '—'
  }
}

const IconWithdraw = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M9.6665 9.33366C12.0597 9.33366 13.9998 7.39356 13.9998 5.00033C13.9998 2.60709 12.0597 0.666992 9.6665 0.666992C7.27327 0.666992 5.33317 2.60709 5.33317 5.00033M4.08048 7.83366H5.08048V11.5003M4.08048 11.5003H6.08048M0.666504 9.66699C0.666504 12.0602 2.6066 14.0003 4.99984 14.0003C7.39307 14.0003 9.33317 12.0602 9.33317 9.66699C9.33317 7.27376 7.39307 5.33366 4.99984 5.33366C2.6066 5.33366 0.666504 7.27376 0.666504 9.66699Z" stroke="black" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconHelp = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <g clipPath="url(#clip0_help)">
      <path d="M6.06016 5.99967C6.2169 5.55412 6.52626 5.17841 6.93347 4.9391C7.34067 4.69978 7.81943 4.6123 8.28495 4.69215C8.75047 4.772 9.17271 5.01402 9.47688 5.37536C9.78105 5.7367 9.94753 6.19402 9.94683 6.66634C9.94683 7.99968 7.94683 8.66634 7.94683 8.66634M8.00016 11.333H8.00683M14.6668 7.99967C14.6668 11.6816 11.6821 14.6663 8.00016 14.6663C4.31826 14.6663 1.3335 11.6816 1.3335 7.99967C1.3335 4.31778 4.31826 1.33301 8.00016 1.33301C11.6821 1.33301 14.6668 4.31778 14.6668 7.99967Z" stroke="#1E1E1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="clip0_help"><rect width="16" height="16" fill="white" /></clipPath>
    </defs>
  </svg>
)
const IconChevron = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="14" viewBox="0 0 8 14" fill="none">
    <path d="M1 1L7 7L1 13" stroke="#777779" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function OrderCard({ meeting, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  const s = STATUS_MAP[meeting.status] ?? { label: meeting.status }
  const modelName  = meeting.model_profile?.display_name ?? '—'
  const modelPhoto = meeting.model_profile?.photos?.find(p => p.is_main)?.url
    ?? meeting.model_profile?.photos?.[0]?.url
    ?? null
  const date     = formatMeetingDate(meeting.scheduled_at)
  const price    = meeting.price_thb ?? 0
  const duration = meeting.duration_hours ? `${meeting.duration_hours} ч` : '—'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#F5F5F7] rounded-2xl px-4 py-3.5 flex flex-col gap-2.5 active:bg-[#ECEAEC] transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full shrink-0 overflow-hidden bg-[#E2319B] flex items-center justify-center">
            {modelPhoto && !imgFailed
              ? <img src={modelPhoto} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
              : <span className="text-white text-[10px] font-bold leading-none">{modelName[0]?.toUpperCase()}</span>
            }
          </div>
          <span className="text-black text-[15px]/[100%] font-[500]">{modelName}</span>
        </div>
        <span className="text-[#777779] text-xs/[100%] font-medium">{date}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#777779] text-sm/[100%] font-medium">{s.label}</span>
        <span className="text-black text-sm/[100%] font-[500]">฿ {price.toLocaleString()} / {duration}</span>
      </div>
    </button>
  )
}

export default function ClientPage() {
  const navigate = useTransitionNavigate()
  const auth = useAuthStore()

  const [withdrawOpen, setWithdrawOpen]     = useState(false)
  const [infoOpen, setInfoOpen]             = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [meetings, setMeetings]             = useState([])
  const [balance, setBalance]               = useState(auth.user?.balance ?? 0)
  const [withdrawMethods, setWithdrawMethods] = useState(['usdt', 'btc', 'ton'])
  const [loadingMeetings, setLoadingMeetings] = useState(true)

  const balanceRef  = useRef(null)
  const inviteRef   = useRef(null)
  const questionRef = useRef(null)
  const ordersRef   = useRef(null)

  // Load meetings and wallet in parallel
  useEffect(() => {
    api.get('/meetings', {
      params: {
        per_page: 20,
        statuses: 'pending,accepted,paid,confirmed',
      },
    })
      .then(r => setMeetings(r.data.data ?? []))
      .catch(console.error)
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
    gsap.set(balanceRef.current,  { autoAlpha: 0, y: 24 })
    gsap.set(inviteRef.current,   { autoAlpha: 0, y: 20 })
    gsap.set(questionRef.current, { autoAlpha: 0, y: 20 })
    gsap.set(ordersRef.current,   { autoAlpha: 0, y: 20 })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(balanceRef.current,  { autoAlpha: 1, y: 0, duration: 0.44, ease: 'power3.out' })
      .to(inviteRef.current,   { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.1)
      .to(questionRef.current, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.1)
      .to(ordersRef.current,   { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power3.out' }, 0.18)
  })

  const activeMeetings = meetings

  return (
    <>
      <section className="flex flex-col min-h-screen bg-white">
        <div className="flex flex-col gap-7 pt-8 pb-20 container min-h-screen">

          <div className="invisible px-4" ref={balanceRef}>
            <GradientBorder radius={20} borderWidth={4} speed={4}>
              <div className="flex flex-col">
                <div className="flex flex-col items-center gap-2 px-5 py-6">
                  <span className="text-[#777779] text-[14px]/[100%] font-medium uppercase tracking-widest">
                    Баланс
                  </span>
                  <span className="text-black text-2xl/[100%] font-[500] tracking-tight">
                    {balance.toLocaleString()} ฿
                  </span>
                </div>
                <div className="border-t border-[#E1E0E7] flex">
                  <button
                    onClick={() => setWithdrawOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 active:bg-[#F5F5F7] transition-colors rounded-bl-[18px]"
                  >
                    <IconWithdraw />
                    <span className="text-black text-sm/[100%] font-medium">Вывести</span>
                  </button>
                  <div className="w-px bg-[#E1E0E7] h-7 rounded-full my-auto self-stretch" />
                  <button
                    onClick={() => setInfoOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 active:bg-[#F5F5F7] transition-colors rounded-br-[18px]"
                  >
                    <IconHelp />
                    <span className="text-black text-sm/[100%] font-medium">Помощь</span>
                  </button>
                </div>
              </div>
            </GradientBorder>
          </div>

          <div ref={questionRef} className="invisible">
            <button
              onClick={() => navigate('/support')}
              className="w-full flex items-center gap-3 bg-[#F5F5F7] rounded-2xl p-3 active:bg-[#ECEAEC] transition-colors"
            >
              <img src="/img/rectangle.png" alt="" className="w-9 h-9 object-contain rotate-[-8deg]" />
              <div className="flex-1 text-left flex flex-col gap-1.5">
                <span className="text-black text-base/[100%] font-[500]">У вас возник вопрос?</span>
                <span className="text-[#7F7F7F] text-xs/[100%] font-medium">Нажмите и мы решим его</span>
              </div>
              <div className="size-6 flex items-center justify-center">
                <IconChevron />
              </div>
            </button>
          </div>

          <div ref={ordersRef} className="invisible flex flex-col gap-4">
            <h2 className="text-black text-xl/[100%] font-[500]">Текущие заказы</h2>
            <div className="flex flex-col gap-4">
              {loadingMeetings ? (
                <p className="text-[#7F7F7F] text-sm/[100%] font-medium">Загрузка...</p>
              ) : activeMeetings.length === 0 ? (
                <p className="text-[#7F7F7F] text-sm/[100%] font-medium">Нет активных заказов</p>
              ) : (
                activeMeetings.map(m => (
                  <OrderCard
                    key={m.id}
                    meeting={m}
                    onClick={() => navigate(`/meeting?id=${m.id}`)}
                  />
                ))
              )}
            </div>
          </div>

          <button
            ref={inviteRef}
            className="invisible w-full flex items-center justify-between bg-[#F5F5F7] rounded-2xl p-4.5 active:bg-[#ECEAEC] transition-colors"
          >
            <span className="text-black text-base/[100%] font-medium">Пригласить модель</span>
            <span className="text-[#777779] text-sm/[100%] font-medium">Пока недоступно</span>
          </button>

        </div>
      </section>

      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance}
        methods={withdrawMethods}
      />
      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </>
  )
}
