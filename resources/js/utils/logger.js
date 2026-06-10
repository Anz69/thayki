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
