"use client"

import React, { useEffect, useState, useRef, Component } from "react"
import { db, collection, query, orderBy, limit, onSnapshot } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Leaf,
  CloudRain,
  Thermometer,
  Droplets,
  Bell,
  MessageCircle,
  User,
  Send,
  Cloud,
  Sun,
  Wind,
  Eye,
  Mic,
  MicOff,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SoilMoistureChart from "@/components/soil-moisture-chart"
import TemperatureChart from "@/components/temperature-chart"
import RainfallChart from "@/components/rainfall-chart"
import PlantHealthChart from "@/components/plant-health-chart"
import ReactMarkdown from "react-markdown"
import WeatherMap from "@/components/weather-map"

// Error boundary to catch render-time errors from `react-markdown`
class MarkdownErrorBoundary extends Component<React.PropsWithChildren<{ fallback?: React.ReactNode }>, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any) {
    console.warn("Markdown render error:", error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children as React.ReactNode
  }
}

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

interface ForecastDay {
  date: string
  day: string
  high: number
  low: number
  condition: string
  icon: "sun" | "cloud" | "rain"
  precipitation: number
  humidity: number
  wind: number
}

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentLocation, setCurrentLocation] = useState("New Delhi")
  const [currentLat, setCurrentLat] = useState(28.6139)
  const [currentLon, setCurrentLon] = useState(77.209)
  const [weatherData, setWeatherData] = useState<Record<string, any>>({})
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError] = useState("")
  const recognitionRef = useRef<any>(null)

  // Firebase real-time sensor data
  const [sensorData, setSensorData] = useState({
    temp: 0,
    rain: 0,
    soil: 0,
    plant_health: 0,
  })

  useEffect(() => {
    // Fetch latest sensor data from Firebase
    try {
      const sensorRef = collection(db, "sensor_data")
      const q = query(sensorRef, orderBy("timestamp", "desc"), limit(1))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data()
          setSensorData({
            temp: docData.temp || 0,
            rain: docData.rain || 0,
            soil: docData.soil || 0,
            plant_health: docData.plant_health || 0,
          })
        }
      })

      return () => unsubscribe()
    } catch (error) {
      console.error("Error fetching sensor data:", error)
    }
  }, [])

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const flaskUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL || "http://localhost:5000"
        const response = await fetch(`${flaskUrl}/health`)
        setIsConnected(response.ok)
      } catch (error) {
        setIsConnected(false)
      } finally {
        setLoading(false)
      }
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setInput((prev) => prev + transcript)
          } else {
            interimTranscript += transcript
          }
        }
      }

      recognition.onerror = (event: any) => {
        const errorMessages: Record<string, string> = {
          "network": "Network error - check internet connection",
          "no-speech": "No speech detected - try speaking louder",
          "audio-capture": "Microphone not available",
          "not-allowed": "Microphone permission denied",
          "service-not-allowed": "Speech recognition not available in your region",
        }
        const message = errorMessages[event.error] || `Error: ${event.error}`
        setMicError(message)
        setIsListening(false)
        // Auto-clear error after 3 seconds
        setTimeout(() => setMicError(""), 3000)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    checkBackend()
  }, [])

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setWeatherLoading(true)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,weather_code,humidity,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`,
        )
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        setWeatherData(data)
        console.log("[v0] Weather data updated:", data)

        // Generate forecast from API data
        if (data.daily) {
          const forecastDays: ForecastDay[] = data.daily.time.map((date: string, idx: number) => {
            const weatherCode = data.daily.weather_code[idx]
            let icon: "sun" | "cloud" | "rain" = "cloud"
            let condition = "Cloudy"

            if (weatherCode === 0 || weatherCode === 1) {
              icon = "sun"
              condition = "Sunny"
            } else if (weatherCode >= 2 && weatherCode <= 48) {
              icon = "cloud"
              condition = "Cloudy"
            } else if (weatherCode >= 51 && weatherCode <= 99) {
              icon = "rain"
              condition = "Rainy"
            }

            return {
              date,
              day:
                idx === 0
                  ? "Today"
                  : idx === 1
                    ? "Tomorrow"
                    : new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
              high: Math.round(data.daily.temperature_2m_max[idx]),
              low: Math.round(data.daily.temperature_2m_min[idx]),
              condition,
              icon,
              precipitation: data.daily.precipitation_probability_max[idx] || 0,
              humidity: 65,
              wind: Math.round(data.daily.wind_speed_10m_max?.[idx] || 0),
            }
          })
          setForecast(forecastDays)
          setSelectedDay(0)
        }
      } catch (error) {
        console.warn("Error fetching weather, using mock data:", error)
        // Use mock data on error
        const mockForecast: ForecastDay[] = [
          {
            date: new Date().toISOString().split("T")[0],
            day: "Today",
            high: 28,
            low: 22,
            condition: "Partly Cloudy",
            icon: "cloud",
            precipitation: 10,
            humidity: 65,
            wind: 12,
          },
          {
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            day: "Tomorrow",
            high: 26,
            low: 20,
            condition: "Rainy",
            icon: "rain",
            precipitation: 60,
            humidity: 75,
            wind: 15,
          },
          {
            date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
            day: "Wed",
            high: 25,
            low: 19,
            condition: "Sunny",
            icon: "sun",
            precipitation: 5,
            humidity: 55,
            wind: 8,
          },
          {
            date: new Date(Date.now() + 259200000).toISOString().split("T")[0],
            day: "Thu",
            high: 27,
            low: 21,
            condition: "Cloudy",
            icon: "cloud",
            precipitation: 15,
            humidity: 60,
            wind: 10,
          },
          {
            date: new Date(Date.now() + 345600000).toISOString().split("T")[0],
            day: "Fri",
            high: 29,
            low: 23,
            condition: "Sunny",
            icon: "sun",
            precipitation: 0,
            humidity: 50,
            wind: 7,
          },
          {
            date: new Date(Date.now() + 432000000).toISOString().split("T")[0],
            day: "Sat",
            high: 24,
            low: 18,
            condition: "Rainy",
            icon: "rain",
            precipitation: 70,
            humidity: 80,
            wind: 18,
          },
          {
            date: new Date(Date.now() + 518400000).toISOString().split("T")[0],
            day: "Sun",
            high: 26,
            low: 20,
            condition: "Cloudy",
            icon: "cloud",
            precipitation: 25,
            humidity: 68,
            wind: 11,
          },
        ]
        setForecast(mockForecast)
        setSelectedDay(0)
      } finally {
        setWeatherLoading(false)
      }
    }

    fetchWeatherData()
  }, [currentLat, currentLon])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setChatLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      const data = await response.json()
      
      if (response.ok && data.reply) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          sender: "bot",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        const errorText = data.reply || data.error || 'Sorry, I could not process your request. Please ensure Groq API key is configured.'
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: errorText,
          sender: "bot",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Error connecting to chat service",
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case "sun":
        return <Sun className="h-12 w-12 text-yellow-500" />
      case "cloud":
        return <Cloud className="h-12 w-12 text-gray-400" />
      case "rain":
        return <CloudRain className="h-12 w-12 text-blue-500" />
      default:
        return null
    }
  }

  const handleLocationChange = async (lat: number, lon: number, location: string) => {
    setCurrentLat(lat)
    setCurrentLon(lon)
    setCurrentLocation(location)
  }

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      setMicError("Speech recognition not supported in this browser")
      setTimeout(() => setMicError(""), 3000)
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setMicError("")
    } else {
      setMicError("")
      try {
        recognitionRef.current.start()
      } catch (error) {
        setMicError("Could not start microphone")
        setTimeout(() => setMicError(""), 3000)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
            <h1 className="text-2xl font-bold text-foreground">PlantHealth</h1>
          </div>

          {/* Notifications Icon */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-muted rounded-lg transition relative"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg p-4 z-50">
                  <p className="font-semibold text-sm mb-2">Notifications</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Soil moisture optimal</p>
                    <p>• Rain expected tomorrow</p>
                    <p>• Plant health excellent</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Icon */}
            <button
              onClick={() => setShowChatPanel(!showChatPanel)}
              className="p-2 hover:bg-muted rounded-lg transition"
            >
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* User Profile Icon */}
            <div className="relative">
              <button
                onClick={() => setShowUserProfile(!showUserProfile)}
                className="p-2 hover:bg-muted rounded-lg transition"
              >
                <User className="h-5 w-5 text-muted-foreground" />
              </button>
              {showUserProfile && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg p-4 z-50">
                  <p className="font-semibold text-sm mb-3">User Profile</p>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Name:</span> Farmer John
                    </p>
                    <p>
                      <span className="text-muted-foreground">Farm:</span> Green Fields
                    </p>
                    <p>
                      <span className="text-muted-foreground">Location:</span> {currentLocation}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isConnected ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="weather">Weather & Map</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Real-Time Monitoring</h2>
              <p className="text-muted-foreground">Track your plant health, soil moisture, and weather conditions</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    Soil Moisture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sensorData.soil.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sensorData.soil > 70 ? "Wet" : sensorData.soil > 40 ? "Optimal level" : "Needs water"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-red-500" />
                    Temperature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sensorData.temp.toFixed(1)}°C</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sensorData.temp > 30 ? "High" : sensorData.temp < 15 ? "Low" : "Perfect for growth"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-cyan-500" />
                    Rainfall
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sensorData.rain.toFixed(1)}mm</div>
                  <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-500" />
                    Plant Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sensorData.plant_health.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sensorData.plant_health > 80 ? "Excellent" : sensorData.plant_health > 50 ? "Good" : "Needs attention"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-2 border-blue-200 dark:border-blue-900 bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    Soil Moisture (24h)
                  </CardTitle>
                  <CardDescription>Real-time hourly data</CardDescription>
                </CardHeader>
                <CardContent>
                  <SoilMoistureChart />
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 dark:border-red-900 bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-red-500" />
                    Temperature (24h)
                  </CardTitle>
                  <CardDescription>Hourly temperature tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemperatureChart />
                </CardContent>
              </Card>

              <Card className="border-2 border-cyan-200 dark:border-cyan-900 bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudRain className="h-5 w-5 text-cyan-500" />
                    Rainfall (24h)
                  </CardTitle>
                  <CardDescription>Hourly rainfall data</CardDescription>
                </CardHeader>
                <CardContent>
                  <RainfallChart />
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 dark:border-green-900 bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-500" />
                    Plant Health (24h)
                  </CardTitle>
                  <CardDescription>Health score evolution</CardDescription>
                </CardHeader>
                <CardContent>
                  <PlantHealthChart />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Weather & Map Tab */}
          <TabsContent value="weather" className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Weather Forecast & Map</h2>
              <p className="text-muted-foreground">Search locations, view 7-day forecast and interactive weather map</p>
            </div>

            {/* Daily Forecast */}
            <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
              <CardHeader>
                <CardTitle>Daily Forecast</CardTitle>
                <CardDescription>7-day outlook for your region</CardDescription>
              </CardHeader>
              <CardContent>
                {weatherLoading || forecast.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">Loading forecast...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
                    {forecast.map((day, idx) => (
                      <Card
                        key={day.date}
                        className={`cursor-pointer transition-all ${
                          selectedDay === idx
                            ? "ring-2 ring-primary bg-primary/10 dark:bg-primary/20"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedDay(idx)}
                      >
                        <CardContent className="pt-6 text-center">
                          <p className="text-sm font-semibold">{day.day}</p>
                          <p className="text-xs text-muted-foreground mb-3">{day.date}</p>
                          <div className="flex justify-center mb-3">{getWeatherIcon(day.icon)}</div>
                          <p className="text-xs text-muted-foreground mb-2">{day.condition}</p>
                          <p className="text-lg font-bold">
                            {day.high}°C / {day.low}°C
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weather Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Detailed Weather Info */}
              <div className="lg:col-span-2">
                <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
                  <CardHeader>
                    <CardTitle>
                      {forecast[selectedDay]?.day} - {forecast[selectedDay]?.date}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weatherLoading || !forecast[selectedDay] ? (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-muted-foreground">Loading weather details...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col items-center p-4 border rounded-lg">
                          <Cloud className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">Condition</p>
                          <p className="font-semibold">{forecast[selectedDay].condition}</p>
                        </div>

                        <div className="flex flex-col items-center p-4 border rounded-lg">
                          <Droplets className="h-8 w-8 text-blue-500 mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">Precipitation</p>
                          <p className="font-semibold">{forecast[selectedDay].precipitation}%</p>
                        </div>

                        <div className="flex flex-col items-center p-4 border rounded-lg">
                          <Eye className="h-8 w-8 text-cyan-500 mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">Humidity</p>
                          <p className="font-semibold">{forecast[selectedDay].humidity}%</p>
                        </div>

                        <div className="flex flex-col items-center p-4 border rounded-lg">
                          <Wind className="h-8 w-8 text-gray-500 mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">Wind Speed</p>
                          <p className="font-semibold">{forecast[selectedDay].wind} km/h</p>
                        </div>
                      </div>
                    )}

                    {!weatherLoading && forecast[selectedDay] && (
                      <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Leaf className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-900 dark:text-green-100">
                              Agricultural Recommendation
                            </p>
                            <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                              {forecast[selectedDay].precipitation > 20
                                ? "Good day for watering. Plan irrigation activities accordingly."
                                : "Dry period ahead. Consider increasing irrigation frequency."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 overflow-hidden flex flex-col min-h-96">
                <CardHeader>
                  <CardTitle className="text-lg">Location Weather Map</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
                  <WeatherMap latitude={currentLat} longitude={currentLon} onLocationChange={handleLocationChange} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Chat Panel Sidebar */}
      {showChatPanel && (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-white dark:bg-slate-900 border-l shadow-xl z-40">
          <Card className="h-full rounded-none border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Farmers AI Chat</CardTitle>
              <button onClick={() => setShowChatPanel(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col h-[calc(100%-5rem)] overflow-hidden">
              {micError && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                  {micError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Leaf className="h-10 w-10 text-green-500 mb-2" />
                    <p className="text-sm font-semibold">Welcome to AI Chat</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask about plant care & farming</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            msg.sender === "user"
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-card border border-border text-card-foreground rounded-bl-none"
                          }`}
                        >
                          {msg.sender === "bot" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <MarkdownErrorBoundary fallback={<div className="text-sm text-muted-foreground">Preview unavailable</div>}>
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              </MarkdownErrorBoundary>
                            </div>
                          ) : (
                            msg.text
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-card border border-border px-3 py-2 rounded-lg">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-2 h-2 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Ask about farming..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  disabled={chatLoading}
                  className="bg-background text-sm"
                />
                <Button
                  onClick={toggleMicrophone}
                  size="sm"
                  variant={isListening ? "destructive" : "outline"}
                  className="px-3"
                  title={isListening ? "Stop listening" : "Start listening"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            PlantHealth - Agricultural Monitoring System | Real-time data updates every 5 seconds
          </p>
        </div>
      </footer>
    </div>
  )
}
