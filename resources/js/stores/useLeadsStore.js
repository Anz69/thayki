import { create } from 'zustand'
import api from '@/utils/api'

// Statuses considered "active" (still in progress). Kept in sync with ACTIVE_STATUS
// in MorePage.
const ACTIVE_STATUSES = new Set([
  'new',
  'in_progress',
  'awaiting_client',
  'awaiting_payment',
  'prepaid',
])

const useLeadsStore = create((set, get) => ({
  // null = never loaded yet; array = loaded (possibly empty)
  activeLeads: null,
  loading: false,

  // Fetch the user's active leads. Prefetched at app boot so the "Ещё" tab shows the
  // request card instantly, then refreshed (stale-while-revalidate) when the tab opens.
  fetchActiveLeads: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const { data } = await api.get('/leads', { params: { page: 1, per_page: 20 } })
      const items = Array.isArray(data?.data) ? data.data : []
      set({ activeLeads: items.filter((l) => ACTIVE_STATUSES.has(l.status) && l.chat_id) })
    } catch {
      set((s) => ({ activeLeads: s.activeLeads ?? [] }))
    } finally {
      set({ loading: false })
    }
  },
}))

export default useLeadsStore
