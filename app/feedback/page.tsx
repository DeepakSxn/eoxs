"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { auth, db } from "../firebase"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { ThemeToggle } from "../theme-toggle"
import { Logo } from "../components/logo"

export default function Feedback() {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!feedback.trim()) return

    setSubmitting(true)
    try {
      // Save feedback to Firestore
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid,
        userEmail: user?.email,
        feedback,
        createdAt: serverTimestamp(),
      })

      setSubmitting(false)
      setFeedback("")
      // Redirect to home page instead of dashboard
      router.push("/")
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-enhanced">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="mr-4">
            <Logo width={120} height={40} />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-[#4CAF50]" />
            </div>
            <CardTitle className="text-2xl font-bold">Thank You!</CardTitle>
            <CardDescription>
              Your video playlist has been created successfully. We appreciate your feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Share your thoughts about our demo video selection..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 btn-enhanced btn-primary-enhanced"
                disabled={submitting || !feedback.trim()}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full btn-enhanced" onClick={() => router.push("/")}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </main>

      <footer className="border-t bg-gray-50 dark:bg-gray-900">
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

