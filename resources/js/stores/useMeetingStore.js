import { create } from 'zustand'
import api from '@/utils/api'
import { logError } from '@/utils/logger'

const useMeetingStore = create((set, get) => ({
  meeting:        null,
  status:         null,
  isPaymentOpen:  false,
  isLoading:      false,
  error:          null,
  errorStatus:    null,

  /** Load the latest active meeting for the current user */
  async loadLatest() {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get('/meetings', {
        params: {
          per_page: 10,
          page: 1,
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

  setAccepted()  { get().setStatus('accepted')  },
  setConfirmed() { get().setStatus('confirmed')  },

  async cancel(reason = 'user_cancelled') {
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

  openPayment()  { set({ isPaymentOpen: true  }) },
  closePayment() { set({ isPaymentOpen: false }) },

  reset() {
    set({ meeting: null, status: null, isPaymentOpen: false, isLoading: false, error: null, errorStatus: null })
  },
}))

export default useMeetingStore
