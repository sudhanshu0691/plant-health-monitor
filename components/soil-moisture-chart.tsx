"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertCircle } from "lucide-react"
import { db, collection, query, orderBy, limit, onSnapshot } from "@/lib/firebase"

interface DataPoint {
  time: string
  value: number
}

export default function SoilMoistureChart() {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      const sensorRef = collection(db, "sensor_data")
      const q = query(sensorRef, orderBy("timestamp", "desc"), limit(24))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newData: DataPoint[] = snapshot.docs.map(doc => {
          const docData = doc.data()
          const timestamp = docData.timestamp?.seconds || docData.timestamp || Date.now() / 1000
          return {
            time: new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            value: docData.soil || 0
          }
        }).reverse()
        
        setData(newData)
        setError(false)
        setLoading(false)
      }, (err) => {
        console.error("Error fetching soil moisture:", err)
        setError(true)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      console.error("Setup error:", err)
      setError(true)
      setLoading(false)
    }
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
        <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          cursor={{ stroke: "var(--ring)" }}
          formatter={(value: number) => [`${value}%`, 'Moisture']}
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
