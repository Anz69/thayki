import { Component } from 'react'
import i18n from '@/i18n'
import ModalMiddle from '@/layout/ModalMiddle'

export default class ErrorBoundary extends Component {
  static baseChunkReloadKey = '__chunk_reload_once__'

  static chunkReloadKey() {
    try {
      const buildId = String(window.__APP_BUILD_ID__ ?? 'unknown')
      return `${ErrorBoundary.baseChunkReloadKey}:${buildId}`
    } catch {
      return `${ErrorBoundary.baseChunkReloadKey}:unknown`
    }
  }

  constructor(props) {
    super(props)
    this.state = { error: null, showDetail: false, componentStack: null, errorRoute: null, errorAt: null }
  }

  static getDerivedStateFromError(error) {
    return { error, showDetail: false }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    // Make sure the inline boot splash can't hide the error UI underneath it.
    try { document.getElementById('boot-splash')?.remove() } catch { /* noop */ }
    try {
      window.__beaconError?.('react', {
        message: error?.message ?? String(error ?? ''),
        stack: (error?.stack ?? '') + '\n--- componentStack ---' + (info?.componentStack ?? ''),
      })
    } catch { /* noop */ }
    this.setState({
      componentStack: info?.componentStack ?? null,
      errorRoute: window.location?.pathname ?? null,
      errorAt: new Date().toISOString(),
    })
    this.tryRecoverChunkError(error)
  }

  isChunkLoadError = (error) => {
    const message = String(error?.message ?? '')
    const name = String(error?.name ?? '')
    const stack = String(error?.stack ?? '')
    const haystack = `${name}\n${message}\n${stack}`
    return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|_result\.default|_result\W+default/i.test(haystack)
  }

  tryRecoverChunkError = (error) => {
    if (!this.isChunkLoadError(error)) return
    try {
      // Capped auto-reload (survives WebView recreation) so a persistently failing
      // chunk can't loop-reload forever.
      if (typeof window.__safeReload === 'function') { window.__safeReload('errorboundary-chunk'); return }
      window.location.reload()
    } catch {
    }
  }

  handleReload = () => {
    this.setState({ showDetail: false })
    try { window.location.reload() } catch {}
  }

  handleRetry = () => {
    try { sessionStorage.removeItem(ErrorBoundary.chunkReloadKey()) } catch {}
    this.setState({ error: null, showDetail: false, componentStack: null, errorRoute: null, errorAt: null })
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
        <div style={{ fontSize: 20, fontWeight: 500 }}>{i18n.t('common.somethingWrong')}</div>
        <div style={{ fontSize: 14, color: '#7F7F7F', maxWidth: 320 }}>
          {i18n.t('errors.desc')}
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
            {i18n.t('common.retry')}
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
            {i18n.t('errors.reload')}
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
          {i18n.t('errors.showCause')}
        </button>

        <ModalMiddle isOpen={this.state.showDetail} onClose={this.closeDetail}>
          <div style={{ padding: '0 20px 24px' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>{i18n.t('errors.details')}</p>
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
                message: this.state.error?.message ?? i18n.t('errors.detailsUnavailable'),
                stack: this.state.error?.stack ?? null,
                componentStack: this.state.componentStack ?? null,
                route: this.state.errorRoute ?? null,
                at: this.state.errorAt ?? null,
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
              {i18n.t('common.close')}
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
