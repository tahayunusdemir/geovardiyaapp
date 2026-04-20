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
  install: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptContextValue>({
  deferredPrompt: null,
  isIOS: false,
  isStandalone: false,
  install: async () => {},
})

export function useInstallPrompt() {
  return useContext(InstallPromptContext)
}

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    }

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream)

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
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  return (
    <InstallPromptContext.Provider value={{ deferredPrompt, isIOS, isStandalone, install }}>
      {children}
    </InstallPromptContext.Provider>
  )
}
