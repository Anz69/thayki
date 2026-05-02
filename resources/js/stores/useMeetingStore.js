import { create } from 'zustand'
import api from '@/utils/api'
import { emitActiveMeetingsRefresh } from '@/utils/activeMeetingsBus'
import { logError } from '@/utils/logger'

const STAGE_RANK = {
  pending: 10,
  accepted: 20,
  paid: 30,
  confirmed: 40,
}

function shouldKeepCurrentStatus(currentStatus, incomingStatus) {
  const currentRank = STAGE_RANK[currentStatus] ?? null
  const incomingRank = STAGE_RANK[incomingStatus] ?? null
  if (currentRank == null || incomingRank == null) return false
  return incomingRank < currentRank
}

const useMeetingStore = create((set, get) => ({
  meeting:        null,
  status:         null,
  isBootstrapping: false,
  isPaymentOpen:  false,
  isCancelOpen:   false,
  isLoading:      false,
  error:          null,
  errorStatus:    null,

  async loadLatest() {
    set({ isLoading: true, isBootstrapping: true, error: null })
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
      set((state) => {
        const incomingStatus = active?.status ?? null
        const currentMeetingId = state.meeting?.id ?? null
        const incomingMeetingId = active?.id ?? null
        const keepCurrent = currentMeetingId === incomingMeetingId
          && shouldKeepCurrentStatus(state.status, incomingStatus)

        return {
          meeting: active,
          status: keepCurrent ? state.status : incomingStatus,
          isLoading: false,
          isBootstrapping: false,
        }
      })
    } catch (e) {
      set({ error: e.message, isLoading: false, isBootstrapping: false })
    }
  },

  async load(id) {
    set({ isLoading: true, isBootstrapping: true, error: null, errorStatus: null })
    try {
      const { data } = await api.get(`/meetings/${id}`)
      const m = data.data
      set((state) => {
        const keepCurrent = state.meeting?.id === m?.id
          && shouldKeepCurrentStatus(state.status, m?.status ?? null)

        return {
          meeting: m,
          status: keepCurrent ? state.status : m.status,
          isLoading: false,
          isBootstrapping: false,
        }
      })
    } catch (e) {
      const status = e?.response?.status ?? null
      set({ error: e.message, errorStatus: status, isLoading: false, isBootstrapping: false })
    }
  },

  setStatus(status) {
    set((s) => {
      const nextStatus = shouldKeepCurrentStatus(s.status, status) ? s.status : status
      return {
        status: nextStatus,
        meeting: s.meeting ? { ...s.meeting, status: nextStatus } : s.meeting,
      }
    })
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
      emitActiveMeetingsRefresh()
    } catch (e) {
      logError('Meeting cancel failed:', e)
    }
  },

  openPayment()  { set({ isPaymentOpen: true  }) },
  closePayment() { set({ isPaymentOpen: false }) },

  openCancel()  { set({ isCancelOpen: true  }) },
  closeCancel() { set({ isCancelOpen: false }) },

  reset() {
    set({ meeting: null, status: null, isBootstrapping: false, isPaymentOpen: false, isCancelOpen: false, isLoading: false, error: null, errorStatus: null })
  },
}))

export default useMeetingStore
