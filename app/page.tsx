'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser, sendNotification } from './actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    const sub = await registration.pushManager.getSubscription()
    setSubscription(sub)
  }

  async function subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      setSubscription(sub)
      const serializedSub = JSON.parse(JSON.stringify(sub))
      await subscribeUser(serializedSub)
      setStatus('Bildirimler etkinleştirildi.')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('Push servisi şu an kullanılamıyor. Lütfen internet bağlantınızı kontrol edin.')
      } else {
        setStatus('Abonelik başarısız: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'))
      }
    }
  }

  async function unsubscribeFromPush() {
    await subscription?.unsubscribe()
    setSubscription(null)
    await unsubscribeUser()
    setStatus('Bildirimler devre dışı bırakıldı.')
  }

  async function sendTestNotification() {
    if (subscription) {
      const result = await sendNotification(message)
      if (result.success) {
        setMessage('')
        setStatus('Test bildirimi gönderildi.')
      } else {
        setStatus('Bildirim gönderilemedi.')
      }
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-2">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Push Bildirimler</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Bu tarayıcı push bildirimleri desteklemiyor.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Chrome (güncel sürüm) ve Google Play Hizmetleri gereklidir.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Push Bildirimler</h3>
      {subscription ? (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Bildirimler aktif.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Bildirim mesajı"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <button
              onClick={sendTestNotification}
              disabled={!message}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
            >
              Gönder
            </button>
          </div>
          <button
            onClick={unsubscribeFromPush}
            className="text-sm text-red-500 hover:text-red-700 text-left"
          >
            Aboneliği iptal et
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Bildirimler kapalı.
          </p>
          <button
            onClick={subscribeToPush}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Bildirimlere Abone Ol
          </button>
        </>
      )}
      {status && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{status}</p>
      )}
    </div>
  )
}

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> })
    }
    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  if (isStandalone || installed) return null

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Uygulamayı Kur</h3>
      {isIOS ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          iOS&apos;ta yüklemek için önce{' '}
          <span aria-label="paylaş">⎋</span> paylaş butonuna, ardından{' '}
          <span aria-label="ekle">➕</span> &ldquo;Ana Ekrana Ekle&rdquo; seçeneğine dokun.
        </p>
      ) : deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          Ana Ekrana Ekle
        </button>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tarayıcının kurulum butonunu kullanarak ana ekrana ekleyebilirsin.
        </p>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Metin tabanlı uygulama logosu */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-lg font-black select-none">
              G
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              GeoVardiyaApp
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 pl-12">
            Coğrafi konum destekli vardiya yönetimi
          </p>
        </div>
        <PushNotificationManager />
        <InstallPrompt />
      </div>
    </div>
  )
}
