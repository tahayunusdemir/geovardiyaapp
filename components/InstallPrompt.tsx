'use client'

import { useInstallPrompt } from './InstallPromptProvider'

export default function InstallPrompt() {
  const { deferredPrompt, install, dismiss } = useInstallPrompt()

  if (!deferredPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
      <span className="text-sm text-zinc-300">📱 Ana ekrana ekle</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={install}
          className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors"
        >
          Yükle
        </button>
        <button
          onClick={dismiss}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
    </div>
  )
}
