import { create } from 'zustand'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const useModelMeetingStore = create((set, get) => ({
  meeting:      null,
  status:       null,
  isFinishOpen: false,
  isLoading:    false,
  error:        null,
  errorStatus:  null,

  /** Load the latest meeting where the current user is the model */
  async loadLatest() {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get('/meetings', {
        params: {
          per_page: 10,
          role: 'model',
          statuses: 'pending,accepted,paid,confirmed',
        },
      })
      const meetings = data.data ?? []
      const active   = meetings[0] ?? null
      set({ meeting: active, status: active?.status ?? null, isLoading: false })
    } catch (e) {
      set({ error: e.message, isLoading: false })
    }
  },

  /** Load a specific meeting by ID */
  async load(id) {
    set({ isLoading: true, error: null, errorStatus: null })
    try {
      const { data } = await api.get(`/meetings/${id}`)
      const m = data.data
      set({ meeting: m, status: m.status, isLoading: false })
    } catch (e) {
      const status = e?.response?.status ?? null
      set({ error: e.message, errorStatus: status, isLoading: false })
    }
  },

  /** Model accepts the booking request */
  async accept() {
    const id = get().meeting?.id
    if (!id) return
    try {
      await api.post(`/meetings/${id}/accept`)
      get().setStatus('accepted')
    } catch (e) {
      logError('Meeting accept failed:', e)
    }
  },

  /** Model rejects the booking request */
  async reject() {
    const id = get().meeting?.id
    if (!id) return
    try {
      const { data } = await api.post(`/meetings/${id}/reject`)
      const m = data.data
      set({ meeting: m, status: m?.status ?? 'rejected' })
    } catch (e) {
      logError('Meeting reject failed:', e)
    }
  },

  async cancel(reason = 'model_cancelled') {
    const id = get().meeting?.id
    if (!id) return
    try {
      const { data } = await api.post(`/meetings/${id}/cancel`, { reason })
      const m = data.data
      set({ meeting: m, status: m?.status ?? 'cancelled' })
    } catch (e) {
      logError('Meeting cancel failed:', e)
    }
  },

  /** Called by Echo when the server broadcasts a status change */
  setStatus(status) {
    set((s) => ({
      status,
      meeting: s.meeting ? { ...s.meeting, status } : s.meeting,
    }))
  },

  setMeeting(meeting) {
    set({ meeting, status: meeting?.status ?? null })
  },

  async confirm() {
    const id = get().meeting?.id
    if (!id) return
    try {
      const { data } = await api.post(`/meetings/${id}/confirm`)
      const m = data.data
      set({ meeting: m, status: m?.status ?? 'confirmed' })
    } catch (e) {
      logError('Meeting confirm failed:', e)
    }
  },

  async complete() {
    const id = get().meeting?.id
    if (!id) return
    try {
      const { data } = await api.post(`/meetings/${id}/complete`)
      const m = data.data
      set({ meeting: m, status: m?.status ?? 'completed' })
    } catch (e) {
      logError('Meeting complete failed:', e)
    }
  },

  setConfirmed()      { get().setStatus('confirmed') },

  openFinish()  { set({ isFinishOpen: true  }) },
  closeFinish() { set({ isFinishOpen: false }) },

  reset() {
    set({ meeting: null, status: null, isFinishOpen: false, isLoading: false, error: null, errorStatus: null })
  },
}))

export default useModelMeetingStore
