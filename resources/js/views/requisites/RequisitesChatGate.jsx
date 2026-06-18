import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

export default function RequisitesChatGate() {
  const { t } = useTranslation()
  const navigate = useTransitionNavigate()
  const [failed, setFailed] = useState(false)
  const done = useRef(false)

  const open = () => {
    setFailed(false)
    api.get('/chats/requisites')
      .then((r) => {
        const id = r?.data?.data?.id
        if (!id) { setFailed(true); return }
        done.current = true
        navigate(`/request/chat?id=${id}&kind=requisites&from=${encodeURIComponent('/home')}`, { replace: true })
      })
      .catch((e) => { logError(e); setFailed(true) })
  }

  useEffect(() => {
    if (done.current) return
    open()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFB] gap-4 px-8 text-center">
      {!failed ? (
        <div className="size-9 rounded-full border-[3px] border-[#E2319B] border-t-transparent animate-spin" />
      ) : (
        <>
          <p className="text-[#7F7F7F] text-sm">{t('common.somethingWrong')}</p>
          <button
            onClick={open}
            className="px-5 py-3 rounded-full bg-[#E2319B] text-white text-sm font-semibold active:opacity-80 transition-opacity"
          >
            {t('common.retry')}
          </button>
        </>
      )}
    </main>
  )
}
