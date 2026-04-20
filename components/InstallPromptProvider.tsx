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
  isSecureContext: boolean
  serviceWorkerError: string | null
  install: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptContextValue>({
  deferredPrompt: null,
  isIOS: false,
  isStandalone: false,
  isSecureContext: true,
  serviceWorkerError: null,
  install: async () => {},
})

export function useInstallPrompt() {
  return useContext(InstallPromptContext)
}

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
    )
  })
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      navigatorWithStandalone.standalone === true
    )
  })
  const [isSecureContext] = useState(() =>
    typeof window === 'undefined' ? true : window.isSecureContext
  )
  const [serviceWorkerError, setServiceWorkerError] = useState<string | null>(null)

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
    const displayMode = window.matchMedia('(display-mode: standalone)')

    const syncStandaloneState = () => {
      setIsStandalone(displayMode.matches || navigatorWithStandalone.standalone === true)
    }

    if (window.isSecureContext && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(() => setServiceWorkerError(null))
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Service worker kaydı başarısız oldu.'
          setServiceWorkerError(message)
        })
    }

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    function handleInstalled() {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', handleInstalled)
    displayMode.addEventListener('change', syncStandaloneState)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', handleInstalled)
      displayMode.removeEventListener('change', syncStandaloneState)
    }
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <InstallPromptContext.Provider
      value={{ deferredPrompt, isIOS, isStandalone, isSecureContext, serviceWorkerError, install }}
    >
      {children}
    </InstallPromptContext.Provider>
  )
}
