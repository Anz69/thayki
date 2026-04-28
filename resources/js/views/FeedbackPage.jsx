import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'

export default function FeedbackPage() {
  const [params]   = useSearchParams()
  const navigate   = useTransitionNavigate()
  const meetingId  = params.get('meeting')

  const [mode, setMode]           = useState('loading')
  const [body, setBody]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const headerRef = useRef(null)
  const cardRef   = useRef(null)

  useLayoutEffect(() => {
    gsap.set(headerRef.current, { autoAlpha: 0, y: -20 })
    gsap.set(cardRef.current,   { autoAlpha: 0, y: 18 })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'expo.out' })
      .to(cardRef.current,   { autoAlpha: 1, y: 0, duration: 0.42, ease: 'expo.out' }, 0.08)
  })

  useEffect(() => {
    if (!meetingId) { setMode('choice'); return }
    api.get(`/complaints?meeting_id=${meetingId}`)
      .then(({ data }) => {
        const list = data?.data ?? []
        const complaint = list.find(c => c.subject === 'Жалоба после встречи')
        const review    = list.find(c => c.subject === 'Отзыв')
        if (complaint || review) {
          setMode('done')
        } else {
          setMode('choice')
        }
      })
      .catch(() => setMode('choice'))
  }, [meetingId])

  async function submitComplaint() {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/complaints', {
        meeting_id: meetingId ? Number(meetingId) : undefined,
        subject: 'Жалоба после встречи',
        body: body.trim(),
      }, {
        headers: { 'Idempotency-Key': `complaint-${meetingId}-${Date.now()}` },
      })
      setMode('done')
    } catch (e) {
      setError(e?.response?.data?.error?.message ?? 'Не удалось отправить жалобу. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitReview() {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/complaints', {
        meeting_id: meetingId ? Number(meetingId) : undefined,
        subject: 'Отзыв',
        body: body.trim(),
      }, {
        headers: { 'Idempotency-Key': `review-${meetingId}-${Date.now()}` },
      })
      setMode('done')
    } catch (e) {
      setError(e?.response?.data?.error?.message ?? 'Не удалось отправить отзыв. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="flex flex-col min-h-screen bg-white">
      <header ref={headerRef} className="w-full py-7 bg-white">
        <div className="container flex items-center relative">
          <button
            onClick={() => navigate('/home')}
            className="px-3.5 py-2.5 bg-[#EFEEF3] absolute left-4 text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
          >
            На главную
          </button>
          <div className="w-full flex justify-center">
            <h1 className="text-black text-base/[100%] font-medium">Обратная связь</h1>
          </div>
        </div>
      </header>

      <div ref={cardRef} className="container pt-6 pb-[120px] flex flex-col gap-5">
        {mode === 'loading' && (
          <div className="flex justify-center pt-10">
            <div className="w-6 h-6 rounded-full border-2 border-[#E2319B] border-t-transparent animate-spin" />
          </div>
        )}

        {mode === 'choice' && (
          <>
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-black text-2xl/[120%] font-semibold">Спасибо за встречу!</h2>
              <p className="text-[#7F7F7F] text-sm/[150%] font-medium">
                Поделитесь впечатлением — оставьте отзыв или, если что-то пошло не так, отправьте жалобу.
              </p>
            </div>
            <button
              onClick={() => { setBody(''); setError(''); setMode('review') }}
              className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              Оставить отзыв
            </button>
            <button
              onClick={() => { setBody(''); setError(''); setMode('complaint') }}
              className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              Написать жалобу
            </button>
          </>
        )}

        {mode === 'review' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-black text-xl/[120%] font-semibold">Оставьте отзыв</h2>
            <p className="text-[#7F7F7F] text-sm/[150%] font-medium">
              Расскажите, как прошла встреча. Ваш отзыв поможет другим пользователям.
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Напишите ваш отзыв..."
              rows={6}
              maxLength={4096}
              className="w-full bg-[#F5F5F7] rounded-2xl px-4 py-3.5 text-black text-base/[140%] font-medium outline-none placeholder:text-[#ABABAB] placeholder:font-medium resize-none"
            />
            {!!error && (
              <p className="text-[#E2319B] text-sm/[140%] font-medium text-center">{error}</p>
            )}
            <button
              onClick={submitReview}
              disabled={submitting || body.trim().length < 3}
              className={[
                'w-full py-4 rounded-full text-base/[100%] font-semibold transition-opacity',
                (submitting || body.trim().length < 3)
                  ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
                  : 'bg-[#E2319B] text-white active:opacity-80',
              ].join(' ')}
            >
              {submitting ? 'Отправляем...' : 'Отправить отзыв'}
            </button>
            <button
              onClick={() => setMode('choice')}
              className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              Назад
            </button>
          </div>
        )}

        {mode === 'complaint' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-black text-xl/[120%] font-semibold">Опишите проблему</h2>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Что случилось? Постарайтесь описать подробно — это ускорит разбор."
              rows={6}
              maxLength={4096}
              className="w-full bg-[#F5F5F7] rounded-2xl px-4 py-3.5 text-black text-base/[140%] font-medium outline-none placeholder:text-[#ABABAB] placeholder:font-medium resize-none"
            />
            {!!error && (
              <p className="text-[#E2319B] text-sm/[140%] font-medium text-center">{error}</p>
            )}
            <button
              onClick={submitComplaint}
              disabled={submitting || body.trim().length < 3}
              className={[
                'w-full py-4 rounded-full text-base/[100%] font-semibold transition-opacity',
                (submitting || body.trim().length < 3)
                  ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
                  : 'bg-[#E2319B] text-white active:opacity-80',
              ].join(' ')}
            >
              {submitting ? 'Отправляем...' : 'Отправить жалобу'}
            </button>
            <button
              onClick={() => setMode('choice')}
              className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              Назад
            </button>
          </div>
        )}

        {mode === 'done' && (
          <div className="flex flex-col items-center gap-5 text-center pt-4">
            <div className="w-16 h-16 rounded-full bg-[#E2319B]/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E2319B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-black text-2xl/[120%] font-semibold">Спасибо!</h2>
            <p className="text-[#7F7F7F] text-sm/[150%] font-medium max-w-[280px]">
              Мы обязательно рассмотрим ваше обращение и свяжемся в чате поддержки.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="w-full py-4 rounded-full bg-[#E2319B] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              На главную
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
