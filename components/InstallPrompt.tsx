'use client'

import { useState } from 'react'
import { useInstallPrompt } from './InstallPromptProvider'

export default function InstallPrompt() {
  const { deferredPrompt, isIOS, isStandalone, isSecureContext, serviceWorkerError, install } =
    useInstallPrompt()
  const [message, setMessage] = useState<string | null>(null)
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const isAndroid = /Android/i.test(userAgent)
  const isSafari =
    /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
  const buttonLabel = isAndroid ? 'APK Olarak Ekle' : 'Ana Ekrana Ekle'

  if (isStandalone) return null

  async function handleClick() {
    setMessage(null)

    if (deferredPrompt && isSecureContext && !isIOS) {
      await install()
      return
    }

    if (!isSecureContext) {
      setMessage('Yukleme icin HTTPS gerekli.')
      return
    }

    if (isIOS) {
      setMessage(
        isSafari
          ? 'Safari > Paylas > Ana Ekrana Ekle kullan.'
          : 'iPhone icin sayfayi Safari ile ac.'
      )
      return
    }

    if (serviceWorkerError) {
      setMessage('Yukleme su an hazir degil.')
      return
    }

    setMessage('Tarayici su an dogrudan yukleme penceresi vermiyor.')
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
      >
        {buttonLabel}
      </button>
      {message && <p className="text-xs text-zinc-400">{message}</p>}
    </div>
  )
}
