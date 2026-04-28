export default function BannedPage() {
  const handleSupport = () => {
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/ThaikyChat')
    } else {
      window.open('https://t.me/ThaikyChat', '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-3">Аккаунт заблокирован</h1>

      <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-xs">
        Доступ к приложению ограничен. Если вы считаете это ошибкой, свяжитесь с поддержкой.
      </p>

      <button
        onClick={handleSupport}
        className="w-full max-w-xs py-3 rounded-2xl bg-[#E2319B] text-white text-sm font-semibold active:opacity-80 transition-opacity"
      >
        Написать в поддержку
      </button>
    </div>
  )
}
