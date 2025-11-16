"use client"

import React, { useEffect, useState, useRef, Component } from "react"
import { db, collection, query, orderBy, limit, onSnapshot, where, getDocs } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  BarChart3,
  TrendingUp,
  BellOff,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import SoilMoistureChart from "@/components/soil-moisture-chart"
import TemperatureChart from "@/components/temperature-chart"
import RainfallChart from "@/components/rainfall-chart"
import PlantHealthChart from "@/components/plant-health-chart"
import ReactMarkdown from "react-markdown"
import WeatherMap from "@/components/weather-map"
import { ThemeToggle } from "@/components/theme-toggle"
import { AgricultureNews } from "@/components/agriculture-news"
import { motion, AnimatePresence } from "framer-motion"
import FirebaseGraph from "@/components/firebase-graph"
import { useNotifications } from "@/contexts/NotificationContext"
import { 
  analyzeSensorReading, 
  getParameterStatus, 
  getStatusBgColor, 
  SensorReading,
  getParameterRecommendation
} from "@/lib/agroMonitoring"
import { 
  DailyHealthReport, 
  generateDailyHealthReport 
} from "@/lib/dailyAnalysis"

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
  const [notificationsList, setNotificationsList] = useState<Array<{id: string, message: string, status: string, timestamp: Date, parameter: string}>>([])
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

  // Analysis Dashboard states
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const { sendMultipleAlerts, sendInfoNotification } = useNotifications()
  const previousAnalysisDataRef = useRef<any>(null)
  const [dailyReport, setDailyReport] = useState<DailyHealthReport | null>(null)
  const [dailyReadings, setDailyReadings] = useState<SensorReading[]>([])

  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("userLocation")
    if (savedLocation) {
      try {
        const { location, lat, lon } = JSON.parse(savedLocation)
        setCurrentLocation(location)
        setCurrentLat(lat)
        setCurrentLon(lon)
      } catch (error) {
        console.error("Error loading saved location:", error)
      }
    }
  }, [])

  useEffect(() => {
    // Fetch latest sensor data from Firebase
    try {
      const sensorRef = collection(db, "sensor_data")
      const q = query(sensorRef, orderBy("timestamp", "desc"), limit(1))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data()
          const newData = {
            temp: docData.temp || 0,
            rain: docData.rain || 0,
            soil: docData.soil || 0,
            plant_health: docData.plant_health || 0,
            humidity: docData.humidity,
            light_intensity: docData.light_intensity,
            timestamp: docData.timestamp,
          }
          
          setSensorData(newData)
          setAnalysisData(newData)
          
          // Update notifications list based on current sensor status
          const currentNotifications: Array<{id: string, message: string, status: string, timestamp: Date, parameter: string}> = []
          
          // Check each parameter and add to notifications
          const tempStatus = getParameterStatus('temp', newData.temp)
          const soilStatus = getParameterStatus('soil', newData.soil)
          const rainStatus = getParameterStatus('rain', newData.rain)
          const healthStatus = getParameterStatus('plant_health', newData.plant_health)
          
          if (tempStatus === 'critical') {
            currentNotifications.push({
              id: `temp-${Date.now()}`,
              message: `🚨 Temperature critical: ${newData.temp.toFixed(1)}°C`,
              status: 'critical',
              timestamp: new Date(),
              parameter: 'temp'
            })
          } else if (tempStatus === 'warning') {
            currentNotifications.push({
              id: `temp-${Date.now()}`,
              message: `⚠️ Temperature warning: ${newData.temp.toFixed(1)}°C`,
              status: 'warning',
              timestamp: new Date(),
              parameter: 'temp'
            })
          } else {
            currentNotifications.push({
              id: `temp-${Date.now()}`,
              message: `✅ Temperature optimal: ${newData.temp.toFixed(1)}°C`,
              status: 'normal',
              timestamp: new Date(),
              parameter: 'temp'
            })
          }
          
          if (soilStatus === 'critical') {
            currentNotifications.push({
              id: `soil-${Date.now()}`,
              message: `🚨 Soil moisture critical: ${newData.soil.toFixed(1)}%`,
              status: 'critical',
              timestamp: new Date(),
              parameter: 'soil'
            })
          } else if (soilStatus === 'warning') {
            currentNotifications.push({
              id: `soil-${Date.now()}`,
              message: `⚠️ Soil moisture warning: ${newData.soil.toFixed(1)}%`,
              status: 'warning',
              timestamp: new Date(),
              parameter: 'soil'
            })
          } else {
            currentNotifications.push({
              id: `soil-${Date.now()}`,
              message: `✅ Soil moisture optimal: ${newData.soil.toFixed(1)}%`,
              status: 'normal',
              timestamp: new Date(),
              parameter: 'soil'
            })
          }
          
          if (rainStatus === 'critical') {
            currentNotifications.push({
              id: `rain-${Date.now()}`,
              message: `🚨 Rainfall critical: ${newData.rain.toFixed(1)}mm`,
              status: 'critical',
              timestamp: new Date(),
              parameter: 'rain'
            })
          } else if (rainStatus === 'warning') {
            currentNotifications.push({
              id: `rain-${Date.now()}`,
              message: `⚠️ Rainfall warning: ${newData.rain.toFixed(1)}mm`,
              status: 'warning',
              timestamp: new Date(),
              parameter: 'rain'
            })
          } else {
            currentNotifications.push({
              id: `rain-${Date.now()}`,
              message: `✅ Rainfall normal: ${newData.rain.toFixed(1)}mm`,
              status: 'normal',
              timestamp: new Date(),
              parameter: 'rain'
            })
          }
          
          if (healthStatus === 'critical') {
            currentNotifications.push({
              id: `health-${Date.now()}`,
              message: `🚨 Plant health critical: ${newData.plant_health.toFixed(1)}%`,
              status: 'critical',
              timestamp: new Date(),
              parameter: 'plant_health'
            })
          } else if (healthStatus === 'warning') {
            currentNotifications.push({
              id: `health-${Date.now()}`,
              message: `⚠️ Plant health needs attention: ${newData.plant_health.toFixed(1)}%`,
              status: 'warning',
              timestamp: new Date(),
              parameter: 'plant_health'
            })
          } else {
            currentNotifications.push({
              id: `health-${Date.now()}`,
              message: `✅ Plant health excellent: ${newData.plant_health.toFixed(1)}%`,
              status: 'normal',
              timestamp: new Date(),
              parameter: 'plant_health'
            })
          }
          
          if (newData.humidity !== undefined) {
            const humidityStatus = getParameterStatus('humidity', newData.humidity)
            if (humidityStatus === 'critical' || humidityStatus === 'warning') {
              currentNotifications.push({
                id: `humidity-${Date.now()}`,
                message: `${humidityStatus === 'critical' ? '🚨' : '⚠️'} Humidity ${humidityStatus}: ${newData.humidity.toFixed(1)}%`,
                status: humidityStatus,
                timestamp: new Date(),
                parameter: 'humidity'
              })
            }
          }
          
          if (newData.light_intensity !== undefined) {
            const lightStatus = getParameterStatus('light_intensity', newData.light_intensity)
            if (lightStatus === 'critical' || lightStatus === 'warning') {
              currentNotifications.push({
                id: `light-${Date.now()}`,
                message: `${lightStatus === 'critical' ? '🚨' : '⚠️'} Light intensity ${lightStatus}: ${newData.light_intensity.toFixed(1)}`,
                status: lightStatus,
                timestamp: new Date(),
                parameter: 'light_intensity'
              })
            }
          }
          
          setNotificationsList(currentNotifications)
          
          // Check for alerts only if notifications are enabled and data has changed
          if (notificationsEnabled && previousAnalysisDataRef.current) {
            const sensorReading: SensorReading = {
              temp: newData.temp,
              rain: newData.rain,
              soil: newData.soil,
              plant_health: newData.plant_health,
              humidity: newData.humidity,
              light_intensity: newData.light_intensity,
              timestamp: newData.timestamp,
            }
            
            const alerts = analyzeSensorReading(sensorReading)
            if (alerts.length > 0) {
              sendMultipleAlerts(alerts)
            }
          }
          
          previousAnalysisDataRef.current = newData
        }
        setAnalysisLoading(false)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error("Error fetching sensor data:", error)
      setAnalysisLoading(false)
    }
  }, [notificationsEnabled, sendMultipleAlerts])

  // Fetch daily report data (last 24 hours)
  useEffect(() => {
    const fetchDailyData = async () => {
      try {
        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        
        const sensorRef = collection(db, "sensor_data")
        const q = query(
          sensorRef,
          where("timestamp", ">=", yesterday),
          where("timestamp", "<=", now),
          orderBy("timestamp", "asc")
        )

        const snapshot = await getDocs(q)
        const readings: SensorReading[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            temp: data.temp || 0,
            rain: data.rain || 0,
            soil: data.soil || 0,
            plant_health: data.plant_health || 0,
            humidity: data.humidity,
            light_intensity: data.light_intensity,
            timestamp: data.timestamp,
          }
        })
        
        setDailyReadings(readings)
        
        if (readings.length > 0) {
          const dateStr = now.toISOString().split('T')[0]
          const report = generateDailyHealthReport(readings, dateStr)
          setDailyReport(report)
        }
      } catch (error) {
        console.error("Error fetching daily data:", error)
      }
    }

    fetchDailyData()
    // Refresh every 30 minutes
    const interval = setInterval(fetchDailyData, 30 * 60 * 1000)
    return () => clearInterval(interval)
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
    
    // Save location to localStorage
    localStorage.setItem(
      "userLocation",
      JSON.stringify({ location, lat, lon })
    )
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

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
    if (!notificationsEnabled) {
      sendInfoNotification("Notifications enabled")
    } else {
      sendInfoNotification("Notifications disabled")
    }
  }

  const getParameterStatusInfo = (param: string, value: number) => {
    const status = getParameterStatus(param, value)
    const statusBg = getStatusBgColor(status)
    const statusEmoji = status === 'normal' ? '✅' : status === 'warning' ? '⚠️' : '🚨'
    const statusText = status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'Critical'
    
    return { statusBg, statusEmoji, statusText, status }
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
                {notificationsList.some(n => n.status === 'critical' || n.status === 'warning') && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border sticky top-0 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">Live Notifications</p>
                      <Badge variant={notificationsList.some(n => n.status === 'critical') ? 'destructive' : 'default'}>
                        {notificationsList.filter(n => n.status === 'critical' || n.status === 'warning').length} alerts
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated: {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="p-2 space-y-1">
                    {notificationsList.length > 0 ? (
                      notificationsList.map((notification) => {
                        const bgColor = notification.status === 'critical' 
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' 
                          : notification.status === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
                          : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        
                        return (
                          <div 
                            key={notification.id} 
                            className={`p-3 rounded-lg border ${bgColor} transition-all hover:scale-[1.02]`}
                          >
                            <p className="text-sm font-medium">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.timestamp.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </p>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    )}
                  </div>
                  {notificationsList.some(n => n.status === 'critical' || n.status === 'warning') && (
                    <div className="p-3 border-t border-border bg-gray-50 dark:bg-slate-900">
                      <p className="text-xs text-center text-muted-foreground">
                        ⚡ Real-time monitoring active
                      </p>
                    </div>
                  )}
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
            <TabsTrigger value="analysis">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analysis Dashboard
            </TabsTrigger>
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
            <div className="grid grid-cols-1 gap-6">
              {/* Detailed Weather Info */}
              <div>
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

              {/* Interactive Weather Map - Full Width */}
              <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Interactive Location Weather Map</CardTitle>
                  <CardDescription>Search and select any location to view weather conditions</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-hidden flex flex-col min-h-[600px]">
                  <WeatherMap latitude={currentLat} longitude={currentLon} onLocationChange={handleLocationChange} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Dashboard Tab */}
          <TabsContent value="analysis" className="space-y-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Analysis Dashboard</h2>
                <p className="text-muted-foreground">Monitor your IoT sensor data in real-time from Firestore</p>
              </div>
              <Button
                variant={notificationsEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleNotifications}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
                {notificationsEnabled ? "Notifications On" : "Notifications Off"}
              </Button>
            </div>

            {/* Real-Time Monitoring Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className={analysisData ? getParameterStatusInfo('temp', analysisData.temp).statusBg : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex justify-between items-center">
                    <span>🌡️ Temperature</span>
                    {analysisData && (
                      <Badge variant={getParameterStatusInfo('temp', analysisData.temp).status === 'normal' ? 'default' : getParameterStatusInfo('temp', analysisData.temp).status === 'warning' ? 'secondary' : 'destructive'}>
                        {getParameterStatusInfo('temp', analysisData.temp).statusEmoji}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-red-200 dark:bg-red-800 rounded w-20"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {analysisData?.temp.toFixed(2) || "N/A"}°C
                      </div>
                      <p className="text-xs mt-1">
                        {analysisData && getParameterStatusInfo('temp', analysisData.temp).statusText}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className={analysisData ? getParameterStatusInfo('rain', analysisData.rain).statusBg : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex justify-between items-center">
                    <span>🌧️ Rainfall</span>
                    {analysisData && (
                      <Badge variant={getParameterStatusInfo('rain', analysisData.rain).status === 'normal' ? 'default' : getParameterStatusInfo('rain', analysisData.rain).status === 'warning' ? 'secondary' : 'destructive'}>
                        {getParameterStatusInfo('rain', analysisData.rain).statusEmoji}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-blue-200 dark:bg-blue-800 rounded w-20"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {analysisData?.rain.toFixed(2) || "N/A"} mm
                      </div>
                      <p className="text-xs mt-1">
                        {analysisData && getParameterStatusInfo('rain', analysisData.rain).statusText}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className={analysisData ? getParameterStatusInfo('soil', analysisData.soil).statusBg : "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex justify-between items-center">
                    <span>🌱 Soil Moisture</span>
                    {analysisData && (
                      <Badge variant={getParameterStatusInfo('soil', analysisData.soil).status === 'normal' ? 'default' : getParameterStatusInfo('soil', analysisData.soil).status === 'warning' ? 'secondary' : 'destructive'}>
                        {getParameterStatusInfo('soil', analysisData.soil).statusEmoji}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-green-200 dark:bg-green-800 rounded w-20"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {analysisData?.soil.toFixed(2) || "N/A"}%
                      </div>
                      <p className="text-xs mt-1">
                        {analysisData && getParameterStatusInfo('soil', analysisData.soil).statusText}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className={analysisData ? getParameterStatusInfo('plant_health', analysisData.plant_health).statusBg : "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex justify-between items-center">
                    <span>🌿 Plant Health</span>
                    {analysisData && (
                      <Badge variant={getParameterStatusInfo('plant_health', analysisData.plant_health).status === 'normal' ? 'default' : getParameterStatusInfo('plant_health', analysisData.plant_health).status === 'warning' ? 'secondary' : 'destructive'}>
                        {getParameterStatusInfo('plant_health', analysisData.plant_health).statusEmoji}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-yellow-200 dark:bg-yellow-800 rounded w-20"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {analysisData?.plant_health.toFixed(2) || "N/A"}%
                      </div>
                      <p className="text-xs mt-1">
                        {analysisData && getParameterStatusInfo('plant_health', analysisData.plant_health).statusText}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <FirebaseGraph />
            
            {/* Daily Data Analysis Section */}
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h2 className="text-3xl font-bold">📊 Daily Data Analysis</h2>
              </div>
              
              {dailyReport ? (
                <>
                  {/* Overall Health Score Card */}
                  <Card className={`border-2 ${
                    dailyReport.overallStatus === 'Healthy' 
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : dailyReport.overallStatus === 'Moderate'
                      ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  }`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Daily Plant Health Report</span>
                        <Badge variant="outline" className="text-sm">
                          <Calendar className="w-3 h-3 mr-1" />
                          {dailyReport.date}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="text-7xl font-bold ${
                            dailyReport.overallStatus === 'Healthy'
                              ? 'text-green-600 dark:text-green-400'
                              : dailyReport.overallStatus === 'Moderate'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }">
                            {dailyReport.overallHealthScore}
                          </div>
                          <div className="text-2xl font-light text-gray-400">/100</div>
                          <div className="mt-4 text-2xl font-bold flex items-center gap-2 ${
                            dailyReport.overallStatus === 'Healthy'
                              ? 'text-green-600 dark:text-green-400'
                              : dailyReport.overallStatus === 'Moderate'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }">
                            {dailyReport.overallStatus === 'Healthy' && <CheckCircle className="w-6 h-6" />}
                            {dailyReport.overallStatus === 'Moderate' && <AlertTriangle className="w-6 h-6" />}
                            {dailyReport.overallStatus === 'Poor' && <AlertTriangle className="w-6 h-6" />}
                            {dailyReport.overallStatus}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg mb-3">24-Hour Summary</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span>🌱 Avg Soil Moisture:</span>
                              <span className="font-bold">{dailyReport.statistics.avgSoilMoisture.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span>🌡️ Avg Temperature:</span>
                              <span className="font-bold">{dailyReport.statistics.avgTemperature.toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span>🌧️ Total Rainfall:</span>
                              <span className="font-bold">{dailyReport.statistics.totalRainfall.toFixed(2)} mm</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span>🌿 Avg Plant Health:</span>
                              <span className="font-bold">{dailyReport.statistics.avgPlantHealth.toFixed(1)}%</span>
                            </div>
                            {dailyReport.statistics.avgHumidity > 0 && (
                              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                <span>💧 Avg Humidity:</span>
                                <span className="font-bold">{dailyReport.statistics.avgHumidity.toFixed(1)}%</span>
                              </div>
                            )}
                            {dailyReport.statistics.avgLightIntensity > 0 && (
                              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                <span>☀️ Avg Light Intensity:</span>
                                <span className="font-bold">{dailyReport.statistics.avgLightIntensity.toFixed(1)}</span>
                              </div>
                            )}
                            <div className="flex justify-between p-2 bg-blue-100 dark:bg-blue-900 rounded">
                              <span>📊 Total Readings:</span>
                              <span className="font-bold">{dailyReport.statistics.readingsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Parameter-wise Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Parameter-wise Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {dailyReport.parameterWiseStatus.map((param, idx) => {
                          const statusColor = param.status === 'normal' 
                            ? 'text-green-600 dark:text-green-400' 
                            : param.status === 'warning'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                          
                          const statusBg = param.status === 'normal' 
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                            : param.status === 'warning'
                            ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'

                          const statusIcon = param.status === 'normal' ? '✅' : param.status === 'warning' ? '⚠️' : '🚨'

                          return (
                            <div key={idx} className={`p-4 rounded-lg border ${statusBg}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-semibold">
                                    {statusIcon} {param.displayName}
                                  </div>
                                  <div className="text-xs capitalize mt-1">
                                    Status: <span className={statusColor}>{param.status}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${statusColor}`}>
                                    {param.avgValue.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {param.parameter === 'rain' ? 'mm' : param.parameter === 'temp' ? '°C' : '%'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Critical Events */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Critical Events Timeline</span>
                        <Badge variant={dailyReport.criticalEvents.length > 0 ? 'destructive' : 'default'}>
                          {dailyReport.criticalEvents.length} events
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dailyReport.criticalEvents.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {dailyReport.criticalEvents.slice(0, 10).map((event, idx) => {
                            const isCritical = event.status === 'critical'
                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${
                                isCritical 
                                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                                  : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                              }`}>
                                <div className="flex justify-between items-start text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {isCritical ? '🚨' : '⚠️'} {event.message}
                                    </span>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {event.timestamp.toLocaleTimeString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                          <p className="font-semibold">All Clear!</p>
                          <p className="text-sm">No critical events in the last 24 hours.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations for Next Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dailyReport.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1 text-sm">
                              <p>{rec}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Auto Report Generation Info */}
                  <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">🤖</div>
                        <div>
                          <h3 className="font-semibold">Auto Report Generation</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            This report is automatically generated every 30 minutes based on the last 24 hours of sensor data.
                            Reports are saved to the database for historical tracking.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
                      <p className="text-gray-600 dark:text-gray-400">Loading daily analysis report...</p>
                      <p className="text-sm text-gray-500 mt-2">Collecting 24-hour sensor data</p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
