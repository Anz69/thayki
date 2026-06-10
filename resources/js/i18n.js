import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from '@/locales/ru.json'
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'

const SUPPORTED = ['ru', 'en', 'zh']

function detectLanguage() {
  try {
    const stored = localStorage.getItem('lang')
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch {}
  try {
    const tg = (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || '').toLowerCase()
    if (tg.startsWith('zh')) return 'zh'
    if (tg.startsWith('en')) return 'en'
  } catch {}
  return 'ru'
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLanguage(lng) {
  if (!SUPPORTED.includes(lng)) return
  i18n.changeLanguage(lng)
  try { localStorage.setItem('lang', lng) } catch {}
  import('@/utils/api')
    .then(({ default: api }) => api.patch('/me', { language_code: lng }))
    .catch(() => {})
}

export default i18n
