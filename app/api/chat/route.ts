import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

// Function to fetch latest sensor data from Firebase
async function getLatestSensorData() {
  try {
    const sensorRef = collection(db, 'sensor_data')
    const q = query(sensorRef, orderBy('timestamp', 'desc'), limit(10))
    const snapshot = await getDocs(q)
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data()
      return {
        temp: docData.temp || 0,
        rain: docData.rain || 0,
        soil: docData.soil || 0,
        plant_health: docData.plant_health || 0,
        timestamp: docData.timestamp,
      }
    })
    
    return data
  } catch (error) {
    console.error('Error fetching sensor data:', error)
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    // Fetch latest sensor data from Firebase
    const sensorData = await getLatestSensorData()
    
    // Format sensor data for AI context
    let sensorContext = ''
    if (sensorData.length > 0) {
      const latest = sensorData[0]
      sensorContext = `\n\nCurrent Sensor Data from Firebase:
- Temperature: ${latest.temp.toFixed(2)}°C
- Rainfall: ${latest.rain.toFixed(2)}mm
- Soil Moisture: ${latest.soil.toFixed(2)}%
- Plant Health: ${latest.plant_health.toFixed(2)}%

Recent readings (last 10): ${sensorData.length} data points available.

Use this real-time data to provide specific, data-driven advice.`
    }

    const systemPrompt = `You are an expert agricultural advisor with deep knowledge of plant care, soil management, pest control, weather analysis, and farming best practices. You have access to real-time sensor data from the farm's IoT system. Provide helpful, practical advice to farmers about their crops and farming operations based on the actual sensor readings. Keep responses concise but informative.${sensorContext}`

    // Prefer calling Groq directly using server-side API key (keeps keys secret)
    const groqApiKey = process.env.GROQ_API_KEY
    const groqEndpoint = process.env.GROQ_API_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions'

    if (!groqApiKey) {
      console.warn('GROQ_API_KEY not configured; cannot call Groq.')
      const fallback =
        'AI service not configured. Set GROQ_API_KEY in your environment or configure an AI provider.'
      return NextResponse.json({ reply: fallback, details: 'GROQ_API_KEY missing' }, { status: 502 })
    }

    try {
      const body = {
        model: process.env.GROQ_MODEL || 'moonshotai/kimi-k2-instruct-0905',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }

      const res = await fetch(groqEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Groq API error:', res.status, errorText)
        return NextResponse.json(
          { reply: 'AI service returned an error. Please check your API key and try again.', error: errorText },
          { status: res.status },
        )
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'No response from AI.'
      return NextResponse.json({ reply })
    } catch (err: any) {
      console.error('Error calling Groq API:', err)
      const fallback = 'Sorry, I could not reach the AI provider. Try again later.'
      return NextResponse.json({ reply: fallback, error: String(err?.message || err) }, { status: 502 })
    }
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}
