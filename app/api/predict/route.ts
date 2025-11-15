import type { NextRequest } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Mock sensor data for development/offline testing
const mockData = {
  soil_moisture: 65,
  temperature: 24,
  humidity: 55,
  light_level: 800,
  rainfall: 2.5,
}

let cachedBackendAvailable = false
let lastBackendCheck = 0
const BACKEND_CHECK_INTERVAL = parseInt(process.env.FLASK_BACKEND_HEALTH_CHECK_INTERVAL || '30000')
const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:5000'
const FLASK_BACKEND_TIMEOUT = parseInt(process.env.FLASK_BACKEND_TIMEOUT || '2000')

export async function GET(_req: NextRequest) {
  const now = Date.now()
  
  // Try real backend only if enough time has passed since last check
  if (now - lastBackendCheck > BACKEND_CHECK_INTERVAL || cachedBackendAvailable) {
    lastBackendCheck = now
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FLASK_BACKEND_TIMEOUT)
      
      const res = await fetch(`${FLASK_BACKEND_URL}/predict`, {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        cachedBackendAvailable = true
        const data = await res.json()
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch {
      cachedBackendAvailable = false
    }
  }
  
  // Return mock data (no logging to reduce spam)
  return new Response(JSON.stringify(mockData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
