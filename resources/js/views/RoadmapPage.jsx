import { useState } from 'react'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import useBookingStore from '@/stores/useBookingStore'
import useMeetingStore from '@/stores/useMeetingStore'
import useModelMeetingStore from '@/stores/useModelMeetingStore'
import PaymentSheet from '@/components/modals/PaymentSheet'
import FinishMeetingModal from '@/components/modals/FinishMeetingModal'
import FaqModal from '@/components/modals/FaqModal'
import HowItWorksModal from '@/components/modals/HowItWorksModal'
import WithdrawModal from '@/components/modals/WithdrawModal'
import MetricsModal from '@/components/modals/MetricsModal'
import AgeModal from '@/components/modals/AgeModal'
import ChangeMediaModal from '@/components/modals/ChangeMediaModal'
import InfoModal from '@/components/modals/InfoModal'
const DEMO_BOOKING = {
  selectedDate:     new Date().toISOString(),
  selectedHour:     19,
  selectedMinute:   0,
  selectedDuration: { id: 2, label: '3 часа', hours: 3, price: 5000 },
}
function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs/[100%] font-semibold uppercase tracking-widest text-[#ABABAB] px-1">
        {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
function Row({ label, sub, onClick, badge, danger }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-between w-full px-4 py-3.5 rounded-2xl text-left active:scale-[0.98] transition-transform',
        danger ? 'bg-[#FFF0F5]' : 'bg-[#F5F5F7]',
      ].join(' ')}
    >
      <div className="flex flex-col gap-0.5">
        <span className={`text-sm/[100%] font-semibold ${danger ? 'text-[#E2319B]' : 'text-black'}`}>
          {label}
        </span>
        {sub && <span className="text-xs/[130%] text-[#ABABAB] font-medium">{sub}</span>}
      </div>
      {badge && (
        <span className="text-xs/[100%] font-semibold p-2 rounded-full bg-white text-[#7F7F7F]">
          {badge}
        </span>
      )}
    </button>
  )
}
function StepRow({ label, steps, onStep }) {
  return (
    <div className="bg-[#F5F5F7] rounded-2xl overflow-hidden">
      <div className="px-4 pt-3.5 pb-2">
        <span className="text-sm/[100%] font-semibold text-black">{label}</span>
      </div>
      <div className="flex flex-col gap-3 px-2 pb-2">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => onStep(s)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white active:bg-[#F0F0F0] transition-colors"
          >
            <span className="text-sm/[100%] font-medium text-black">{s.label}</span>
            <span className="text-xs/[100%] font-medium text-[#ABABAB]">{s.badge}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
export default function RoadmapPage() {
  const navigate = useTransitionNavigate()
  const booking  = useBookingStore()
  const meeting  = useMeetingStore()
  const modelMtg = useModelMeetingStore()
  const [paymentOpen,    setPaymentOpen]    = useState(false)
  const [finishOpen,     setFinishOpen]     = useState(false)
  const [faqOpen,        setFaqOpen]        = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [withdrawOpen,   setWithdrawOpen]   = useState(false)
  const [metricsOpen,    setMetricsOpen]    = useState(false)
  const [ageOpen,        setAgeOpen]        = useState(false)
  const [mediaOpen,      setMediaOpen]      = useState(false)
  const [infoOpen,       setInfoOpen]       = useState(false)
  const goMeeting = (status) => {
    booking.setState(DEMO_BOOKING)
    meeting.reset()
    if (status === 'accepted')  meeting.setAccepted()
    if (status === 'confirmed') { meeting.setAccepted(); setTimeout(() => meeting.setConfirmed(), 0) }
    navigate('/meeting')
  }
  const goModelMeeting = (status) => {
    booking.setState(DEMO_BOOKING)
    modelMtg.reset()
    if (status === 'accepted') modelMtg.setStatus('accepted')
    if (status === 'paid') modelMtg.setStatus('paid')
    if (status === 'confirmed') { modelMtg.setStatus('paid'); setTimeout(() => modelMtg.setConfirmed(), 0) }
    navigate('/meeting')
  }
  const openBookingStep = (step) => {
    booking.setState({ ...DEMO_BOOKING, isOpen: true, step })
  }
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-[#F0F0F0] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-base/[100%] font-[500] text-black">Roadmap</h1>
            <p className="text-xs/[100%] text-[#ABABAB] font-medium">Навигация по всем экранам</p>
          </div>
          <span className="text-[10px]/[100%] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-[#FFF0F5] text-[#E2319B]">
            dev only
          </span>
        </div>
      </header>
      <div className="flex flex-col gap-6 px-5 py-6 pb-16">
        <Section title="Страницы — модель">
          <Row label="Главная (Landing)"        sub="/"              badge="→" onClick={() => navigate('/')} />
          <Row label="Список моделей"           sub="/home"          badge="→" onClick={() => navigate('/home')} />
          <Row label="Профиль модели"           sub="/model/1"       badge="→" onClick={() => navigate('/model/1')} />
          <Row label="Чат"                      sub="/chat"          badge="→" onClick={() => navigate('/chat')} />
          <Row label="Еще"                      sub="/more"          badge="→" onClick={() => navigate('/more')} />
          <Row label="Профиль (редактирование)" sub="/profile"       badge="→" onClick={() => navigate('/profile')} />
          <Row label="Стать моделью"            sub="/become-model"  badge="→" onClick={() => navigate('/become-model')} />
        </Section>
        <Section title="Страницы — клиент">
          <Row label="Кабинет клиента" sub="/home"    badge="→" onClick={() => navigate('/home')} />
          <Row label="Еще (клиент)"    sub="/more"      badge="→" onClick={() => navigate('/more')} />
          <Row label="Еще (модель)"    sub="/more" badge="→" onClick={() => navigate('/more')} />
        </Section>
        <Section title="Встреча — клиент">
          <StepRow
            label="/meeting"
            steps={[
              { id: 'pending',   label: 'Шаг 1 — Ожидание ответа модели',   badge: 'pending'   },
              { id: 'accepted',  label: 'Шаг 2 — Модель приняла запрос',     badge: 'accepted'  },
              { id: 'confirmed', label: 'Шаг 3 — Бронирование подтверждено', badge: 'confirmed' },
            ]}
            onStep={(s) => goMeeting(s.id)}
          />
        </Section>
        <Section title="Встреча — модель">
          <StepRow
            label="/meeting"
            steps={[
              { id: 'pending',         label: 'Шаг 1 — Ожидание вашего ответа',     badge: 'pending'         },
              { id: 'accepted', label: 'Шаг 2 — Ожидание оплаты от клиента', badge: 'accepted' },
              { id: 'paid',     label: 'Шаг 3 — Оплата подтверждена',         badge: 'paid'     },
              { id: 'confirmed',label: 'Шаг 4 — Встреча подтверждена',         badge: 'confirmed'},
            ]}
            onStep={(s) => goModelMeeting(s.id)}
          />
        </Section>
        <Section title="Модалки — бронирование и оплата">
          <StepRow
            label="Бронирование (RegistrationModal)"
            steps={[
              { id: 1, label: 'Шаг 1 — Выбор даты',     badge: 'DateStep'     },
              { id: 2, label: 'Шаг 2 — Выбор времени',   badge: 'TimeStep'     },
              { id: 3, label: 'Шаг 3 — Длительность',    badge: 'DurationStep' },
              { id: 4, label: 'Шаг 4 — Финальный экран', badge: 'FinishStep'   },
            ]}
            onStep={(s) => openBookingStep(s.id)}
          />
          <StepRow
            label="Оплата (PaymentSheet)"
            steps={[
              { id: 'main',   label: 'Главный экран — выбор метода', badge: 'MainStep'   },
              { id: 'crypto', label: 'Крипта — USDT / BTC / TON',    badge: 'CryptoStep' },
              { id: 'sbp',    label: 'СБП — QR оплата',              badge: 'SBPStep'    },
            ]}
            onStep={() => setPaymentOpen(true)}
          />
          <Row label="Завершение встречи (FinishMeetingModal)" badge="→" onClick={() => setFinishOpen(true)} />
        </Section>
        <Section title="Модалки — профиль модели">
          <Row label="Как это работает (HowItWorksModal)" badge="→" onClick={() => setHowItWorksOpen(true)} />
          <Row label="Вывод средств (WithdrawModal)"       badge="→" onClick={() => setWithdrawOpen(true)} />
          <Row label="Метрики (MetricsModal)"              badge="→" onClick={() => setMetricsOpen(true)} />
          <Row label="Возраст (AgeModal)"                  badge="→" onClick={() => setAgeOpen(true)} />
          <Row label="Изменить медиа (ChangeMediaModal)"   badge="→" onClick={() => setMediaOpen(true)} />
          <Row label="Информация (InfoModal)"              badge="→" onClick={() => setInfoOpen(true)} />
        </Section>
        <Section title="Модалки — общие">
          <Row label="FAQ (FaqModal)" badge="→" onClick={() => setFaqOpen(true)} />
        </Section>
      </div>
      <PaymentSheet      isOpen={paymentOpen}    onClose={() => setPaymentOpen(false)}    price={5000} />
      <FinishMeetingModal isOpen={finishOpen}    onClose={() => setFinishOpen(false)} />
      <FaqModal           isOpen={faqOpen}       onClose={() => setFaqOpen(false)} />
      <HowItWorksModal    isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <WithdrawModal      isOpen={withdrawOpen}  onClose={() => setWithdrawOpen(false)} />
      <MetricsModal       isOpen={metricsOpen}   onClose={() => setMetricsOpen(false)} />
      <AgeModal           isOpen={ageOpen}       onClose={() => setAgeOpen(false)} />
      <ChangeMediaModal   isOpen={mediaOpen}     onClose={() => setMediaOpen(false)} />
      <InfoModal          isOpen={infoOpen}      onClose={() => setInfoOpen(false)} />
    </div>
  )
}