'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
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

  useEffect(() => {
    if (
      localStorage.getItem(DISMISSED_KEY) ||
      window.matchMedia('(display-mode: standalone)').matches
    ) return

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
  }

  return (
    <InstallPromptContext.Provider value={{ deferredPrompt, dismiss, install }}>
      {children}
    </InstallPromptContext.Provider>
  )
}
