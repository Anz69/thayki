import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import StepProgress from '../StepProgress'
import api from '@/utils/api'
import { prepareImageFileForUpload, isFileProbablyTooLarge } from '@/utils/prepareImageForUpload'

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
      <input ref={inputRef} type="file" accept="image
        }

        if (isFileProbablyTooLarge(file)) {
          setUploadErr(
            `Фото ${ordinal}: слишком большой файл (лимит ~9 МБ). Замените снимок или откройте его в редакторе и сохраните заново.`,
          )
          setFailedSlotIndex(i)
          return
        }

        try {
          const form = new FormData()
          form.append('photo', file)
          const res = await api.post('/uploads/photo', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          const data = res.data.data ?? res.data
          const path = data?.path ?? data?.url
          if (!path) {
            throw new Error('empty')
          }
          paths.push(path)
        } catch (err) {
          const status = err?.response?.status
          const serverMsg =
            err?.response?.data?.error?.message
            ?? err?.response?.data?.message
          let msg = serverMsg
          if (status === 413) {
            msg = 'Файл слишком большой для сервера. Выберите другое фото.'
          } else if (!msg) {
            msg = 'Ошибка загрузки. Проверьте формат (JPEG/PNG/WebP) или попробуйте другое фото.'
          }
          setUploadErr(`Фото ${ordinal}: ${msg}`)
          setFailedSlotIndex(i)
          return
        }
      }
      onNext({ photos: paths })
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-8 shrink-0">
        <StepProgress current={stepNum} total={totalSteps} />
      </div>
      <div
        className="flex-1 flex flex-col gap-5 px-5 pt-8 min-h-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + var(--keyboard-offset, 0px))' }}
      >
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
              <FilledSlot
                key={`slot-${i}`}
                src={photo.url}
                onRemove={() => removePhoto(i)}
                hasError={failedSlotIndex === i}
              />
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
          {uploading
            ? (uploadProgress
              ? `Загрузка ${uploadProgress.current}/${uploadProgress.total}…`
              : 'Подготовка…')
            : 'Далее'}
        </button>
      </div>
    </div>
  )
}
