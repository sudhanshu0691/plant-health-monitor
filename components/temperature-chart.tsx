"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DataPoint {
  time: string
  value: number
}

export default function TemperatureChart() {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hour = new Date().getHours()
        setData((prev) => {
          const newData = [...prev]
          newData.push({
            time: `${hour}:00`,
            value: 15 + Math.random() * 15,
          })
          if (newData.length > 24) newData.shift()
          return newData
        })
      } catch (err) {
        console.error("Error fetching temperature:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.length ? data : [{ time: "0:00", value: 20 }]}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" domain={[0, 50]} />
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
          stroke="oklch(0.58 0.24 27)"
          strokeWidth={2}
          dot={{ fill: "oklch(0.58 0.24 27)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
