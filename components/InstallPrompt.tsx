'use client'

import { useInstallPrompt } from './InstallPromptProvider'

export default function InstallPrompt() {
  const { deferredPrompt, isIOS, isStandalone, isSecureContext, serviceWorkerError, install } =
    useInstallPrompt()

  if (isStandalone) return null

  if (isIOS) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
        <p className="text-sm font-medium mb-1">Ana Ekrana Ekle</p>
        <p className="text-xs text-zinc-400">
          iPhone ve iPad&apos;de kurulum Safari üzerinden yapılır. Safari&apos;de Paylaş{' '}
          <span className="text-white">⎋</span> tuşuna basıp{' '}
          <span className="text-white font-medium">&quot;Ana Ekrana Ekle&quot;</span>yi seç.
        </p>
      </div>
    )
  }

  if (!isSecureContext) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 sm:p-5">
        <p className="text-sm font-medium text-yellow-300 mb-1">PWA Kurulumu Beklemede</p>
        <p className="text-xs text-zinc-300">
          Ana ekrana ekleme yalnızca HTTPS veya `localhost` üzerinde görünür. Telefonda yerel IP
          ile `http://` açıldıysa tarayıcı kurulum akışını ve servis worker&apos;ı engeller.
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
      <p className="text-sm font-medium mb-1">Ana Ekrana Ekle</p>
      <p className="text-xs text-zinc-400">
        Chrome bazen ayrı bir yükle butonunu hemen göstermez. Tarayıcı menüsündeki{' '}
        <span className="text-white font-medium">&quot;Uygulamayı yükle&quot;</span> veya{' '}
        <span className="text-white font-medium">&quot;Ana ekrana ekle&quot;</span> seçeneğini
        kontrol et.
      </p>
      {serviceWorkerError && (
        <p className="text-xs text-red-400 mt-2">Servis worker kaydı başarısız: {serviceWorkerError}</p>
      )}
    </div>
  )
}
