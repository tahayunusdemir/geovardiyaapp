'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import InstallPrompt from '@/components/InstallPrompt'

export default function Page() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function switchTab(next: 'login' | 'register') {
    setTab(next)
    setError('')
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)

    try {
      const result = await signIn('credentials', {
        email: form.get('email'),
        password: form.get('password'),
        redirect: false,
      })

      if (result?.error) {
        setError('E-posta veya şifre hatalı')
        return
      }

      const res = await fetch('/api/auth/session')
      const session = await res.json()
      const role = session?.user?.role

      if (role === 'employer') router.push('/dashboard/employer')
      else if (role === 'employee') router.push('/dashboard/employee')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          surname: form.get('surname'),
          email: form.get('email'),
          password: form.get('password'),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Kayıt başarısız')
        return
      }

      switchTab('login')
    } catch {
      setError('Bağlantı hatası, tekrar dene')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-xs">

        <h1 className="text-white text-xl font-semibold tracking-tight mb-8 text-center">
          GeoVardiyaApp
        </h1>

        {/* Tabs */}
        <div className="flex border border-zinc-800 rounded-lg overflow-hidden mb-6">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'login'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Giriş
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'register'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Kayıt
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="E-posta"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
            <input
              name="password"
              type="password"
              placeholder="Şifre"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors mt-1"
            >
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                name="name"
                type="text"
                placeholder="Ad"
                required
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
              />
              <input
                name="surname"
                type="text"
                placeholder="Soyad"
                required
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
            <input
              name="email"
              type="email"
              placeholder="E-posta"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
            <input
              name="password"
              type="password"
              placeholder="Şifre (en az 6 karakter)"
              required
              minLength={6}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 transition-colors mt-1"
            >
              {loading ? 'Kayıt yapılıyor…' : 'Kayıt Ol'}
            </button>
            <p className="text-xs text-zinc-600 text-center">
              Sadece işçi kaydı bu ekrandan yapılır.
            </p>
          </form>
        )}

      </div>
      <InstallPrompt />
    </div>
  )
}
