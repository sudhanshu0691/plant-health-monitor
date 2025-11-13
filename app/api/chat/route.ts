import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    const systemPrompt = `You are an expert agricultural advisor with deep knowledge of plant care, soil management, pest control, weather analysis, and farming best practices. Provide helpful, practical advice to farmers about their crops and farming operations. Keep responses concise but informative.`

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
