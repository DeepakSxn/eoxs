"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db, auth } from "../firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, LogOut, Clock, Play, CheckCircle } from "lucide-react"
import { Logo } from "../components/logo"
import { ThemeToggle } from "../theme-toggle"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl?: string
  duration: string
  category: string
  tags?: string[]
  createdAt: any
  watched?: boolean
}

interface Module {
  name: string
  category: string
  totalDuration: string
  videos: Video[]
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [modules, setModules] = useState<Module[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [expandedModules, setExpandedModules] = useState<string[]>([])


  const router = useRouter()

  useEffect(() => {
    // Check for navigation flag
    const navigationOccurred = sessionStorage.getItem("navigationOccurred")
    if (navigationOccurred === "true") {
      // Clear the flag
      sessionStorage.removeItem("navigationOccurred")
      // Log out the user
      signOut(auth).then(() => {
        router.push("/login")
      })
      return
    }

    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchVideos(currentUser.uid)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    // Handle browser navigation
    const handleBeforeUnload = () => {
      sessionStorage.setItem("navigationOccurred", "true")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [router])

  useEffect(() => {
    // Filter videos based on search query
    if (!searchQuery) {
      setFilteredVideos(videos)
      return
    }

    const lowerCaseQuery = searchQuery.toLowerCase()
    const filtered = videos.filter(
      (video) =>
        video.title.toLowerCase().includes(lowerCaseQuery) ||
        (video.tags && video.tags.some((tag) => tag.toLowerCase().includes(lowerCaseQuery))) ||
        (video.description && video.description.toLowerCase().includes(lowerCaseQuery)),
    )

    setFilteredVideos(filtered)
  }, [searchQuery, videos])

  useEffect(() => {
    if (filteredVideos.length > 0) {
      organizeVideosIntoModules()
    }
  }, [filteredVideos])

  const fetchVideos = async (userId: string) => {
    try {
      setLoading(true)

      // Fetch videos from Firestore
      const videosCollection = collection(db, "videos")
      const videoSnapshot = await getDocs(videosCollection)
      const videoList = videoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        thumbnail: doc.data().publicId
          ? `https://res.cloudinary.com/dvuf7bf0x/video/upload/${doc.data().publicId}.jpg`
          : "/placeholder.svg", // Fallback thumbnail
        description: doc.data().description || "No description available",
        category: doc.data().category || "Uncategorized",
      })) as unknown as Video[]

      // Fetch watch history to mark watched videos
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      // Mark watched videos
      const videosWithWatchStatus = videoList.map((video) => ({
        ...video,
        watched: watchedVideoIds.has(video.id),
      }))

      setVideos(videosWithWatchStatus)
      setFilteredVideos(videosWithWatchStatus)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching videos:", error)
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      })
    }
  }

  const organizeVideosIntoModules = () => {
    // Group videos by category
    const videosByCategory = filteredVideos.reduce(
      (acc, video) => {
        // Skip General and Miscellaneous categories as they're common for everyone
        if (video.category === "General" || video.category === "Miscellaneous") {
          return acc
        }

        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      },
      {} as Record<string, Video[]>,
    )

    const moduleArray: Module[] = []

    // Calculate total duration for each module
    const calculateTotalDuration = (videos: Video[]): string => {
      let totalMinutes = 0

      videos.forEach((video) => {
        // Extract minutes from duration string (e.g., "5 minutes" -> 5)
        const durationMatch = video.duration.match(/(\d+)/)
        if (durationMatch && durationMatch[1]) {
          totalMinutes += Number.parseInt(durationMatch[1], 10)
        }
      })

      return `${totalMinutes} mins`
    }

    // Add other categories as modules (except General and Miscellaneous)
    Object.entries(videosByCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, videos]) => {
        moduleArray.push({
          name: `${category} Module Overview`,
          category,
          totalDuration: calculateTotalDuration(videos),
          videos,
        })
      })

    // Set all modules as expanded by default
    setExpandedModules(moduleArray.map((module) => module.category))

    setModules(moduleArray)
  }

  const handleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId)
      } else {
        return [...prev, videoId]
      }
    })
  }

  const handleWatchSelected = () => {
    if (selectedVideos.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video to watch.",
        variant: "destructive",
      })
      return
    }

    // Create a playlist with selected videos
    const selectedVideoObjects = videos.filter((video) => selectedVideos.includes(video.id))

    // Store the playlist in localStorage
    const customPlaylist = {
      id: "custom-playlist",
      videos: selectedVideoObjects,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    }

    localStorage.setItem("currentPlaylist", JSON.stringify(customPlaylist))

    // Navigate to the first video in the playlist
    if (selectedVideoObjects.length > 0) {
      router.push(`/video-player?videoId=${selectedVideoObjects[0].id}&playlistId=custom-playlist`)
    }
  }

  const handleLogout = () => {
    auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <div className="mr-4">
            <Logo width={100} height={32} />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-4 max-w-5xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search videos..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              onClick={handleWatchSelected}
              disabled={selectedVideos.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Selected ({selectedVideos.length})
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-md"></div>
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No videos found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Accordion type="multiple" value={expandedModules} className="w-full border rounded-md overflow-hidden">
                {modules.map((module, moduleIndex) => (
                  <AccordionItem key={moduleIndex} value={module.category} className="border-b last:border-b-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30 hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <span className="font-medium text-base">{module.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {module.totalDuration}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {module.videos.length} videos
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/20">
                            <tr>
                              <th className="w-6 px-4 py-2 text-left">
                                <span className="sr-only">Select</span>
                              </th>
                              <th className="px-4 py-2 text-left font-medium">Feature</th>
                              <th className="px-4 py-2 text-left font-medium">Description</th>
                              <th className="px-4 py-2 text-left font-medium w-32">Time Required</th>
                              <th className="px-4 py-2 text-left font-medium w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {module.videos.map((video) => (
                              <tr key={video.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3">
                                  <Checkbox
                                    checked={selectedVideos.includes(video.id)}
                                    onCheckedChange={() => handleVideoSelection(video.id)}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium">{video.title}</td>
                                <td className="px-4 py-3 text-muted-foreground">{video.description}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    {video.duration}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {video.watched ? (
                                    <div className="flex items-center text-green-600 dark:text-green-500">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      <span className="text-xs">Watched</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Unwatched</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-3">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EOXS. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
