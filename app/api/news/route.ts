import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.NEWS_API_KEY || "your_api_key_here"
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=agriculture+OR+farming+OR+crops&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch news")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching news:", error)
    return NextResponse.json(
      { error: "Failed to fetch news", articles: [] },
      { status: 500 }
    )
  }
}
