import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import StepProgress from '../StepProgress'
import api from '@/utils/api'

const MAX_PHOTOS   = 6
const MIN_REQUIRED = 3

function EmptySlot({ onAdd }) {
  const inputRef = useRef(null)
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onAdd(file, URL.createObjectURL(file))
    e.target.value = ''
  }
  return (
    <div
      className="relative rounded-2xl flex items-end justify-end p-2"
      style={{ aspectRatio: '2/3', background: '#FDE8F5', border: '2.5px dashed #E2319B' }}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-10 h-10 absolute -bottom-2 right-0 rounded-full border-2 border-white bg-[#E2319B] flex items-center justify-center shadow-lg active:scale-90 transition-transform"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function FilledSlot({ src, onRemove }) {
  const slotRef = useRef(null)
  useEffect(() => {
    if (slotRef.current) {
      gsap.fromTo(
        slotRef.current,
        { scale: 0.75, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(1.6)' },
      )
    }
  }, [])
  return (
    <div ref={slotRef} className="relative rounded-2xl" style={{ aspectRatio: '2/3' }}>
      <img src={src} alt="" className="w-full h-full object-cover rounded-2xl" draggable={false} />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -bottom-2 right-0 w-9 h-9 rounded-full bg-[#EFEEF3] flex items-center justify-center border border-[#D0C2C2] active:scale-90 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L8 8M8 8L12 12M8 8L12 4M8 8L4 12" stroke="#777779" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function Step4Photos({ isActive, stepNum, totalSteps, onNext }) {
  // Each slot: { file: File, url: blobUrl } | null
  const [photos,    setPhotos]    = useState(Array(MAX_PHOTOS).fill(null))
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState(null)

  const headRef = useRef(null)
  const gridRef = useRef(null)
  const hintRef = useRef(null)
  const btnRef  = useRef(null)

  const addPhoto = useCallback((idx, file, url) => {
    setPhotos((prev) => {
      const next = [...prev]
      if (next[idx]?.url?.startsWith('blob:')) URL.revokeObjectURL(next[idx].url)
      next[idx] = { file, url }
      return next
    })
  }, [])

  const removePhoto = useCallback((idx) => {
    setPhotos((prev) => {
      const next = [...prev]
      if (next[idx]?.url?.startsWith('blob:')) URL.revokeObjectURL(next[idx].url)
      next[idx] = null
      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      setPhotos((prev) => {
        prev.forEach((p) => { if (p?.url?.startsWith('blob:')) URL.revokeObjectURL(p.url) })
        return Array(MAX_PHOTOS).fill(null)
      })
    }
  }, [])

  useLayoutEffect(() => {
    gsap.set([headRef.current, gridRef.current, hintRef.current, btnRef.current], { autoAlpha: 0, y: 20 })
  }, [])

  useEffect(() => {
    if (!isActive) return
    gsap.fromTo(
      [headRef.current, gridRef.current, hintRef.current, btnRef.current],
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.46,
        stagger: 0.07,
        ease: 'power3.out',
        delay: 0.08,
        clearProps: 'transform,opacity,visibility',
      },
    )
  }, [isActive])

  const filledSlots = photos.filter(Boolean)
  const filledCount = filledSlots.length
  const canProceed  = filledCount >= MIN_REQUIRED && !uploading

  const handleNext = async () => {
    if (!canProceed) return
    setUploading(true)
    setUploadErr(null)
    try {
      const results = await Promise.all(
        filledSlots.map(async ({ file }) => {
          const form = new FormData()
          form.append('photo', file)
          const res = await api.post('/uploads/photo', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          return res.data.data ?? res.data
        }),
      )
      // Pass storage paths — used directly by backend when approving the application
      const photos = results.map(r => r?.path ?? r?.url).filter(Boolean)
      onNext({ photos })
    } catch {
      setUploadErr('Ошибка загрузки фото. Попробуйте снова.')
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-8 shrink-0">
        <StepProgress current={stepNum} total={totalSteps} />
      </div>
      <div className="flex-1 flex flex-col gap-5 px-5 pt-8 min-h-0 overflow-y-auto">
        <div ref={headRef} className="flex flex-col gap-2.5 shrink-0">
          <h2 className="text-[24px]/[105%] font-[500] text-black tracking-[-0.025em] max-w-[290px]">
            Привяжите фото к вашему профилю
          </h2>
          <p className="text-[#7F7F7F] text-[14px]/[148%] font-medium">
            Ваши последние медиафайлы помогут пользователям быстрее сделать выбор в пользу вас.
          </p>
        </div>
        <div ref={gridRef} className="grid grid-cols-3 gap-3 pb-3 shrink-0">
          {photos.map((photo, i) =>
            photo ? (
              <FilledSlot key={`slot-${i}`} src={photo.url} onRemove={() => removePhoto(i)} />
            ) : (
              <EmptySlot key={`slot-${i}`} onAdd={(file, url) => addPhoto(i, file, url)} />
            ),
          )}
        </div>
        <div ref={hintRef} className="flex items-start gap-3 shrink-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#EFEEF3] flex items-center justify-center">
            <span className="text-sm/[100%] font-medium text-black">
              {filledCount}/{MAX_PHOTOS}
            </span>
          </div>
          {canProceed ? (
            <p className="text-sm/[105%] font-normal text-[#7F7F7F] pt-1">
              <span className="text-[#E2319B] font-medium">Отлично! </span>
              Вы можете добавить ещё фото для большего охвата аудитории.
            </p>
          ) : (
            <p className="text-sm/[105%] font-normal text-[#7F7F7F] pt-1">
              <span className="text-[#E2319B] font-medium">
                Давайте начнём с {MIN_REQUIRED} фото.{' '}
              </span>
              Рекомендуем добавлять фото с лицом.
            </p>
          )}
        </div>
        {uploadErr && (
          <p className="text-[#E2319B] text-sm/[140%] font-medium text-center shrink-0">{uploadErr}</p>
        )}
      </div>
      <div ref={btnRef} className="shrink-0 px-5 pb-8 flex flex-col justify-center bg-transparent">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          style={{ background: canProceed ? '#1C1C1E' : '#D0D0D0' }}
          className="w-full py-[18px] rounded-full text-white text-base/[100%] font-medium transition-colors duration-200 max-w-[191px] mx-auto"
        >
          {uploading ? 'Загрузка...' : 'Далее'}
        </button>
      </div>
    </div>
  )
}
