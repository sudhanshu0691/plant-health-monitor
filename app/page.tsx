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
  Newspaper,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SoilMoistureChart from "@/components/soil-moisture-chart"
import TemperatureChart from "@/components/temperature-chart"
import RainfallChart from "@/components/rainfall-chart"
import PlantHealthChart from "@/components/plant-health-chart"
import ReactMarkdown from "react-markdown"
import WeatherMap from "@/components/weather-map"
import { ThemeToggle } from "@/components/theme-toggle"
import { AgricultureNews } from "@/components/agriculture-news"
import { motion, AnimatePresence } from "framer-motion"

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
  const [currentWeather, setCurrentWeather] = useState({ temp: 0, condition: "", humidity: 0, wind: 0 })
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
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || "9650883a16c1c44d3a37b3f7eb15648c"
        
        // Fetch current weather
        const currentResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${currentLat}&lon=${currentLon}&appid=${apiKey}&units=metric`
        )
        
        if (currentResponse.ok) {
          const currentData = await currentResponse.json()
          const condition = currentData.weather[0].description
          setCurrentWeather({
            temp: Math.round(currentData.main.temp),
            condition: condition.charAt(0).toUpperCase() + condition.slice(1),
            humidity: currentData.main.humidity,
            wind: Math.round(currentData.wind.speed * 3.6)
          })
        }
        
        // Fetch current weather and 7-day forecast
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${currentLat}&lon=${currentLon}&appid=${apiKey}&units=metric&cnt=40`,
        )
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        setWeatherData(data)
        console.log("Weather data updated:", data)

        // Generate forecast from API data - group by day
        if (data.list) {
          const dailyData: Record<string, any[]> = {}
          
          data.list.forEach((item: any) => {
            const date = new Date(item.dt * 1000).toISOString().split('T')[0]
            if (!dailyData[date]) {
              dailyData[date] = []
            }
            dailyData[date].push(item)
          })

          const forecastDays: ForecastDay[] = Object.entries(dailyData).slice(0, 7).map(([date, items], idx) => {
            const temps = items.map((i: any) => i.main.temp)
            const high = Math.round(Math.max(...temps))
            const low = Math.round(Math.min(...temps))
            const weatherId = items[0].weather[0].id
            
            let icon: "sun" | "cloud" | "rain" = "cloud"
            let condition = items[0].weather[0].description
            
            // Better weather condition mapping
            if (weatherId >= 200 && weatherId < 600) {
              icon = "rain"
              condition = weatherId >= 500 && weatherId < 600 ? "Rainy" : "Thunderstorm"
            } else if (weatherId === 800) {
              icon = "sun"
              condition = "Sunny"
            } else if (weatherId === 801) {
              icon = "cloud"
              condition = "Partly Cloudy"
            } else if (weatherId > 801) {
              icon = "cloud"
              condition = "Cloudy"
            } else {
              icon = "cloud"
              condition = items[0].weather[0].main
            }
            
            // Capitalize first letter if using API description
            if (condition.includes(' ') || condition.length > 10) {
              condition = condition.charAt(0).toUpperCase() + condition.slice(1)
            }

            const precipitation = items.reduce((acc: number, i: any) => acc + (i.pop || 0), 0) / items.length * 100
            const humidity = Math.round(items.reduce((acc: number, i: any) => acc + i.main.humidity, 0) / items.length)
            const wind = Math.round(items.reduce((acc: number, i: any) => acc + i.wind.speed, 0) / items.length * 3.6)

            return {
              date,
              day:
                idx === 0
                  ? "Today"
                  : idx === 1
                    ? "Tomorrow"
                    : new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
              high,
              low,
              condition,
              icon,
              precipitation: Math.round(precipitation),
              humidity,
              wind,
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 shadow-sm transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
            <h1 className="text-2xl font-bold text-foreground">PlantHealth</h1>
          </div>

          {/* Notifications Icon */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm">User Profile</p>
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                      <span className={`text-xs ${isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {isConnected ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm"> <p>
                      <span className="text-muted-foreground">Name:</span> Sudhanshu Singh+
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
                {isConnected ? "Online" : "Offline"}
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
            <TabsTrigger value="news">
              <Newspaper className="h-4 w-4 mr-2" />
              News
            </TabsTrigger>
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

            {/* Current Weather Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Weather - {currentLocation}</span>
                  <span className="text-sm font-normal text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weatherLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">Loading current weather...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <Thermometer className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-3xl font-bold">{currentWeather.temp}°C</p>
                      <p className="text-sm text-muted-foreground">{currentWeather.condition}</p>
                    </div>
                    <div className="text-center">
                      <Droplets className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-3xl font-bold">{currentWeather.humidity}%</p>
                      <p className="text-sm text-muted-foreground">Humidity</p>
                    </div>
                    <div className="text-center">
                      <Wind className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-3xl font-bold">{currentWeather.wind}</p>
                      <p className="text-sm text-muted-foreground">km/h Wind</p>
                    </div>
                    <div className="text-center">
                      <Cloud className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-3xl font-bold">{forecast[0]?.precipitation || 0}%</p>
                      <p className="text-sm text-muted-foreground">Precipitation</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

          {/* News Tab */}
          <TabsContent value="news" className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Agriculture News</h2>
              <p className="text-muted-foreground">Stay updated with the latest farming and agriculture news</p>
            </div>

            <AgricultureNews />
          </TabsContent>
        </Tabs>
      </main>

      {/* Chat Panel Sidebar */}
      <AnimatePresence>
        {showChatPanel && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l shadow-2xl z-40"
          >
            <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Farmers AI Assistant
                </CardTitle>
                <Button
                  onClick={() => setShowChatPanel(false)}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted transition-all duration-200 hover:rotate-90"
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col h-[calc(100%-5rem)] overflow-hidden p-4">
                {micError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 backdrop-blur-sm"
                  >
                    {micError}
                  </motion.div>
                )}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center h-full text-center"
                    >
                      <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-full mb-4">
                        <Leaf className="h-12 w-12 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-base font-semibold text-foreground">Welcome to AI Chat</p>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        Ask me anything about plant care, farming techniques, or crop management
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      <AnimatePresence mode="popLayout">
                        {messages.map((msg, index) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-200 hover:shadow-md ${
                                msg.sender === "user"
                                  ? "bg-gradient-to-br from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white rounded-br-sm"
                                  : "bg-white dark:bg-slate-800 border border-border text-foreground rounded-bl-sm"
                              }`}
                            >
                              {msg.sender === "bot" ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <MarkdownErrorBoundary
                                    fallback={<div className="text-sm text-muted-foreground">Preview unavailable</div>}
                                  >
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                  </MarkdownErrorBoundary>
                                </div>
                              ) : (
                                <p>{msg.text}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {chatLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white dark:bg-slate-800 border border-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                            <div className="flex gap-1">
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                                className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"
                              />
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"
                              />
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={scrollRef} />
                    </>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t dark:border-slate-800">
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
                    className="bg-background border-2 text-sm focus:border-green-500 dark:focus:border-green-600 transition-colors"
                  />
                  <Button
                    onClick={toggleMicrophone}
                    size="sm"
                    variant={isListening ? "destructive" : "outline"}
                    className={`px-3 transition-all duration-300 ${isListening ? "animate-pulse" : ""}`}
                    title={isListening ? "Stop listening" : "Start listening"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={chatLoading || !input.trim()}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 transition-all duration-200 hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      {!showChatPanel && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowChatPanel(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-700 dark:to-green-800 dark:hover:from-green-800 dark:hover:to-green-900 text-white rounded-full shadow-2xl transition-all duration-300 z-40 group"
          title="Open Chat"
        >
          <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
        </motion.button>
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
