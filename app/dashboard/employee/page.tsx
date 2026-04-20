'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { subscribeUser, unsubscribeUser } from '@/app/actions'
import InstallPrompt from '@/components/InstallPrompt'

type LocationStatus = 'checking' | 'inside' | 'outside' | 'error' | 'no-workplace'
type PermissionStep = 'idle' | 'requesting' | 'denied' | 'granted'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function sendNotify(type: string) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
      credentials: 'same-origin',
    })
  } catch { /* gönderilemedi, sessizce geç */ }
}

export default function EmployeeDashboard() {
  const { data: session } = useSession()
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking')
  const [distance, setDistance] = useState<number | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [permStep, setPermStep] = useState<PermissionStep>('idle')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [workplaceName, setWorkplaceName] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOS] = useState(() =>
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  )

  // Geçiş tespiti için ref'ler — state değil, bildirim tetikleme için
  const gpsRef = useRef<boolean | null>(null)   // null=bilinmiyor, true=var, false=yok
  const onlineRef = useRef(true)
  const pushInitRef = useRef(false)

  const checkLocation = useCallback(async () => {
    if (!session?.user) return
    setLocationStatus('checking')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // GPS yeniden geldi
        if (gpsRef.current === false) {
          gpsRef.current = true
          sendNotify('gps-restored')
        } else {
          gpsRef.current = true
        }

        const { latitude: lat, longitude: lng } = pos.coords

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SAVE_LOCATION',
            payload: { lat, lng },
          })
        }

        const res = await fetch('/api/location/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        })
        const data = await res.json()
        if (res.ok) {
          setLocationStatus(data.isInside ? 'inside' : 'outside')
          setDistance(data.distance)
          setLastCheck(new Date())
          if (data.workplaceName) setWorkplaceName(data.workplaceName)
        } else if (data.error === 'İşyeri bulunamadı') {
          setLocationStatus('no-workplace')
        } else {
          setLocationStatus('error')
        }
      },
      (error) => {
        // GPS sinyali kayboldu (POSITION_UNAVAILABLE = 2)
        if (error.code === 2 && gpsRef.current !== false) {
          gpsRef.current = false
          sendNotify('gps-lost')
        }
        setLocationStatus('error')
      },
      { timeout: 15000, maximumAge: 60000 }
    )
  }, [session])

  const initPush = useCallback(async () => {
    if (pushInitRef.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    pushInitRef.current = true

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })

    if ('periodicSync' in reg) {
      try {
        const ps = (reg as unknown as {
          periodicSync: {
            getTags(): Promise<string[]>
            register(tag: string, opts: { minInterval: number }): Promise<void>
          }
        }).periodicSync
        const tags = await ps.getTags()
        if (!tags.includes('check-location')) {
          await ps.register('check-location', { minInterval: 5 * 60 * 1000 })
        }
      } catch { /* izin verilmedi veya desteklenmiyor */ }
    }

    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      const result = await subscribeUser(JSON.parse(JSON.stringify(existing)))
      if (result.success) setPushSubscribed(true)
      return
    }

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const result = await subscribeUser(JSON.parse(JSON.stringify(sub)))
      if (result.success) setPushSubscribed(true)
      else pushInitRef.current = false
    } catch {
      pushInitRef.current = false
    }
  }, [])

  // İzin durumu — bir kez mount'ta çalışır
  useEffect(() => {
    initPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Session + izin her ikisi de hazır olduğunda konum ve push başlat
  useEffect(() => {
    if (!session?.user || permStep !== 'granted') return
    const initialRun = window.setTimeout(() => {
      void checkLocation()
      void initPush()
    }, 0)
    const interval = setInterval(checkLocation, 5 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkLocation()
    }
    const onFocus = () => void checkLocation()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(initialRun)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [session, permStep, checkLocation, initPush])

  // SW'den gelen CHECK_LOCATION mesajını dinle
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CHECK_LOCATION') void checkLocation()
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [checkLocation])

  // Bağlantı durumu takibi
  useEffect(() => {
    const handleOffline = () => {
      if (!onlineRef.current) return
      onlineRef.current = false
      // Sunucuya gidemeyiz — SW yerel bildirim gösterir
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'NOTIFY_OFFLINE' })
      }
    }
    const handleOnline = () => {
      if (onlineRef.current) return
      onlineRef.current = true
      sendNotify('connection-restored')
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  async function initPermissions() {
    if (!('geolocation' in navigator)) {
      setPermStep('denied')
      setShowInstructions(true)
      return
    }

    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
      setPermStep('requesting')
      requestLocation()
      return
    }

    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' })
      if (perm.state === 'granted') {
        setPermStep('granted')
      } else if (perm.state === 'denied') {
        setPermStep('denied')
        setShowInstructions(true)
      } else {
        setPermStep('requesting')
        requestLocation()
      }
    } catch {
      setPermStep('requesting')
      requestLocation()
    }
  }

  function requestLocation() {
    setPermStep('requesting')
    navigator.geolocation.getCurrentPosition(
      () => setPermStep('granted'),
      () => { setPermStep('denied'); setShowInstructions(true) }
    )
  }

  async function handleUnsubscribePush() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    await sub?.unsubscribe()
    await unsubscribeUser()
    setPushSubscribed(false)
    pushInitRef.current = false
  }

  const statusConfig = {
    checking:       { color: 'text-zinc-400',   bg: 'bg-zinc-800',        dot: 'bg-zinc-500',   label: 'Kontrol ediliyor...' },
    inside:         { color: 'text-green-400',  bg: 'bg-green-500/10',    dot: 'bg-green-400',  label: 'Alan İçindesiniz' },
    outside:        { color: 'text-red-400',    bg: 'bg-red-500/10',      dot: 'bg-red-400',    label: 'Alan Dışındasınız' },
    error:          { color: 'text-yellow-400', bg: 'bg-yellow-500/10',   dot: 'bg-yellow-400', label: 'Konum alınamadı' },
    'no-workplace': { color: 'text-zinc-400',   bg: 'bg-zinc-800',        dot: 'bg-zinc-500',   label: 'İşyerine atanmadınız' },
  }
  const s = statusConfig[locationStatus]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="font-bold text-sm sm:text-base truncate">GeoVardiyaApp</span>
          <span className="shrink-0 text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">İşçi</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-sm text-zinc-400 truncate max-w-[120px]">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="text-xs text-zinc-500 hover:text-white">Çıkış</button>
        </div>
      </header>

      <div className="max-w-sm mx-auto w-full px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-4">

        {/* Konum İzni Talimatı */}
        {showInstructions && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-yellow-400">Konum İzni Gerekli</h3>
            {isIOS ? (
              <ol className="text-sm text-zinc-300 flex flex-col gap-2 list-decimal list-inside">
                <li>iPhone Ayarlar uygulamasını aç</li>
                <li>Aşağı kaydır → Safari (veya Chrome)</li>
                <li>Konum → &quot;Uygulama Kullanılırken&quot; seç</li>
                <li>Bu sayfayı yenile</li>
              </ol>
            ) : (
              <ol className="text-sm text-zinc-300 flex flex-col gap-2 list-decimal list-inside">
                <li>Adres çubuğundaki kilit simgesine dokun</li>
                <li>Konum → &quot;İzin ver&quot; seç</li>
                <li>Sayfayı yenile</li>
              </ol>
            )}
            <button
              onClick={() => { setShowInstructions(false); requestLocation() }}
              className="text-sm text-yellow-400 hover:text-yellow-300 text-left"
            >
              Tekrar dene →
            </button>
          </div>
        )}

        {/* Durum Kartı */}
        <div className={`${s.bg} border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3`}>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${s.dot} ${locationStatus === 'checking' ? 'animate-pulse' : ''}`} />
            <span className={`text-lg font-bold ${s.color}`}>{s.label}</span>
          </div>
          {workplaceName && <p className="text-sm text-zinc-400">{workplaceName}</p>}
          {distance !== null && locationStatus === 'outside' && (
            <p className="text-sm text-zinc-400">Merkeze uzaklık: <span className="text-white font-medium">{distance}m</span></p>
          )}
          {lastCheck && (
            <p className="text-xs text-zinc-600">
              Son kontrol: {lastCheck.toLocaleTimeString('tr-TR')}
            </p>
          )}
        </div>

        {/* Manuel Kontrol */}
        {permStep === 'granted' && (
          <button
            onClick={checkLocation}
            className="w-full py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
          >
            Şimdi Kontrol Et
          </button>
        )}

        {/* Bildirim Durumu */}
        <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Push Bildirimler</p>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {pushSubscribed
                ? 'Aktif — alan, GPS ve bağlantı değişimlerinde bildirim alırsınız'
                : 'Kapalı'}
            </p>
          </div>
          {pushSubscribed ? (
            <button onClick={handleUnsubscribePush} className="shrink-0 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 active:bg-red-500/20">Kapat</button>
          ) : (
            <button onClick={initPush} className="shrink-0 text-xs text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 active:bg-zinc-700">Aç</button>
          )}
        </div>

        {/* Ana ekrana ekle */}
        <InstallPrompt />

        {/* Bilgi */}
        <div className="bg-zinc-900 rounded-2xl p-5 flex flex-col gap-2">
          <p className="text-sm font-medium">Bildirimler</p>
          <ul className="text-xs text-zinc-400 flex flex-col gap-1.5">
            <li>• Alan içine girince / dışına çıkınca</li>
            <li>• GPS sinyali kaybolunca / yeniden gelince</li>
            <li>• İnternet bağlantısı kesilince / yeniden bağlanınca</li>
            <li>• Konum her 5 dakikada bir otomatik kontrol edilir</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
