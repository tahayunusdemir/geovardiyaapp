'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Props {
  center: { lat: number; lng: number } | null
  radius: number
  onCenterChange: (c: { lat: number; lng: number }) => void
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function WorkplaceMap({ center, radius, onCenterChange }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: center ? [center.lat, center.lng] : [39.9334, 32.8597],
      zoom: 15,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onCenterChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return

    if (markerRef.current) markerRef.current.remove()
    if (circleRef.current) circleRef.current.remove()

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.6),0 0 0 4px rgba(59,130,246,0.35)"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
    markerRef.current = L.marker([center.lat, center.lng], { icon }).addTo(map)
    circleRef.current = L.circle([center.lat, center.lng], {
      radius,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 3,
      dashArray: '6 4',
    }).addTo(map)

    map.setView([center.lat, center.lng], map.getZoom())
  }, [center, radius])

  function handleSearchInput(value: string) {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.length < 3) { setSearchResults([]); return }

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=tr`,
          { headers: { 'Accept-Language': 'tr' } }
        )
        const data: NominatimResult[] = await res.json()
        setSearchResults(data)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  function selectResult(result: NominatimResult) {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    onCenterChange({ lat, lng })
    mapRef.current?.setView([lat, lng], 16)
    setSearchQuery(result.display_name.split(',')[0])
    setSearchResults([])
  }

  function getMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        onCenterChange({ lat, lng })
        mapRef.current?.setView([lat, lng], 17)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Arama + Konumum */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <input
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Adres veya yer ara..."
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-500"
          />
          {searching && (
            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs animate-pulse">Aranıyor...</span>
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[1000] bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
              {searchResults.map(r => (
                <button
                  key={r.place_id}
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-3 text-sm text-zinc-200 hover:bg-zinc-800 border-b border-zinc-800 last:border-0 active:bg-zinc-700"
                >
                  <span className="font-medium">{r.display_name.split(',')[0]}</span>
                  <span className="text-zinc-500 text-xs block truncate">
                    {r.display_name.split(',').slice(1, 3).join(',')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={getMyLocation}
          disabled={locating}
          title="Konumumu al"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 active:bg-zinc-600 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          <span className="hidden sm:inline">{locating ? 'Alınıyor...' : 'Konumum'}</span>
          {locating && <span className="sm:hidden text-xs animate-pulse">...</span>}
        </button>
      </div>

      <div ref={containerRef} className="w-full flex-1" />
    </div>
  )
}
