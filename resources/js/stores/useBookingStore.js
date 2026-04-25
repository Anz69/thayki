import { create } from 'zustand'
import api from '@/utils/api'

const useBookingStore = create((set, get) => ({
  isOpen:           false,
  step:             1,
  selectedDate:     null,
  selectedHour:     10,
  selectedMinute:   0,
  selectedDuration: null,

  modelProfileId: null,
  modelName:      null,
  schedule:       'any',
  durations:      [],

  get formattedTime() {
    const s = get()
    const h = String(s.selectedHour).padStart(2, '0')
    const m = String(s.selectedMinute).padStart(2, '0')
    return `${h}:${m}`
  },

  isTimeValid() {
    const s = get()
    const h = s.selectedHour
    if (s.schedule === 'day')   return h >= 7 && h < 20
    if (s.schedule === 'night') return h >= 20 || h < 7
    return true
  },

  open(model = null) {
    const now = new Date()
    const durations = model?.price_options?.length
      ? model.price_options.map(opt => ({
          id:    opt.id,
          label: opt.label ?? `${opt.hours} ч`,
          hours: opt.hours,
          price: opt.price_thb,
        }))
      : [
          { id: 1, label: '1 час',  hours: 1,  price: model?.hourly_rate_thb ?? 2000 },
          { id: 2, label: '3 часа', hours: 3,  price: (model?.hourly_rate_thb ?? 2000) * 3 },
          { id: 3, label: 'Ночь',   hours: 8,  price: (model?.hourly_rate_thb ?? 2000) * 6 },
          { id: 4, label: '24 ч',   hours: 24, price: (model?.hourly_rate_thb ?? 2000) * 16 },
        ]

    const schedule = model?.schedule ?? 'any'

    let defaultHour = now.getHours()
    if (schedule === 'day'   && (defaultHour < 7  || defaultHour >= 20)) defaultHour = 9
    if (schedule === 'night' && (defaultHour >= 7  && defaultHour < 20)) defaultHour = 21

    set({
      isOpen:           true,
      step:             1,
      selectedDate:     null,
      selectedHour:     defaultHour,
      selectedMinute:   now.getMinutes(),
      selectedDuration: null,
      modelProfileId:   model?.id ?? null,
      modelName:        model?.display_name ?? null,
      schedule,
      durations,
    })
  },

  close() {
    set({ isOpen: false })
  },

  reset() {
    set({
      isOpen:           false,
      step:             1,
      selectedDate:     null,
      selectedHour:     10,
      selectedMinute:   0,
      selectedDuration: null,
      modelProfileId:   null,
      modelName:        null,
      schedule:         'any',
      durations:        [],
    })
  },

  nextStep() {
    set((s) => ({ step: Math.min(s.step + 1, 4) }))
  },

  prevStep() {
    set((s) => ({ step: Math.max(s.step - 1, 1) }))
  },

  setState(partial) {
    set(partial)
  },

  async submit() {
    const s = get()
    if (!s.modelProfileId || !s.selectedDate || !s.selectedDuration) {
      throw new Error('Не все данные заполнены')
    }

    const d = new Date(s.selectedDate.date)
    d.setHours(s.selectedHour, s.selectedMinute, 0, 0)

    const idempotencyKey = `booking-${s.modelProfileId}-${d.toISOString()}-${Date.now()}`

    try {
      const { data } = await api.post('/meetings', {
        model_profile_id: s.modelProfileId,
        scheduled_at:     d.toISOString(),
        duration_hours:   s.selectedDuration.hours,
        price_thb:        s.selectedDuration.price,
      }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      return data.data
    } catch (err) {
      const status  = err?.response?.status
      const code    = err?.response?.data?.error?.code
      const message = err?.response?.data?.error?.message

      if (code === 'MEETING_ALREADY_ACTIVE' || status === 409) {
        throw new Error('У вас уже есть активная встреча. Сначала завершите её.')
      }
      if (code === 'SLOT_TAKEN') {
        throw new Error('Это время уже занято. Выберите другое.')
      }
      if (code === 'MODEL_NOT_AVAILABLE') {
        throw new Error('Модель сейчас недоступна для бронирования.')
      }
      if (code === 'MEETING_FORBIDDEN') {
        throw new Error(message ?? 'Бронирование недоступно.')
      }
      throw err
    }
  },
}))

export default useBookingStore
