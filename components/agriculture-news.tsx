"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Newspaper, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface NewsArticle {
  title: string
  description: string
  url: string
  urlToImage: string
  publishedAt: string
  source: {
    name: string
  }
}

export function AgricultureNews() {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchNews = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/news")
      const data = await response.json()
      
      if (data.articles) {
        setNews(data.articles.slice(0, 6))
      } else {
        setError("No news available")
      }
    } catch (err) {
      setError("Failed to load news")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  if (loading) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-green-500" />
            Agriculture News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 border-2 border-green-200 dark:border-green-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-green-500" />
            Agriculture News
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchNews}
            className="hover:rotate-180 transition-transform duration-500"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Latest updates from agriculture industry</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            <AnimatePresence mode="popLayout">
              {news.map((article, idx) => (
                <motion.div
                  key={article.url}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
                      <div className="flex gap-3">
                        {article.urlToImage && (
                          <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden">
                            <img
                              src={article.urlToImage}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{article.source.name}</span>
                            <span className="flex items-center gap-1 group-hover:text-green-600 dark:group-hover:text-green-400">
                              Read more <ExternalLink className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
