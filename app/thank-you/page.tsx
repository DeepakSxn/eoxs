"use client"

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

export default function ThankYou() {
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
        const playlistsQuery = query(collection(db, "playlists"), where("userId", "==", currentUser.uid))
        const playlistsSnapshot = await getDocs(playlistsQuery)
        setHasPlaylists(!playlistsSnapshot.empty)

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
                  Your video playlist has been created successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                    What's Next?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    You can now access your personalized playlist of demo videos. Watch them in sequence to learn more
                    about our software solutions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 btn-enhanced btn-primary-enhanced"
                      onClick={() => router.push("/playlists")}
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Watch Your Playlist
                    </Button>
                    <Button variant="outline" className="flex-1 btn-enhanced" onClick={() => router.push("/feedback")}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Provide Feedback
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center text-center sm:text-left">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full">
                    <Home className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">Return to Home</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      You can always come back to your playlist later.
                    </p>
                    <Button variant="ghost" className="underline text-primary" onClick={() => router.push("/")}>
                      Go to Homepage
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

