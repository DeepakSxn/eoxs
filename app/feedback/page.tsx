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
    <div className="space-y-6 max-w-2xl mx-auto py-12 px-4">
      <div>
        <h1 className="text-3xl font-bold">User Feedback</h1>
        <p className="text-muted-foreground mt-2">
          Share your thoughts about our demo video selection or your experience.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <Card className="w-full max-w-xl">
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
            <Button variant="outline" className="w-full btn-enhanced" onClick={() => router.push("/")}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

