import { Component } from 'react'
import ModalMiddle from '@/layout/ModalMiddle'

/**
 * Top-level Error Boundary.
 *
 * Catches render-time and lifecycle errors in any descendant React component
 * and shows a friendly fallback UI instead of a blank white screen. The user
 * can either reload the app or attempt to recover (which clears the error).
 *
 * Async errors (event handlers, fetch, setTimeout, etc.) are NOT caught here —
 * each call site must handle those itself. This boundary only protects the
 * render tree from crashing the whole SPA.
 */
export default class ErrorBoundary extends Component {
  static chunkReloadKey = '__chunk_reload_once__'

  constructor(props) {
    super(props)
    this.state = { error: null, showDetail: false }
  }

  static getDerivedStateFromError(error) {
    return { error, showDetail: false }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    this.tryRecoverChunkError(error)
  }

  isChunkLoadError = (error) => {
    const message = String(error?.message ?? '')
    const name = String(error?.name ?? '')
    const stack = String(error?.stack ?? '')
    const haystack = `${name}\n${message}\n${stack}`
    return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(haystack)
  }

  tryRecoverChunkError = (error) => {
    if (!this.isChunkLoadError(error)) return
    try {
      const key = ErrorBoundary.chunkReloadKey
      const alreadyReloaded = sessionStorage.getItem(key) === '1'
      if (alreadyReloaded) return
      sessionStorage.setItem(key, '1')
      window.location.reload()
    } catch {
      // Best-effort recovery only.
    }
  }

  handleReload = () => {
    this.setState({ showDetail: false })
    try { window.location.reload() } catch {}
  }

  handleRetry = () => {
    try { sessionStorage.removeItem(ErrorBoundary.chunkReloadKey) } catch {}
    this.setState({ error: null, showDetail: false })
  }

  openDetail = () => {
    this.setState({ showDetail: true })
  }

  closeDetail = () => {
    this.setState({ showDetail: false })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          background: '#ffffff',
          color: '#1B1B1B',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Что-то пошло не так</div>
        <div style={{ fontSize: 14, color: '#7F7F7F', maxWidth: 320 }}>
          Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу — обычно это помогает.
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '12px 18px',
              borderRadius: 16,
              border: '1px solid #E0DFE5',
              background: '#F7F6FA',
              color: '#1B1B1B',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 18px',
              borderRadius: 16,
              border: 'none',
              background: '#E2319B',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Перезагрузить
          </button>
        </div>

        <button
          onClick={this.openDetail}
          style={{
            fontSize: 12,
            color: '#B0B0B5',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginTop: 2,
          }}
        >
          Посмотреть причину ошибки
        </button>

        <ModalMiddle isOpen={this.state.showDetail} onClose={this.closeDetail}>
          <div style={{ padding: '0 20px 24px' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Детали ошибки</p>
            <pre
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: '#4B5563',
                background: '#F9FAFB',
                borderRadius: 16,
                padding: 14,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '50vh',
              }}
            >
              {JSON.stringify({
                name: this.state.error?.name ?? 'Error',
                message: this.state.error?.message ?? 'Детали ошибки недоступны',
                stack: this.state.error?.stack ?? null,
              }, null, 2)}
            </pre>
            <button
              onClick={this.closeDetail}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '12px 0',
                borderRadius: 14,
                border: 'none',
                background: '#F3F4F6',
                color: '#374151',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        </ModalMiddle>

        {import.meta.env.DEV && this.state.error?.message ? (
          <pre
            style={{
              marginTop: 16,
              fontSize: 11,
              color: '#7F7F7F',
              maxWidth: 480,
              maxHeight: 200,
              overflow: 'auto',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#F7F6FA',
              padding: 12,
              borderRadius: 12,
            }}
          >
            {String(this.state.error.message)}
          </pre>
        ) : null}
      </div>
    )
  }
}
