"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"

import { Upload, X, Video, Clock, TagIcon, FileText, CheckCircle2, AlertCircle, Home, LogOut } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { signOut } from "firebase/auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo } from "@/app/components/logo"
import { ThemeToggle } from "@/app/theme-toggle"
import { auth, db } from "@/firebase"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"

export default function UploadPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [duration, setDuration] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [user, setUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
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
    
  ])

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        // Redirect to login if not authenticated
        router.push("/admin-login")
      }
    })

    return () => unsubscribe()
  }, [router])
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
          if (category) uniqueCategories.add(category)
        })

        // Add default categories if none exist yet
        if (uniqueCategories.size === 0) {
          setCategories(["none added"])
        } else {
          // Make sure "Other" is always an option
          uniqueCategories.add("Other")
          setCategories(Array.from(uniqueCategories))
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

    fetchCategories()
  }, [])
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if file is a video
      if (!selectedFile.type.startsWith("video/")) {
        setStatusMessage("Please select a video file")
        setUploadStatus("error")
        return
      }

      setFile(selectedFile)

      // Create preview URL
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)

      // Reset upload state
      setUploadProgress(0)
      setUploadStatus("idle")
      setStatusMessage("")
    }
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const simulateProgress = () => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 10
      if (progress > 95) {
        clearInterval(interval)
        progress = 95 // Hold at 95% until actual upload completes
      }
      setUploadProgress(Math.min(progress, 95))
    }, 500)

    return interval
  }

  const handleUpload = async () => {
    if (!file || !title) {
      setStatusMessage("Please provide a title and select a video file")
      setUploadStatus("error")
      return
    }

    setUploading(true)
    setUploadStatus("uploading")
    setStatusMessage("Uploading video to cloud storage...")

    // Simulate progress updates
    const progressInterval = simulateProgress()

    try {
      // Upload video to Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", "eoxsDemoTool")

      const response = await fetch(`https://api.cloudinary.com/v1_1/dh3bnbq9t/video/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!data.secure_url) {
        throw new Error("Failed to upload video to Cloudinary.")
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Save video details to Firebase Firestore
      await addDoc(collection(db, "videos"), {
        title,
        description,
        category: showNewCategoryInput ? newCategory : category,
        duration: duration || "Unknown",
        tags,
        videoUrl: data.secure_url,
        publicId: data.public_id,
        thumbnailUrl: `https://res.cloudinary.com/dh3bnbq9t/video/upload/${data.public_id}.jpg`,
        createdAt: serverTimestamp(),
      })

      setUploadStatus("success")
      setStatusMessage("Video uploaded successfully!")

      // Reset form after 2 seconds
      setTimeout(() => {
        setTitle("")
        setDescription("")
        setCategory("")
        setDuration("")
        setTags([])
        setFile(null)
        setPreviewUrl(null)
        setUploadProgress(0)
        setUploadStatus("idle")
        setStatusMessage("")
      }, 2000)
    } catch (error) {
      console.error("Error uploading video:", error)
      clearInterval(progressInterval)
      setUploadStatus("error")
      setStatusMessage("Failed to upload video. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/admin-login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-enhanced">
   

      <main className="flex-1 container py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="bg-white dark:bg-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  <Upload className="h-6 w-6 mr-2 text-primary" />
                  Upload New Video
                </CardTitle>
                <CardDescription>Add a new demo video to the platform for users to access</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Video Upload */}
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {previewUrl ? (
                        <div className="relative aspect-video">
                          <video src={previewUrl} className="w-full h-full rounded-md object-cover" controls />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFile(null)
                              setPreviewUrl(null)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="py-8">
                          <Video className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Click to select a video file or drag and drop
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Supports MP4, WebM, MOV (max 500MB)
                          </p>
                        </div>
                      )}
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>

                    {/* Duration Input */}
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Duration
                      </Label>
                      <Input
                        id="duration"
                        placeholder="e.g., 5:30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>

                    {/* Category Select */}
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      {!showNewCategoryInput ? (
                        <>
                          <Select
                            value={category}
                            onValueChange={(value) => {
                              setCategory(value)
                              if (value === "Other") {
                                setShowNewCategoryInput(true)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                              {/* <SelectItem value="Other">Other (Create new)</SelectItem> */}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new category"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowNewCategoryInput(false)
                                setCategory("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tags Input */}
                    <div className="space-y-2">
                      <Label htmlFor="tags" className="flex items-center">
                        <TagIcon className="h-4 w-4 mr-1" />
                        Tags
                      </Label>
                      <div className="flex">
                        <Input
                          id="tags"
                          placeholder="Add a tag and press Enter"
                          value={currentTag}
                          onChange={(e) => setCurrentTag(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" onClick={handleAddTag} className="ml-2">
                          Add
                        </Button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 ml-1"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Video Details */}
                  <div className="space-y-4">
                    {/* Title Input */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="flex items-center">
                        <Video className="h-4 w-4 mr-1" />
                        Video Title
                      </Label>
                      <Input
                        id="title"
                        placeholder="Enter video title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    {/* Description Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Enter video description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={8}
                      />
                    </div>

                    {/* Upload Status */}
                    {uploadStatus !== "idle" && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {uploadStatus === "uploading"
                              ? "Uploading..."
                              : uploadStatus === "success"
                                ? "Upload Complete"
                                : "Upload Failed"}
                          </span>
                          <span className="text-sm">{uploadProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                        <p
                          className={`text-sm ${
                            uploadStatus === "error"
                              ? "text-destructive"
                              : uploadStatus === "success"
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {uploadStatus === "error" ? (
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                          ) : uploadStatus === "success" ? (
                            <CheckCircle2 className="h-4 w-4 inline mr-1" />
                          ) : null}
                          {statusMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end space-x-4 border-t pt-6">
                <Button variant="outline" onClick={() => router.push("/admin-dashboard")} disabled={uploading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || !title || uploading}
                  className="bg-primary hover:bg-primary/90 btn-enhanced btn-primary-enhanced"
                >
                  {uploading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Uploading...
                    </>
                  ) : (
                    "Upload Video"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
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

