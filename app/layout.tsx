import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { NotificationProvider } from "@/contexts/NotificationContext"
import "./globals.css"

// Removed `next/font/google` usage because Turbopack/Next internal
// font path caused a module resolution error for some setups.
// Fonts are handled via `app/globals.css` (or a direct CSS import)
// and Tailwind's `font-sans` utility.

export const metadata: Metadata = {
  title: "PlantHealth - Agricultural Monitoring",
  description: "Real-time soil moisture, temperature, rainfall, and plant health monitoring for farmers",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`font-sans antialiased bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300`}>
        <NotificationProvider>
          {children}
          <Toaster position="top-right" richColors expand={true} />
        </NotificationProvider>
        <Analytics />
      </body>
    </html>
  )
}
