"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "../theme-toggle"
import { db, auth } from "../firebase"
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore"
import { Eye, EyeOff, Loader2, User, UserPlus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Logo } from "../components/logo"


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

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [profession, setProfession] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [secondaryProfession, setSecondaryProfession] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [categories, setCategories] = useState<string[]>([
    "General",
    "Sales",
    "Accounting",
    "Inventory",
    "Manufacturing",
    "CRM",
    "HR",
    "Procurement",
    "Analytics",
    "Other",
  ])
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch all videos to extract unique categories
        const videosCollection = collection(db, "videos")
        const videoSnapshot = await getDocs(videosCollection)
  
        // Extract unique categories
        const uniqueCategories = new Set<string>()
        videoSnapshot.docs.forEach((doc) => {
          const category = doc.data().category
          if (category && category !== "General" && category !== "Other" && category!=="Miscellaneous") {
            uniqueCategories.add(category)
          }
        })
  
        // Add default message if no valid categories exist
        if (uniqueCategories.size === 0) {
          setCategories(["none added"])
        } else {
          // Convert Set to Array and set state
          setCategories(Array.from(uniqueCategories))
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
  
    fetchCategories()
  }, [])
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Reset error
    setError("")

    // Collect all validation errors
    const errors = []

    if (!name) {
      errors.push("Name is required")
    }

    if (!email) {
      errors.push("Email is required")
    }

    if (!password) {
      errors.push("Password is required")
    } else if (password.length < 6) {
      errors.push("Password must be at least 6 characters")
    }

    if (!confirmPassword) {
      errors.push("Please confirm your password")
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match")
    }

    if (!profession) {
      errors.push("Profession is required")
    }

    if (!companyName) {
      errors.push("Company Name is required")
    }

    if (!termsAccepted) {
      errors.push("You must accept the terms and conditions")
    }

    if (errors.length > 0) {
      setError(errors.join(". "))
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Add user to users collection
      await addDoc(collection(db, "users"), {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        name: name,
        profession: profession,
        companyName: companyName,
        secondaryProfession: secondaryProfession,
        createdAt: serverTimestamp(),
        role: "user",
      })

      // Redirect to dashboard
      router.push("/login")
    } catch (err: any) {
      console.error("Error signing up:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already in use")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak")
      } else {
        setError("Failed to create an account. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center">
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

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-4 pb-0">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <CardTitle className="text-3xl font-bold mb-2">Create Account</CardTitle>
                <CardDescription className="text-muted-foreground">Enter your details to get started</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-10"
                    />
                  </div>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-10"
                    />
                  </div>

                  {/* Company Name Input */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Enter your company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-10"
                    />
                  </div>

                  {/* Profession Select */}
                  <div className="space-y-2">
                    <Label htmlFor="profession">Primary Department</Label>
                    <Select value={profession} onValueChange={setProfession} required>
                      <SelectTrigger id="profession" className="h-10">
                        <SelectValue placeholder="Select your primary department" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secondary Profession Select */}
                  <div className="space-y-2">
                    <Label htmlFor="secondaryProfession">Secondary Department (Optional)</Label>
                    <Select value={secondaryProfession} onValueChange={setSecondaryProfession}>
                      <SelectTrigger id="secondaryProfession" className="h-10">
                        <SelectValue placeholder="Select your secondary department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 pr-10"
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

                  {/* Confirm Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Terms Acceptance */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={() => setTermsAccepted(!termsAccepted)}
                    />
                    <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                      I accept the Terms and Conditions
                    </Label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

             
              
            </CardContent>

            {/* Footer */}
            <CardFooter className="justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

