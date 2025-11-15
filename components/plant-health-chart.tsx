"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { db, collection, query, orderBy, limit, onSnapshot } from "@/lib/firebase"

interface DataPoint {
  time: string
  value: number
  status: string
}

export default function PlantHealthChart() {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    try {
      const sensorRef = collection(db, "sensor_data")
      const q = query(sensorRef, orderBy("timestamp", "desc"), limit(24))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newData: DataPoint[] = snapshot.docs.map(doc => {
          const docData = doc.data()
          const timestamp = docData.timestamp?.seconds || docData.timestamp || Date.now() / 1000
          const healthValue = docData.plant_health || 0
          
          let status = "Great"
          if (healthValue < 30) status = "Needs Water"
          else if (healthValue < 70) status = "Optimal"
          
          return {
            time: new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            value: healthValue,
            status
          }
        }).reverse()
        
        setData(newData)
      }, (err) => {
        console.error("Error fetching plant health:", err)
      })

      return () => unsubscribe()
    } catch (err) {
      console.error("Setup error:", err)
    }
  }, [])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.length ? data : [{ time: "0:00", value: 85, status: "Great" }]}>
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
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-card border border-border rounded p-2 text-sm">
                  <p className="font-semibold">{payload[0].payload.value.toFixed(1)}%</p>
                  <p className="text-muted-foreground text-xs">{payload[0].payload.status}</p>
                </div>
              )
            }
            return null
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="oklch(0.5 0.15 140)"
          strokeWidth={2}
          dot={{ fill: "oklch(0.5 0.15 140)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
