'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallPromptContextValue {
  deferredPrompt: BeforeInstallPromptEvent | null
  isIOS: boolean
  isStandalone: boolean
  dismiss: () => void
  install: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptContextValue>({
  deferredPrompt: null,
  isIOS: false,
  isStandalone: false,
  dismiss: () => {},
  install: async () => {},
})

export function useInstallPrompt() {
  return useContext(InstallPromptContext)
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    }

    if (standalone || localStorage.getItem(DISMISSED_KEY)) return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIOS(ios)

    if (ios) return

    // Check if the event was captured early by the inline script in layout.tsx
    const early = (window as unknown as Record<string, unknown>).__deferredInstallPrompt as BeforeInstallPromptEvent | undefined
    if (early) {
      setDeferredPrompt(early)
      return
    }

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDeferredPrompt(null)
    setIsIOS(false)
  }

  return (
    <InstallPromptContext.Provider value={{ deferredPrompt, isIOS, isStandalone, dismiss, install }}>
      {children}
    </InstallPromptContext.Provider>
  )
}
