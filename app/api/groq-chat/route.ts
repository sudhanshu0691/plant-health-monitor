import { NextRequest } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured on server' }), { status: 500 })
    }

    const groqEndpoint = process.env.GROQ_API_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions'

    // Forward the request to Groq (server-side)
    const res = await fetch(groqEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.text()
    return new Response(data, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('Proxy /api/groq-chat error:', err)
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
  }
}
