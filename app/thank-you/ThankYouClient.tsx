'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home, PlayCircle, MessageSquare } from "lucide-react"
import { auth, db } from "../firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { ThemeToggle } from "../theme-toggle"
import { Logo } from "../components/logo"
import { motion } from "framer-motion"

export function ThankYouClient() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasPlaylists, setHasPlaylists] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Check if user has playlists
        try {
          const playlistsQuery = query(collection(db, "playlists"), where("userId", "==", currentUser.uid))
          const playlistsSnapshot = await getDocs(playlistsQuery)
          setHasPlaylists(!playlistsSnapshot.empty)
        } catch (error) {
          console.error("Error checking playlists:", error)
        }

        setLoading(false)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    // Handle browser navigation
    const handleBeforeUnload = () => {
      // This doesn't actually log the user out but sets a flag
      sessionStorage.setItem("navigationOccurred", "true")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [router])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  function handleSubmit() {
    // Using promises instead of async/await
    fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user?.email,
        subject: 'Your Video Playlist is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Video Playlist is Ready! 🎉</h2>
            <p>Your playlist has been created successfully. Click the button below to start watching:</p>
            <a href="afdjjwefefe" 
               style="display: inline-block; background-color: #0070f3; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 5px; 
                      margin: 20px 0;">
              View Your Playlist
            </a>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color: #0070f3;">awkfnewbgpwe</span>
            </p>
          </div>
        `
      }),
    })
    .then(response => response.json())
    .then(result => {
      if (!result.error) {
        router.push('/')
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    })
    .catch(error => {
      console.error('Error sending email:', error)
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <header className="border-b sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Logo width={120} height={40} />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12 px-4">
        <motion.div className="max-w-3xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            <Card className="bg-white dark:bg-gray-800 shadow-lg border-none">
              <CardHeader className="space-y-1 text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                    <CheckCircle className="h-16 w-16 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold">Thank You!</CardTitle>
                <CardDescription className="text-lg">
                 
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                    What's Next?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                  We truly appreciate you dedicating your valuable time to watch our entire collection. As a token of our gratitude, we've prepared a special gift for our loyal viewers.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button variant="outline" className="flex-1 btn-enhanced" onClick={handleSubmit}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Rewards
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <footer className="border-t bg-white dark:bg-gray-900">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Where Steel Meets Technology</p>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 md:text-left">
            © {new Date().getFullYear()} EOXS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
