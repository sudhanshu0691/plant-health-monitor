"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { db, collection, query, orderBy, limit, onSnapshot } from "@/lib/firebase"

interface DataPoint {
  time: string
  value: number
}

export default function RainfallChart() {
  const [data, setData] = useState<DataPoint[]>([])

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
            value: docData.rain || 0
          }
        }).reverse()
        
        setData(newData)
      }, (err) => {
        console.error("Error fetching rainfall:", err)
      })

      return () => unsubscribe()
    } catch (err) {
      console.error("Setup error:", err)
    }
  }, [])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.length ? data : [{ time: "0:00", value: 0 }]}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
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
