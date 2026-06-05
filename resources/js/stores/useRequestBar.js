import { create } from 'zustand'

/**
 * Bridges the /request form's submit action into the bottom navigation so the
 * nav pill can morph into the "Send request" button (and back) smoothly.
 * RequestPage registers `active`, `canSubmit`, `submitting` and the latest
 * `submit` fn; BottomNav renders the button and calls `getState().submit()`.
 */
const useRequestBar = create(() => ({
  active: false,
  canSubmit: false,
  submitting: false,
  submit: null,
}))

export default useRequestBar
