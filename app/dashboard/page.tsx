"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db, auth } from "../firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, LogOut, Lock } from "lucide-react"
import { Logo } from "../components/logo"
import { ThemeToggle } from "../theme-toggle"
import { format } from "date-fns"
import Image from "next/image"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  videoUrl: string
  duration: string
  category: string
  tags: string[]
  createdAt: any
}

interface Module {
  name: string
  category: string
  videos: Video[]
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [categories, setCategories] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [userProfession, setUserProfession] = useState<string | null>(null)
  const [secondaryProfession, setSecondaryProfession] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [activeFilter, setActiveFilter] = useState<string>("")
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [videoWatchEvents, setVideoWatchEvents] = useState<Record<string, boolean | null>>({})
  const [expandedModule, setExpandedModule] = useState<string | null>("module-0") // Default to first module

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

        // Fetch user data to get profession
        try {
          const usersRef = collection(db, "users")
          const q = query(usersRef, where("userId", "==", currentUser.uid))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data()
            setUserProfession(userData.primaryProfession || userData.profession || null)
            setSecondaryProfession(userData.secondaryProfession || null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    // Fetch videos from Firestore
    const fetchVideos = async () => {
      try {
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

        // Extract all unique categories and tags
        const categories = new Set<string>()
        const tags = new Set<string>()

        videoList.forEach((video) => {
          if (video.category) categories.add(video.category)
          if (video.tags) {
            video.tags.forEach((tag) => tags.add(tag))
          }
        })

        setAvailableCategories(Array.from(categories))
        setAvailableTags(Array.from(tags))
        setVideos(videoList)
        setFilteredVideos(videoList)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching videos:", error)
        setLoading(false)
      }
    }

    fetchVideos()

    // Handle browser navigation
    const handleBeforeUnload = () => {
      sessionStorage.setItem("navigationOccurred", "true")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [router, userProfession])

  useEffect(() => {
    // Filter videos based on search query and active filter
    if (!searchQuery && !activeFilter) {
      setFilteredVideos(videos)
      return
    }

    let filtered = [...videos]

    // Apply search filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(lowerCaseQuery) ||
          (video.tags && video.tags.some((tag) => tag.toLowerCase().includes(lowerCaseQuery))) ||
          (video.description && video.description.toLowerCase().includes(lowerCaseQuery)),
      )
    }

    // Apply category/tag filter
    

    setFilteredVideos(filtered)
  }, [searchQuery, videos, activeFilter])

  useEffect(() => {
    if (filteredVideos.length > 0 && user) {
      organizeVideosIntoModules()
    }
  }, [filteredVideos, user, userProfession, secondaryProfession])

  const organizeVideosIntoModules = () => {
    if (!user) return

    const modules: Module[] = []
    const userProfessions = [userProfession, secondaryProfession].filter(Boolean) as string[]

    // 1. Company Introduction (General)
    const generalCategoryVideos = filteredVideos.filter((video) => video.category === "General")
    if (generalCategoryVideos.length > 0) {
      modules.push({
        name: "Company Introduction",
        category: "General",
        videos: generalCategoryVideos,
      })
    }

    // 2. User's Professions
    userProfessions.forEach((profession) => {
      const professionVideos = filteredVideos.filter((video) => video.category === profession)
      if (professionVideos.length > 0) {
        modules.push({
          name: profession,
          category: profession,
          videos: professionVideos,
        })
      }
    })

    // 3. Miscellaneous
    const miscellaneousCategoryVideos = filteredVideos.filter((video) => video.category === "Miscellaneous")
    if (miscellaneousCategoryVideos.length > 0) {
      modules.push({
        name: "Miscellaneous",
        category: "Miscellaneous",
        videos: miscellaneousCategoryVideos,
      })
    }

    setModules(modules)
    initializeVideoWatchEvents(modules)
  }

  const initializeVideoWatchEvents = (modules: Module[]) => {
    if (!user) return

    const events: Record<string, boolean | null> = {}

    // First, mark all videos as locked
    modules.forEach((module) => {
      module.videos.forEach((video) => {
        events[video.id] = null
      })
    })

    // Then, unlock the first video of the first module (Company Introduction)
    if (modules.length > 0 && modules[0].videos.length > 0) {
      events[modules[0].videos[0].id] = false
    }

    // Fetch watch history to update the events
    fetchWatchHistory(events, modules)
  }

