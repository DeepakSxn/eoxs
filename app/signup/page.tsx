"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { db, auth } from "../../firebase"
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")

  const countryCodes = [
    { code: "+1", label: "🇺🇸 +1" },
    { code: "+44", label: "🇬🇧 +44" },
    { code: "+91", label: "🇮🇳 +91" },
    { code: "+61", label: "🇦🇺 +61" },
    { code: "+81", label: "🇯🇵 +81" },
    { code: "+49", label: "🇩🇪 +49" },
    { code: "+33", label: "🇫🇷 +33" },
    { code: "+971", label: "🇦🇪 +971" },
    { code: "+86", label: "🇨🇳 +86" },
    { code: "+7", label: "🇷🇺 +7" },
    // Add more as needed
  ]

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
          if (category && category !== "General" && category !== "Other" && category !== "Miscellaneous") {
            uniqueCategories.add(category)
          }
        })

        
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

    if (!companyName) {
      errors.push("Company Name is required")
    }
    
    if (!phoneNumber) {
      errors.push("Phone number is required")
    } else if (!/^\\d{6,15}$/.test(phoneNumber)) {
      errors.push("Phone number must be digits only (6-15 digits)")
    }
    
    if (!termsAccepted) {
      errors.push("You must accept the terms and conditions")
    }


    if (!phoneCountryCode) {
      errors.push("Country code is required")
    } else if (!/^\+\d{1,4}$/.test(phoneCountryCode)) {
      errors.push("Country code must start with + and be 1-4 digits")
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
        companyName: companyName,
        phoneCountryCode: phoneCountryCode,
        phoneNumber: phoneNumber,
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
    <div className="flex flex-col min-h-screen bg-white">
      <header className=" bg-transparent ">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              
              <img src="light.webp" height={180} width={80}/>
            </Link>
          </div>
          <nav className="ml-auto flex gap-8 items-center">
            <Link href="https://eoxs.com/" className="text-base font-medium">
              Home
            </Link>
            <Link href="https://eoxs.com/about" className="text-base font-medium">
              About
            </Link>
            <Link href="https://eoxs.com/contact" className="text-base font-medium">
              Contact
            </Link>
          </nav>
        
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-5xl font-bold mb-4 flex flex-col items-center justify-center">
        <img src="Component 1m.png" alt="Demox" height={360} width={200}/>
</h1>

          <p className="text-xl">Sign up to get started</p>
        </div>

        <div className="w-full max-w-md">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Input
                id="name"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base rounded-md"
              />
            </div>

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
                id="companyName"
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base rounded-md"
              />
            </div>

            <div className="flex gap-2">
              <Input
                id="phoneCountryCode"
                type="text"
                placeholder="+1"
                value={phoneCountryCode}
                onChange={e => setPhoneCountryCode(e.target.value.replace(/[^+\d]/g, ""))}
                required
                disabled={loading}
                className="h-12 text-base rounded-md w-24"
                maxLength={5}
              />
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                required
                disabled={loading}
                className="h-12 text-base rounded-md flex-1"
                maxLength={15}
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

            <div>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 text-base rounded-md"
              />
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={() => setTermsAccepted(!termsAccepted)} />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I accept the Terms and Conditions
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-green-600 hover:bg-green-500 rounded-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-green-600 hover:underline">
                  Sign in
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
