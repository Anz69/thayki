import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

const TOKEN_KEY = '_tg_auth_token'

const echo = new Echo({
  broadcaster:       'reverb',
  key:               import.meta.env.VITE_REVERB_APP_KEY,
  wsHost:            import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
  wsPort:            Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
  wssPort:           Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
  forceTLS:          (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
  withCredentials:   true,
  authorizer: (channel) => ({
    authorize: (socketId, callback) => {
      const token = localStorage.getItem(TOKEN_KEY)
      const csrf  = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
      fetch('/broadcasting/auth', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Accept':        'application/json',
          'X-CSRF-TOKEN':  csrf,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
      })
        .then(r => r.json())
        .then(data => callback(null, data))
        .catch(err  => callback(err))
    },
  }),
})

export default echo
