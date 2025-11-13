"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DataPoint {
  time: string
  value: number
}

export default function RainfallChart() {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hour = new Date().getHours()
        setData((prev) => {
          const newData = [...prev]
          newData.push({
            time: `${hour}:00`,
            value: Math.random() * 5,
          })
          if (newData.length > 24) newData.shift()
          return newData
        })
      } catch (err) {
        console.error("Error fetching rainfall:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.length ? data : [{ time: "0:00", value: 0 }]}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="value" fill="oklch(0.6 0.14 200)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
