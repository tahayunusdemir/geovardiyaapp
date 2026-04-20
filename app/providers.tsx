'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { InstallPromptProvider } from '@/components/InstallPromptProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <SessionProvider>
        <InstallPromptProvider>{children}</InstallPromptProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
