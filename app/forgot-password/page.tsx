"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    if (!email) {
      setError("Please enter your email address.")
      setLoading(false)
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess("Password reset email sent! Please check your inbox.")
      toast({
        title: "Success",
        description: "Password reset email sent!",
      })
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.")
      toast({
        title: "Error",
        description: err.message || "Failed to send password reset email.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-transparent">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img src="/light.webp" height={180} width={80} alt="Logo" />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Forgot Password</h1>
          <p className="text-base">Enter your email to receive a password reset link.</p>
        </div>
        <div className="w-full max-w-md">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-6">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base rounded-md"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base bg-green-600 hover:bg-green-500 rounded-md"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center mt-4">
              <Link href="/login" className="text-green-600 hover:underline text-sm">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 