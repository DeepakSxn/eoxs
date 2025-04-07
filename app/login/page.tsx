"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "../theme-toggle"
import { Eye, EyeOff, Loader2, User } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"

import { toast } from "@/components/ui/use-toast"
import { Logo } from "../components/logo"
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore"
import { db } from "../firebase"
import { auth } from "@/firebase"

// Add this new isPreviewEnvironment function near the top of the component
const isPreviewEnvironment = () => {
  // Check if we're in a preview environment
  // This checks for common preview domains or environments
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    return (
      hostname.includes("vercel.app") ||
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      hostname.includes("preview")
    )
  }
  return false
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/admin-login">
              <Button variant="outline" size="sm" className="gap-2">
                <User size={16} />
                <span>Admin</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <Card className="shadow-lg border-border/50">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <CardTitle className="text-3xl font-bold mb-2">Welcome Back</CardTitle>
                <CardDescription className="text-muted-foreground">Sign in to continue to your account</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailLogin} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="block mb-2">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <label htmlFor="remember" className="text-sm font-medium">
                        Remember me
                      </label>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

              </form>
            </CardContent>
            <CardFooter className="text-center">
              <p className="text-sm text-muted-foreground w-full">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