  const fetchWatchHistory = async (initialEvents: Record<string, boolean | null>, modules: Module[]) => {
    if (!user) return

    try {
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      if (watchedVideoIds.size > 0) {
        const updatedEvents = { ...initialEvents }

        // Mark all watched videos
        for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
          const module = modules[moduleIndex]

          for (let videoIndex = 0; videoIndex < module.videos.length; videoIndex++) {
            const video = module.videos[videoIndex]

            // If this video is watched
            if (watchedVideoIds.has(video.id)) {
              updatedEvents[video.id] = true

              // Unlock the next video in this module if it exists
              if (videoIndex + 1 < module.videos.length) {
                const nextVideoId = module.videos[videoIndex + 1].id
                if (updatedEvents[nextVideoId] === null) {
                  updatedEvents[nextVideoId] = false
                }
              }
              // If this is the last video in the module, unlock the first video of the next module
              else if (moduleIndex + 1 < modules.length && modules[moduleIndex + 1].videos.length > 0) {
                const nextModuleFirstVideoId = modules[moduleIndex + 1].videos[0].id
                if (updatedEvents[nextModuleFirstVideoId] === null) {
                  updatedEvents[nextModuleFirstVideoId] = false
                }
              }
            }
          }
        }

        setVideoWatchEvents(updatedEvents)
      } else {
        setVideoWatchEvents(initialEvents)
      }
    } catch (error) {
      console.error("Error fetching watch history:", error)
      setVideoWatchEvents(initialEvents)
    }
  }

  const handleShowDetails = (video: Video) => {
    setCurrentVideo(video)
    setShowDetails(true)
  }

  const handleLogout = () => {
    auth.signOut()
    router.push("/login")
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, "MMM d, yyyy")
    } catch (error) {
      return "Invalid date"
    }
  }

  // Fix the handleVideoClick function to properly create and store the playlist
  const handleVideoClick = (videoId: string) => {
    // Find the module that contains this video
    const moduleIndex = modules.findIndex((module) => module.videos.some((video) => video.id === videoId))

    if (moduleIndex === -1) {
      console.error("Video not found in any module")
      return
    }

    // Get all videos from all modules to create a complete playlist
    const allVideos = modules.flatMap((module) => module.videos)

    // Create a playlist with all videos
    const allVideosPlaylist = {
      id: "all-videos",
      videos: allVideos,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    }

    // Store the playlist in localStorage
    localStorage.setItem("currentPlaylist", JSON.stringify(allVideosPlaylist))

    // Navigate to the video player page with the videoId and playlistId
    router.push(`/video-player?videoId=${videoId}&playlistId=all-videos`)
  }

  const isVideoPlayable = (moduleIndex: number, videoIndex: number) => {
    if (moduleIndex >= modules.length || videoIndex >= modules[moduleIndex].videos.length) {
      return false
    }

    const video = modules[moduleIndex].videos[videoIndex]
    return videoWatchEvents[video.id] !== null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center px-4">
          <div className="mr-4">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-4">
            {userProfession && userProfession !== "Other" && (
              <Badge variant="outline" className="font-normal">
                {userProfession}
              </Badge>
            )}
            {secondaryProfession && secondaryProfession !== "Other" && (
              <Badge variant="outline" className="font-normal">
                {secondaryProfession}
              </Badge>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-4">
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

          
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-3 border rounded-md">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No videos found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Accordion
                type="single"
                collapsible
                defaultValue="module-0"
                className="w-full"
                value={expandedModule}
                onValueChange={setExpandedModule}
              >
                {modules.map((module, moduleIndex) => (
                  <AccordionItem key={moduleIndex} value={`module-${moduleIndex}`}>
                    <AccordionTrigger className="hover:no-underline px-4 py-2 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-lg">{module.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {module.videos.length} videos
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                        {module.videos.map((video, videoIndex) => {
                          const isWatched = videoWatchEvents[video.id] === true
                          const isPlayable = videoWatchEvents[video.id] !== null

                          return (
                            <div
                              key={video.id}
                              className={`relative p-3 border rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                                !isPlayable ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              onClick={() => {
                                if (isPlayable) {
                                  handleVideoClick(video.id)
                                }
                              }}
                            >
                              <div className="aspect-video rounded-md overflow-hidden relative">
                                <Image
                                  src={video.thumbnailUrl || "/placeholder.svg"}
                                  alt={video.title}
                                  fill
                                  className="object-cover"
                                />
                                {isWatched && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Badge variant="secondary" className="text-xs">
                                      Watched
                                    </Badge>
                                  </div>
                                )}
                                {!isPlayable && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Lock className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="mt-2">
                                <h3 className="font-medium text-sm line-clamp-1">{video.title}</h3>
                                <p className="text-xs text-muted-foreground">{video.duration}</p>
                              </div>
                            </div>
                          )
                        })}
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

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentVideo?.title}</DialogTitle>
            <DialogDescription>{formatDate(currentVideo?.createdAt)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">{currentVideo?.description}</p>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Category</p>
                <p>{currentVideo?.category || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p>{currentVideo?.duration || "N/A"}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {currentVideo?.tags?.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {(!currentVideo?.tags || currentVideo.tags.length === 0) && <span className="text-xs">No tags</span>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentVideo) {
                    handleShowDetails(currentVideo)
                  }
                  setShowDetails(false)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

