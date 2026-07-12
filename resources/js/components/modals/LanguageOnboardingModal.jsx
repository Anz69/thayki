import ModalMiddle from '@/layout/ModalMiddle'
import { setLanguage } from '@/i18n'
import useAuthStore from '@/stores/useAuthStore'

const LANGS = [
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
]

export default function LanguageOnboardingModal({ isOpen }) {
  const patchUser = useAuthStore((s) => s.patchUser)

  const choose = (code) => {
    setLanguage(code)
    patchUser({ language_chosen: true })
  }

  return (
    <ModalMiddle isOpen={isOpen} onClose={undefined}>
      <div className="flex flex-col gap-5 p-6 pt-3">
        <div className="text-center">
          <h2 className="text-black text-xl/[110%] font-bold">Выберите язык</h2>
          <p className="text-[#8A8A8A] text-sm/[130%] mt-1.5">Choose language · 选择语言</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#F5F5F7] active:bg-[#ECEAEC] active:scale-[0.99] transition"
            >
              <span className="text-[22px] leading-none">{l.flag}</span>
              <span className="text-black text-[16px]/[100%] font-semibold">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ModalMiddle>
  )
}
