/**
 * Tiny logger that strips logs in production builds.
 *
 * Vite replaces `import.meta.env.DEV` / `.PROD` with literal booleans at build
 * time, so this whole module dead-code-eliminates down to no-ops in prod.
 *
 * Usage:
 *   import { logError, logWarn } from '@/utils/logger'
 *   logError('Avatar upload failed', err)
 *
 * Errors that the user actually needs to react to should bubble up to a
 * surfaced toast or inline error message — `logError` is for diagnostics.
 */
const DEV = !!import.meta.env?.DEV

export function logError(...args) {
  if (DEV) {
    console.error(...args)
  }
}

export function logWarn(...args) {
  if (DEV) {
    console.warn(...args)
  }
}

export function logInfo(...args) {
  if (DEV) {
    console.info(...args)
  }
}

export default { logError, logWarn, logInfo }
