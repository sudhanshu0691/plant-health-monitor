"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader } from "lucide-react"

interface WeatherMapProps {
  latitude?: number
  longitude?: number
  onLocationChange?: (latitude: number, longitude: number, location: string) => void
}

export default function WeatherMap({ latitude = 28.6139, longitude = 77.209, onLocationChange }: WeatherMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState("New Delhi")
  const [currentLat, setCurrentLat] = useState(latitude)
  const [currentLon, setCurrentLon] = useState(longitude)
  const [weatherInfo, setWeatherInfo] = useState({ temp: 24, condition: "Partly Cloudy" })
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const weatherLayerRef = useRef<any>(null)

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const apiKey = "9650883a16c1c44d3a37b3f7eb15648c"
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      )
      if (response.ok) {
        const data = await response.json()
        setWeatherInfo({
          temp: Math.round(data.main.temp),
          condition: data.weather[0].description
        })
      }
    } catch (error) {
      console.error("Weather fetch error:", error)
    }
  }

  useEffect(() => {
    fetchWeather(currentLat, currentLon)
  }, [currentLat, currentLon])

  useEffect(() => {
    if (!mapRef.current) return

    // Load Leaflet CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
    document.head.appendChild(link)

    // Load Leaflet JS
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
    script.async = true

    script.onload = () => {
      if ((window as any).L && mapRef.current) {
        const L = (window as any).L

        const map = L.map(mapRef.current).setView([currentLat, currentLon], 10)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map)

        // Add OpenWeatherMap weather layer
        const apiKey = "9650883a16c1c44d3a37b3f7eb15648c"
        const weatherLayer = L.tileLayer(
          `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
          {
            attribution: "Weather data © OpenWeatherMap",
            opacity: 0.5,
            maxZoom: 19,
          }
        ).addTo(map)
        weatherLayerRef.current = weatherLayer

        const marker = L.marker([currentLat, currentLon], {
          icon: L.icon({
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            shadowSize: [41, 41],
          }),
        })
          .addTo(map)
          .bindPopup(
            `<div style="font-size: 12px"><strong>${currentLocation}</strong><br/>Temperature: ${weatherInfo.temp}°C<br/>Condition: ${weatherInfo.condition}</div>`,
          )
          .openPopup()

        mapInstanceRef.current = map
        markerRef.current = marker

        setMapLoaded(true)
      }
    }

    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const L = (window as any).L
      mapInstanceRef.current.setView([currentLat, currentLon], 10)
      markerRef.current.setLatLng([currentLat, currentLon])
      markerRef.current.setPopupContent(
        `<div style="font-size: 12px"><strong>${currentLocation}</strong><br/>Temperature: ${weatherInfo.temp}°C<br/>Condition: ${weatherInfo.condition}</div>`,
      )
    }
  }, [currentLat, currentLon, currentLocation, weatherInfo])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearchLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        const newLat = Number.parseFloat(result.lat)
        const newLon = Number.parseFloat(result.lon)
        const newLocation = result.display_name.split(",")[0] || searchQuery

        setCurrentLat(newLat)
        setCurrentLon(newLon)
        setCurrentLocation(newLocation)

        // Callback to parent component to update weather data
        if (onLocationChange) {
          onLocationChange(newLat, newLon, newLocation)
        }
      } else {
        alert("Location not found. Please try another search.")
      }
    } catch (error) {
      console.error("Search error:", error)
      alert("Error searching for location")
    } finally {
      setSearchLoading(false)
      setSearchQuery("")
    }
  }

  return (
    <div className="space-y-4 w-full h-full flex flex-col">
      <div className="flex gap-2">
        <Input
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleSearch()
            }
          }}
          disabled={searchLoading}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()} size="sm" className="px-3">
          {searchLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground px-1">
        Current location: <span className="font-semibold text-foreground">{currentLocation}</span>
      </div>

      {/* Map container */}
      <div className="flex-1 w-full rounded-lg bg-gray-100 overflow-hidden relative">
        <div
          ref={mapRef}
          className="w-full h-full"
          data-testid="leaflet-map"
        >
          {!mapLoaded && (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
