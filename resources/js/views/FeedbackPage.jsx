import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { usePageReady } from '@/composables/usePageReady'
import { useTransitionNavigate } from '@/composables/useTransitionNavigate'
import api from '@/utils/api'

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const StarIcon = ({ filled }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill={filled ? '#E2319B' : 'none'} stroke={filled ? '#E2319B' : '#D1D1D6'} strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

export default function FeedbackPage() {
  const [params]      = useSearchParams()
  const navigate      = useTransitionNavigate()
  const meetingId     = params.get('meeting') || null

  // 'loading' | 'choice' | 'review' | 'complaint'
  const [mode, setMode]           = useState('loading')
  const [body, setBody]           = useState('')
  const [stars, setStars]         = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [hasReview, setHasReview]       = useState(false)
  const [hasComplaint, setHasComplaint] = useState(false)
  const [justDone, setJustDone]   = useState(null) // 'review' | 'complaint' | null

  const headerRef  = useRef(null)
  const contentRef = useRef(null)

  useLayoutEffect(() => {
    gsap.set(headerRef.current,  { autoAlpha: 0, y: -20 })
    gsap.set(contentRef.current, { autoAlpha: 0, y: 20 })
  }, [])

  usePageReady(() => {
    gsap.timeline()
      .to(headerRef.current,  { autoAlpha: 1, y: 0, duration: 0.38, ease: 'expo.out' })
      .to(contentRef.current, { autoAlpha: 1, y: 0, duration: 0.42, ease: 'expo.out' }, 0.08)
  })

  const animateContent = useCallback(() => {
    gsap.fromTo(
      contentRef.current,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: 'expo.out' },
    )
  }, [])

  useEffect(() => {
    if (!meetingId) { setMode('choice'); return }
    api.get(`/complaints?meeting_id=${meetingId}`)
      .then(({ data }) => {
        const list = data?.data ?? []
        const foundReview    = list.some(c => c.subject === 'Отзыв')
        const foundComplaint = list.some(c => c.subject === 'Жалоба после встречи')
        setHasReview(foundReview)
        setHasComplaint(foundComplaint)
        setMode('choice')
      })
      .catch(() => setMode('choice'))
  }, [meetingId])

  const switchMode = useCallback((next) => {
    gsap.to(contentRef.current, {
      autoAlpha: 0, y: -10, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        setBody('')
        setStars(0)
        setHoveredStar(0)
        setError('')
        setMode(next)
        requestAnimationFrame(animateContent)
      },
    })
  }, [animateContent])

  async function submitReview() {
    if (submitting) return
    if (body.trim().length < 3 && stars === 0) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/complaints', {
        meeting_id: meetingId ? Number(meetingId) : undefined,
        subject: 'Отзыв',
        body: stars > 0 ? `★${stars} ${body.trim()}`.trim() : body.trim(),
      }, {
        headers: { 'Idempotency-Key': `review-${meetingId}-${Date.now()}` },
      })
      setHasReview(true)
      setJustDone('review')
      gsap.to(contentRef.current, {
        autoAlpha: 0, y: -10, duration: 0.18, ease: 'power2.in',
        onComplete: () => {
          setBody('')
          setStars(0)
          setMode('choice')
          requestAnimationFrame(animateContent)
        },
      })
    } catch (e) {
      setError(e?.response?.data?.error?.message ?? 'Не удалось отправить отзыв. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitComplaint() {
    if (!body.trim() || submitting) return
    if (body.trim().length < 3) return
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
      setHasComplaint(true)
      setJustDone('complaint')
      gsap.to(contentRef.current, {
        autoAlpha: 0, y: -10, duration: 0.18, ease: 'power2.in',
        onComplete: () => {
          setBody('')
          setMode('choice')
          requestAnimationFrame(animateContent)
        },
      })
    } catch (e) {
      setError(e?.response?.data?.error?.message ?? 'Не удалось отправить жалобу. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  const bothDone = hasReview && hasComplaint

  return (
    <section className="flex flex-col min-h-screen bg-white">

      <header ref={headerRef} className="w-full py-7 bg-white shrink-0">
        <div className="container flex items-center relative">
          {mode === 'review' || mode === 'complaint' ? (
            <button
              onClick={() => switchMode('choice')}
              className="px-3.5 py-2.5 bg-[#EFEEF3] absolute left-4 text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
            >
              Назад
            </button>
          ) : (
            <button
              onClick={() => navigate('/home')}
              className="px-3.5 py-2.5 bg-[#1C1C1E] absolute left-4 text-white text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
            >
              На главную
            </button>
          )}
          <div className="w-full flex justify-center">
            <h1 className="text-black text-base/[100%] font-medium">
              {mode === 'review' ? 'Ваш отзыв' : mode === 'complaint' ? 'Сообщить о проблеме' : 'Обратная связь'}
            </h1>
          </div>
        </div>
      </header>

      <div ref={contentRef} className="flex-1 container pb-[40px] pt-2 flex flex-col">

        {/* ── Loading ── */}
        {mode === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-[#EFEEF3] border-t-[#E2319B] animate-spin" />
          </div>
        )}

        {/* ── Choice ── */}
        {mode === 'choice' && (
          <div className="flex flex-col gap-6 pt-2">

            {/* Success banner after just submitting */}
            {justDone && (
              <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-2xl px-4 py-3.5">
                <div className="w-8 h-8 rounded-full bg-[#E2319B]/10 flex items-center justify-center shrink-0 text-[#E2319B]">
                  <CheckIcon />
                </div>
                <p className="text-black text-sm/[140%] font-medium">
                  {justDone === 'review'
                    ? 'Отзыв успешно отправлен — спасибо!'
                    : 'Жалоба принята. Разберёмся и напишем в поддержке.'}
                </p>
              </div>
            )}

            {/* Header block */}
            <div className="flex flex-col items-center gap-3 text-center py-2 pt-12">
      
              <h2 className="text-black text-2xl/[120%] font-[500]">
                {bothDone ? 'Всё отправлено!' : 'Встреча завершена'}
              </h2>
              <p className="text-[#7F7F7F] text-sm/[150%] max-w-[280px]">
                {bothDone
                  ? 'Спасибо за ваши отзывы. Это помогает нам стать лучше.'
                  : 'Поделитесь впечатлением или сообщите о проблеме — это займёт меньше минуты.'}
              </p>
            </div>

            {/* Action cards */}
            <div className="flex flex-col gap-3">

              {/* Review card */}
              <button
                onClick={() => !hasReview && switchMode('review')}
                disabled={hasReview}
                className={[
                  'w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-opacity',
                  hasReview
                    ? 'bg-[#F5F5F7] cursor-default'
                    : 'bg-[#E2319B] active:opacity-80',
                ].join(' ')}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={['text-base/[100%] font-[500]', hasReview ? 'text-[#7F7F7F]' : 'text-white'].join(' ')}>
                    {hasReview ? 'Отзыв отправлен' : 'Оставить отзыв'}
                  </span>
                  <span className={['text-xs/[140%]', hasReview ? 'text-[#BDBDBD]' : 'text-white/75'].join(' ')}>
                    {hasReview ? 'Вы уже оставили отзыв' : 'Расскажите, как всё прошло'}
                  </span>
                </div>
                {!hasReview && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </button>

              {/* Complaint card */}
              <button
                onClick={() => !hasComplaint && switchMode('complaint')}
                disabled={hasComplaint}
                className={[
                  'w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-opacity',
                  hasComplaint
                    ? 'bg-[#F5F5F7] cursor-default'
                    : 'bg-[#1C1C1E] active:opacity-80',
                ].join(' ')}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={['text-base/[100%] font-[500]', hasComplaint ? 'text-[#7F7F7F]' : 'text-white'].join(' ')}>
                    {hasComplaint ? 'Жалоба отправлена' : 'Сообщить о проблеме'}
                  </span>
                  <span className={['text-xs/[140%]', hasComplaint ? 'text-[#BDBDBD]' : 'text-[#888]'].join(' ')}>
                    {hasComplaint ? 'Мы уже занимаемся этим' : 'Что-то пошло не так?'}
                  </span>
                </div>
                {!hasComplaint && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </button>
            </div>

            {/* Home button */}
            <button
              onClick={() => navigate('/home')}
              className="w-full py-4 rounded-full bg-black/5 text-black text-base/[100%] font-[500] active:bg-[#ECEAEC] transition-colors mt-2"
            >
              На главную
            </button>
          </div>
        )}

        {mode === 'review' && (
          <div className="flex flex-col gap-5 pt-2">

            <div className="flex flex-col gap-1.5">
              <p className="text-black text-base/[100%] font-[500]">Оцените встречу</p>
              <p className="text-[#7F7F7F] text-sm/[140%]">Ваш отзыв увидят другие пользователи.</p>
            </div>

            {/* Stars */}
            <div className="flex gap-2 items-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-0.5 active:scale-95 transition-transform"
                >
                  <StarIcon filled={n <= (hoveredStar || stars)} />
                </button>
              ))}
              {stars > 0 && (
                <span className="text-sm text-[#7F7F7F] ml-1">
                  {['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично!'][stars]}
                </span>
              )}
            </div>

            {/* Text */}
            <div className="flex flex-col gap-2">
              <p className="text-black text-sm/[100%] font-medium">Комментарий <span className="text-[#BDBDBD] font-normal">(необязательно)</span></p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Расскажите подробнее — это поможет другим пользователям..."
                rows={5}
                maxLength={4096}
                className="w-full bg-[#F5F5F7] rounded-2xl px-4 py-3.5 text-black text-base/[140%] font-medium outline-none placeholder:text-[#BDBDBD] placeholder:font-normal resize-none"
              />
            </div>

            {!!error && (
              <p className="text-[#E2319B] text-sm/[140%] font-medium">{error}</p>
            )}

            <button
              onClick={submitReview}
              disabled={submitting || (stars === 0 && body.trim().length < 3)}
              className={[
                'w-full py-4 rounded-full text-base/[100%] font-[500] transition-opacity',
                (submitting || (stars === 0 && body.trim().length < 3))
                  ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
                  : 'bg-[#E2319B] text-white active:opacity-80',
              ].join(' ')}
            >
              {submitting ? 'Отправляем…' : 'Отправить отзыв'}
            </button>
          </div>
        )}

        {/* ── Complaint form ── */}
        {mode === 'complaint' && (
          <div className="flex flex-col gap-5 pt-2">

            <div className="flex flex-col gap-1.5">
              <p className="text-black text-base/[100%] font-[500]">Опишите проблему</p>
              <p className="text-[#7F7F7F] text-sm/[140%]">Чем подробнее — тем быстрее разберёмся.</p>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Что произошло? Укажите детали — это ускорит разбор."
              rows={7}
              maxLength={4096}
              className="w-full bg-[#F5F5F7] rounded-2xl px-4 py-3.5 text-black text-base/[140%] font-medium outline-none placeholder:text-[#BDBDBD] placeholder:font-normal resize-none"
            />

            <div className="bg-[#FFF8F0] rounded-2xl px-4 py-3 flex gap-3 items-start">

              <p className="text-[#7F7F7F] text-xs/[150%]">
                После отправки жалобы с вами свяжутся в чате поддержки. Обычно это занимает до 24 часов.
              </p>
            </div>

            {!!error && (
              <p className="text-[#E2319B] text-sm/[140%] font-medium">{error}</p>
            )}

            <button
              onClick={submitComplaint}
              disabled={submitting || body.trim().length < 3}
              className={[
                'w-full py-4 rounded-full text-base/[100%] font-[500] transition-opacity',
                (submitting || body.trim().length < 3)
                  ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
                  : 'bg-[#1C1C1E] text-white active:opacity-80',
              ].join(' ')}
            >
              {submitting ? 'Отправляем…' : 'Отправить жалобу'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
