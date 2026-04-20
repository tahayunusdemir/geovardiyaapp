'use client'

import { useInstallPrompt } from './InstallPromptProvider'

export default function InstallPrompt() {
  const { deferredPrompt, isIOS, isStandalone, install } = useInstallPrompt()

  if (isStandalone) return null

  if (isIOS) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
        <p className="text-sm font-medium mb-1">Ana Ekrana Ekle</p>
        <p className="text-xs text-zinc-400">
          Paylaş <span className="text-white">⎋</span> tuşuna basıp{' '}
          <span className="text-white font-medium">"Ana Ekrana Ekle"</span>yi seç
        </p>
      </div>
    )
  }

  if (deferredPrompt) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Ana Ekrana Ekle</p>
          <p className="text-xs text-zinc-400 mt-0.5">Uygulamayı yükle, daha hızlı aç</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 px-3 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors"
        >
          Yükle
        </button>
      </div>
    )
  }

  return null
}
