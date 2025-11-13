"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertCircle } from "lucide-react"

interface DataPoint {
  time: string
  value: number
}

export default function SoilMoistureChart() {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use the Next API proxy to avoid CORS / mixed-content issues.
        const response = await fetch("/api/predict")
        if (response.ok) {
          const result = await response.json()
          const hour = new Date().getHours()
          setData((prev) => {
            const newData = [...prev]
            newData.push({
              time: `${hour}:00`,
              value: result.soil_moisture,
            })
            if (newData.length > 24) newData.shift()
            return newData
          })
          setError(false)
        }
      } catch (err) {
        setError(true)
        console.error("Error fetching soil moisture:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (error && data.length === 0) {
    return (
      <div className="flex items-center gap-2 text-orange-600 text-sm">
        <AlertCircle className="h-4 w-4" />
        Backend unavailable - check if Flask server is running
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.length ? data : [{ time: "0:00", value: 0 }]}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          cursor={{ stroke: "var(--ring)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="oklch(0.6 0.14 200)"
          strokeWidth={2}
          dot={{ fill: "oklch(0.6 0.14 200)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
