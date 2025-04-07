import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "./theme-provider"

export const metadata: Metadata = {
  title: "EOXS Video Management Tool",
  description: "Access customized software demo videos, track engagement, and get valuable insights.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'