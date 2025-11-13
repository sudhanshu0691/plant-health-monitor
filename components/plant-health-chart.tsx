"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DataPoint {
  time: string
  value: number
  status: string
}

export default function PlantHealthChart() {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hour = new Date().getHours()
        const healthValue = 75 + Math.random() * 20
        let status = "Great"
        if (healthValue < 30) status = "Needs Water"
        else if (healthValue < 70) status = "Optimal"

        setData((prev) => {
          const newData = [...prev]
          newData.push({
            time: `${hour}:00`,
            value: healthValue,
            status,
          })
          if (newData.length > 24) newData.shift()
          return newData
        })
      } catch (err) {
        console.error("Error fetching plant health:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
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
