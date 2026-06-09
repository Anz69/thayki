import { useTranslation } from 'react-i18next'
import ModalMiddle from '@/layout/ModalMiddle'

const PINK_GRAD = 'linear-gradient(135deg, #F857B0 0%, #C01A7E 100%)'

const DiamondIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 3.5h12l3.5 5.2L12 21 2.5 8.7 6 3.5Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M2.5 8.7h19M9 3.5 7.5 8.7 12 21M15 3.5l1.5 5.2L12 21" stroke="#fff" strokeWidth="1" strokeLinejoin="round" opacity="0.55" />
  </svg>
)

const SparkleIcon = ({ size = 22, color = '#E2319B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9L20.5 11l-4.9 1.5a3 3 0 0 0-1.9 1.9L12 19.5l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.5 11l4.9-1.5a3 3 0 0 0 1.9-1.9L12 2.5Z" />
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="#fff" strokeWidth="1.7" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)
const ShieldSparkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden>
    <path d="M12 4l1.2 3.4a2 2 0 0 0 1.4 1.4L18 10l-3.4 1.2a2 2 0 0 0-1.4 1.4L12 16l-1.2-3.4a2 2 0 0 0-1.4-1.4L6 10l3.4-1.2a2 2 0 0 0 1.4-1.4L12 4Z" />
    <circle cx="18" cy="17" r="1.4" />
  </svg>
)
const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="8" r="3.2" stroke="#fff" strokeWidth="1.7" />
    <path d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

/**
 * V.I.P explainer — purely informational. "Continue" hands control back to the
 * page, which switches the request form into V.I.P mode.
 */
export default function VipModal({ isOpen, onClose, onContinue }) {
  const { t } = useTranslation()

  const features = [
    { icon: <LockIcon />, text: t('vip.b1') },
    { icon: <ShieldSparkIcon />, text: t('vip.b2') },
    { icon: <PersonIcon />, text: t('vip.b3') },
  ]

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-2 pb-6 flex flex-col gap-5">
        {/* Icon + sparkle */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div
              className="size-16 rounded-full flex items-center justify-center"
              style={{ background: '#161616', boxShadow: '0 12px 30px rgba(226,49,155,0.38)' }}
            >
              <DiamondIcon size={38} />
            </div>
            <span className="absolute -top-2 -right-3"><SparkleIcon size={20} /></span>
            <span className="absolute -bottom-1 -left-3 opacity-70"><SparkleIcon size={12} /></span>
          </div>
          <h2 className="text-black text-[22px]/[110%] font-bold">{t('vip.title')}</h2>
          <p className="text-[#8A8A90] text-[14px]/[140%] font-medium max-w-[300px]">{t('vip.subtitle')}</p>
        </div>

        {/* Feature list */}
        <div
          className="rounded-2xl p-1.5"
          style={{ background: 'linear-gradient(180deg, #FBF2F8 0%, #FAF4FA 100%)' }}
        >
          {features.map((f, i) => (
            <div key={i}>
              {i > 0 && <div className="mx-4 h-px bg-black/[0.06]" />}
              <div className="flex items-center gap-3.5 px-3 py-3">
                <span
                  className="shrink-0 size-9 rounded-full flex items-center justify-center"
                  style={{ background: PINK_GRAD, boxShadow: '0 4px 12px rgba(226,49,155,0.28)' }}
                >
                  {f.icon}
                </span>
                <p className="text-[#3A3A3E] text-[14px]/[134%] font-medium">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-[1fr_1.25fr] gap-2.5">
          <button
            onClick={onClose}
            className="py-3.5 rounded-full bg-[#F0F0F3] text-black text-[15px] font-semibold active:bg-[#E6E4EB] transition-colors"
          >
            {t('vip.back')}
          </button>
          <button
            onClick={onContinue}
            className="py-3.5 rounded-full text-white text-[15px] font-semibold active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(120deg, #2A0E22 0%, #C01A7E 58%, #E2319B 100%)',
              boxShadow: '0 12px 30px rgba(226,49,155,0.45)',
            }}
          >
            {t('vip.continue')}
          </button>
        </div>
      </div>
    </ModalMiddle>
  )
}
