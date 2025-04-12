"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/firebase"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!email || !password) {
      setError("Please enter both email and password")
      setLoading(false)
      return
    }

    try {
      setError("")
      await signInWithEmailAndPassword(auth, email, password)
      // Store in localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email)
      } else {
        localStorage.removeItem("rememberedEmail")
      }
      router.push("/dashboard")
    } catch (err: any) {
      setError("Failed to log in. Please check your credentials.")
      console.error(err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail")
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className=" bg-transparent">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              
              <img src="light.webp" height={180} width={80}/>

              
            </Link>
          </div>
          <nav className="ml-auto flex gap-8 items-center">
          <Link href="/admin-login">
              <Button variant="outline" size="sm" className="gap-2 ">
                <User size={16} />
                <span>Admin</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-5xl font-bold mb-4 flex flex-col items-center justify-center">
          <img src="Component 1m.png" alt="Demox" height={360} width={200}/>
          </h1>
          <p className="text-xl">Sign in to your account</p>
        </div>

        <div className="w-full max-w-md">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
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

            <div>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base rounded-md"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me
                </label>
              </div>

              <Link href="/forgot-password" className="text-sm text-green-600 hover:underline">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-green-600 hover:bg-green-500 rounded-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-green-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm text-gray-700 hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/certified" className="text-sm text-gray-700 hover:text-gray-900">
              Certified Engineer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
