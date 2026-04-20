'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __deferredInstallPrompt: BeforeInstallPromptEvent | null
  }
}

interface InstallPromptContextValue {
  deferredPrompt: BeforeInstallPromptEvent | null
  dismiss: () => void
  install: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptContextValue>({
  deferredPrompt: null,
  dismiss: () => {},
  install: async () => {},
})

export function useInstallPrompt() {
  return useContext(InstallPromptContext)
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const captured = useRef(false)

  useEffect(() => {
    if (captured.current) return
    captured.current = true

    if (
      localStorage.getItem(DISMISSED_KEY) ||
      window.matchMedia('(display-mode: standalone)').matches
    ) return

    // Event React hydrate'dan önce tetiklendiyse global değişkende bekliyor
    const early = window.__deferredInstallPrompt
    if (early) {
      window.__deferredInstallPrompt = null
      // Bir sonraki tick'te set et — effect içi senkron setState lint kuralını aş
      Promise.resolve().then(() => setDeferredPrompt(early))
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
  }

  return (
    <InstallPromptContext.Provider value={{ deferredPrompt, dismiss, install }}>
      {children}
    </InstallPromptContext.Provider>
  )
}
