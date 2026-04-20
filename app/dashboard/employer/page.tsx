'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import InstallPrompt from '@/components/InstallPrompt'
import { useTheme } from 'next-themes'
import { Moon, Sun, UserPlus, UserMinus, Search } from 'lucide-react'
import dynamic from 'next/dynamic'

const WorkplaceMap = dynamic(() => import('./WorkplaceMap'), { ssr: false })

interface Employee { _id: string; name: string; surname: string; email: string }
interface LogEntry { _id: string; employeeId: string; employeeName: string; isInside: boolean; checkedAt: string }
interface Workplace {
  _id: string; name: string
  center: { lat: number; lng: number }
  radius: number
  employees: Employee[]
}

type Tab = 'ishyeri' | 'isciler' | 'loglar'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ishyeri', label: 'İşyeri' },
  { id: 'isciler', label: 'İşçiler' },
  { id: 'loglar', label: 'Loglar' },
]

function fmt(date: string) {
  const d = new Date(date)
  return {
    time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
  }
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  if (!resolvedTheme) return <div className="w-8 h-8" />
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      aria-label="Tema değiştir"
    >
      {resolvedTheme === 'dark'
        ? <Sun size={16} />
        : <Moon size={16} />
      }
    </button>
  )
}

export default function EmployerDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('ishyeri')

  // İşyeri state
  const [workplace, setWorkplace] = useState<Workplace | null>(null)
  const [wpName, setWpName] = useState('')
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState(200)
  const [saving, setSaving] = useState(false)

  // İşçi arama state
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Employee[]>([])

  // Log state
  const [allLogs, setAllLogs] = useState<LogEntry[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const workplaceRef = useRef<Workplace | null>(null)

  const loadWorkplace = useCallback(async () => {
    const res = await fetch('/api/workplace')
    const data = await res.json()
    if (data.workplace) {
      workplaceRef.current = data.workplace
      setWorkplace(data.workplace)
      setWpName(data.workplace.name)
      setCenter(data.workplace.center)
      setRadius(data.workplace.radius)
    }
  }, [])

  const loadLogs = useCallback(async () => {
    const wp = workplaceRef.current
    if (!wp) return
    setIsRefreshing(true)
    setConnectionError(false)
    try {
      const res = await fetch(`/api/location/logs?workplaceId=${wp._id}&limit=100`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAllLogs(data.logs ?? [])
      setLastUpdated(new Date())
    } catch {
      setConnectionError(true)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadWorkplace() }, [loadWorkplace])

  useEffect(() => {
    if (!workplace) return
    loadLogs()
    const t = setInterval(loadLogs, 300_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadLogs()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [workplace, loadLogs])

  async function saveWorkplace() {
    if (!center || !wpName) return
    setSaving(true)
    await fetch('/api/workplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wpName, center, radius }),
    })
    await loadWorkplace()
    setSaving(false)
  }

  async function searchEmployees(q: string) {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    const res = await fetch(`/api/employees?q=${q}`)
    const data = await res.json()
    setSearchResults(data.employees ?? [])
  }

  async function addEmployee(employeeId: string) {
    await fetch('/api/workplace/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, action: 'add' }),
    })
    setSearchQ(''); setSearchResults([])
    await loadWorkplace()
  }

  async function removeEmployee(employeeId: string) {
    await fetch('/api/workplace/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, action: 'remove' }),
    })
    await loadWorkplace()
  }

  const displayedLogs = selectedEmployeeId === 'all'
    ? allLogs
    : allLogs.filter(l => l.employeeId === selectedEmployeeId)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="font-bold text-sm sm:text-base truncate">GeoVardiyaApp</span>
          <span className="shrink-0 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-full">İşveren</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-400">{session?.user?.name}</span>
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1"
          >
            Çıkış
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'loglar') loadLogs() }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-5xl mx-auto p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">

        {/* İşyeri Sekmesi */}
        {activeTab === 'ishyeri' && (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-sm dark:shadow-none">
            <h2 className="font-semibold text-base">İşyeri Alanı Tanımla</h2>

            <input
              value={wpName}
              onChange={e => setWpName(e.target.value)}
              placeholder="İşyeri adı"
              className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3.5 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
            />

            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0">
                Yarıçap: <span className="text-zinc-900 dark:text-white font-medium">{radius}m</span>
              </label>
              <input
                type="range" min={50} max={1000} step={50}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="flex-1 accent-zinc-900 dark:accent-white h-2"
              />
            </div>

            <div className="rounded-xl overflow-hidden h-72 sm:h-96 bg-zinc-100 dark:bg-zinc-800">
              <WorkplaceMap center={center} radius={radius} onCenterChange={setCenter} />
            </div>

            {center && (
              <p className="text-xs text-zinc-500">
                Seçilen konum: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </p>
            )}

            <button
              onClick={saveWorkplace}
              disabled={saving || !center || !wpName}
              className="w-full sm:w-auto sm:self-start px-5 py-3 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </section>
        )}

        {/* İşçiler Sekmesi */}
        {activeTab === 'isciler' && (
          <div className="flex flex-col gap-4">

            {/* İşçi Ekle */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 flex flex-col gap-3 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-zinc-500 shrink-0" />
                <h2 className="font-semibold text-base">Mevcut İşyerine İşçi Ekle</h2>
              </div>
              {!workplace && (
                <p className="text-sm text-zinc-500">Önce bir işyeri alanı tanımlayın.</p>
              )}
              {workplace && (
                <>
                  <p className="text-xs text-zinc-500">
                    Sisteme kayıtlı bir işçiyi arayıp <span className="font-medium text-zinc-700 dark:text-zinc-300">{workplace.name}</span> işyerine ekleyin.
                  </p>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      value={searchQ}
                      onChange={e => searchEmployees(e.target.value)}
                      placeholder="İsim veya e-posta ile ara..."
                      className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 pl-9 pr-3.5 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                        {searchResults.map(emp => (
                          <button
                            key={emp._id}
                            onClick={() => addEmployee(emp._id)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-left active:bg-zinc-100 dark:active:bg-zinc-600 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{emp.name} {emp.surname}</p>
                              <p className="text-xs text-zinc-500 truncate">{emp.email}</p>
                            </div>
                            <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/15 px-2.5 py-1 rounded-full">
                              <UserPlus size={11} /> Ekle
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* İşyerindeki İşçiler */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 flex flex-col gap-3 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserMinus size={16} className="text-zinc-500 shrink-0" />
                  <h2 className="font-semibold text-base">İşyerindeki İşçiler</h2>
                </div>
                {workplace && workplace.employees.length > 0 && (
                  <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {workplace.employees.length} işçi
                  </span>
                )}
              </div>

              {!workplace || workplace.employees.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {workplace ? 'Bu işyerinde henüz kayıtlı işçi yok.' : 'Önce bir işyeri alanı tanımlayın.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {workplace.employees.map(emp => (
                    <div key={emp._id} className="flex items-center justify-between gap-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-zinc-900 dark:text-white">{emp.name} {emp.surname}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{emp.email}</p>
                      </div>
                      <button
                        onClick={() => removeEmployee(emp._id)}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 active:bg-red-200 dark:active:bg-red-500/30 transition-colors"
                      >
                        <UserMinus size={13} /> İşyerinden Çıkar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {/* Loglar Sekmesi */}
        {activeTab === 'loglar' && (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-sm dark:shadow-none">
            {/* Başlık + yenileme durumu */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-semibold text-base">Log Kayıtları</h2>
              <div className="flex items-center gap-3">
                {connectionError && (
                  <span className="text-xs text-red-500 dark:text-red-400">Bağlantı hatası</span>
                )}
                {lastUpdated && !connectionError && (
                  <span className="text-xs text-zinc-500">
                    Son: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {isRefreshing && ' · Yenileniyor...'}
                  </span>
                )}
                <button
                  onClick={() => loadLogs()}
                  disabled={isRefreshing}
                  className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  Yenile
                </button>
              </div>
            </div>

            {/* Filtreler */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs text-zinc-500">Alan</label>
                <select
                  className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  value={workplace?._id ?? ''}
                  disabled
                >
                  {workplace
                    ? <option value={workplace._id}>{workplace.name}</option>
                    : <option value="">Alan tanımlanmamış</option>
                  }
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs text-zinc-500">Çalışan</label>
                <select
                  className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="all">Tümü</option>
                  {workplace?.employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} {emp.surname}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Log Tablosu */}
            {!workplace ? (
              <p className="text-sm text-zinc-500">Önce bir işyeri alanı tanımlayın.</p>
            ) : displayedLogs.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {isRefreshing ? 'Yükleniyor...' : 'Henüz konum kaydı yok.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="text-left px-4 py-3 font-medium">Saat</th>
                      <th className="text-left px-4 py-3 font-medium">Tarih</th>
                      {selectedEmployeeId === 'all' && (
                        <th className="text-left px-4 py-3 font-medium">Çalışan</th>
                      )}
                      <th className="text-left px-4 py-3 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLogs.map((log, i) => {
                      const { time, date } = fmt(log.checkedAt)
                      return (
                        <tr
                          key={log._id as string}
                          className={`border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 ${i % 2 === 0 ? '' : 'bg-zinc-50/50 dark:bg-zinc-800/20'}`}
                        >
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 tabular-nums">{time}</td>
                          <td className="px-4 py-3 text-zinc-500">{date}</td>
                          {selectedEmployeeId === 'all' && (
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">{log.employeeName}</td>
                          )}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                              log.isInside
                                ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                            }`}>
                              {log.isInside ? '✓ İçeride' : '✗ Dışarıda'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-zinc-400 dark:text-zinc-600">Her 5 dakikada bir otomatik yenilenir.</p>
          </section>
        )}

      </div>
      <InstallPrompt />
    </div>
  )
}
