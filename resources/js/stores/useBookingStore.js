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

  /**
   * Slots already taken by other meetings on this model in the next 7 days.
   * Loaded eagerly when the modal is opened so DateStep/TimeStep can grey
   * out conflicts before the user submits — instead of relying solely on
   * the server-side SLOT_TAKEN error after the fact.
   *
   * Each entry: { scheduledAt: Date, startMs: number, endMs: number }.
   */
  bookedSlots: [],

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

  /**
   * Returns true if the candidate (start, durationHours) overlaps any
   * existing booking on this model. Used by:
   *   - TimeStep   to disable conflicting hours upfront
   *   - submit()   as a final guard before we POST
   */
  isSlotConflicting(startMs, durationHours) {
    const s = get()
    if (!Number.isFinite(startMs) || !Number.isFinite(durationHours) || durationHours <= 0) {
      return false
    }
    const endMs = startMs + durationHours * 3600 * 1000
    for (const slot of s.bookedSlots) {
      if (startMs < slot.endMs && slot.startMs < endMs) {
        return true
      }
    }
    return false
  },

  /**
   * Returns true iff every hour of `dayDate` is fully covered by booked
   * slots overlapping with the model's schedule. Cheap heuristic — checks
   * each integer hour against `isSlotConflicting(start, 1)`.
   */
  isDayFullyBooked(dayDate, schedule = 'any') {
    if (!dayDate) return false
    const start = new Date(dayDate)
    start.setHours(0, 0, 0, 0)
    let blocked = 0
    let candidates = 0
    for (let h = 0; h < 24; h++) {
      if (schedule === 'day'   && (h < 7  || h >= 20)) continue
      if (schedule === 'night' && (h >= 7 && h < 20))  continue
      candidates++
      const t = new Date(start)
      t.setHours(h, 0, 0, 0)
      if (get().isSlotConflicting(t.getTime(), 1)) {
        blocked++
      }
    }
    return candidates > 0 && blocked === candidates
  },

  /**
   * Pre-fetch the booked slots for a model. Called from open(), but also
   * exposed so RegistrationModal can refresh after a 409 SLOT_TAKEN error
   * (someone else booked the same slot in the meantime — the FE catches
   * up immediately instead of forcing the user to close + reopen).
   */
  async loadBookedSlots(modelId) {
    if (!modelId) {
      set({ bookedSlots: [] })
      return
    }
    try {
      const { data } = await api.get(`/catalog/models/${modelId}/booked-slots`, {
        params: { days: 7 },
      })
      const raw = Array.isArray(data?.data) ? data.data : []
      const slots = raw
        .map((s) => {
          const d = new Date(s?.scheduled_at)
          if (Number.isNaN(d.getTime())) return null
          const dur = Number(s?.duration_hours) || 0
          if (dur <= 0) return null
          const startMs = d.getTime()
          return { scheduledAt: d, startMs, endMs: startMs + dur * 3600 * 1000 }
        })
        .filter(Boolean)
      set({ bookedSlots: slots })
    } catch {
      set({ bookedSlots: [] })
    }
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
      bookedSlots:      [],
    })

    if (model?.id) {
      get().loadBookedSlots(model.id)
    }
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
      bookedSlots:      [],
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

    if (s.isSlotConflicting(d.getTime(), s.selectedDuration.hours)) {
      get().loadBookedSlots(s.modelProfileId)
      const err = new Error('Это время уже занято. Выберите другое.')
      err.code = 'SLOT_TAKEN'
      throw err
    }

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
        get().loadBookedSlots(s.modelProfileId)
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
