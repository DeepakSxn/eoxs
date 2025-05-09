"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, orderBy, query, where, doc, getDoc } from "firebase/firestore"

import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, LogOut, Clock, Play, CheckCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { auth, db } from "../firebase"
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar"

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
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
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
    if (user?.uid) {
      const fetchProfile = async () => {
        const q = query(collection(db, "users"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          // setProfile({
          //   name: data.name || '-',
          //   companyName: data.companyName || '-',
          // });
        }
      };
      fetchProfile();
    }
  }, [user]);

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

  // Helper function to ensure valid URLs
  const getSafeUrl = (url: string | undefined): string => {
    if (!url) return "/placeholder.svg?height=180&width=320"
    try {
      // Test if it's a valid URL
      new URL(url)
      return url
    } catch (e) {
      return "/placeholder.svg?height=180&width=320"
    }
  }

  const fetchVideos = async (userId: string) => {
    try {
      setLoading(true)

      // Fetch ALL videos from Firestore with ordering by timestamp
      const videosCollection = collection(db, "videos")
      // Create a query with orderBy to sort by timestamp in ascending order
      const videosQuery = query(videosCollection, orderBy("createdAt", "asc"))
      const videoSnapshot = await getDocs(videosQuery)

      if (videoSnapshot.empty) {
        toast({
          title: "No Videos Found",
          description: "There are no videos available in the system.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const videoList = videoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        thumbnail: getSafeUrl(
          doc.data().publicId
            ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${doc.data().publicId}.jpg`
            : undefined,
        ),
        description: doc.data().description || "-",
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

      // Filter out General and Miscellaneous videos for dashboard display only
      const filteredForDisplay = videosWithWatchStatus.filter(
        (video) => video.category !== "Company Introduction" && video.category !== "Miscellaneous",
      )

      setFilteredVideos(filteredForDisplay)
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
    const videosByCategory = filteredVideos.reduce((acc, video) => {
      // Exclude General and Miscellaneous categories
      if (video.category === "Company Introduction" || video.category === "Miscellaneous") {
        return acc;
      }

      const category = video.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(video);
      return acc;
    }, {} as Record<string, Video[]>);
  
    const moduleArray: Module[] = [];
    // Calculate total duration for each module
    const calculateTotalDuration = (videos: Video[]): string => {
      let totalMinutes = 0

      videos.forEach((video) => {
        // Extract minutes from duration string (e.g., "5 minutes" -> 5)
        const durationMatch = video.duration.match(/(\d+)/);
        if (durationMatch && durationMatch[1]) {
          totalMinutes += Number.parseInt(durationMatch[1], 10);
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

  const handleWatchSelected = async () => {
    if (selectedVideos.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video to watch.",
        variant: "destructive",
      })
      return
    }
  
    // Get the selected videos
    const selectedVideoObjects = videos.filter((video) => selectedVideos.includes(video.id));
    
    // Get all General category videos (Company Introduction)
    const generalVideos = videos.filter(video => video.category === "Company Introduction");
    
    // Get Miscellaneous videos
    const miscVideos = videos.filter(video => video.category === "Miscellaneous");

    try {
      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", auth.currentUser?.uid),
        where("completed", "==", true)
      );

      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map(doc => doc.data().videoId));

      // Create the playlist with all videos in the correct order
      const selectedNonGeneralVideos = selectedVideoObjects.filter(v => v.category !== "Company Introduction");
      
      // First, add all general videos
      let allPlaylistVideos: typeof videos = [...generalVideos];
      
      // Then add selected videos (excluding General category)
      allPlaylistVideos = [...allPlaylistVideos, ...selectedNonGeneralVideos];
      
      // Finally add Miscellaneous videos that aren't already in the playlist
      const existingVideoIds = new Set([...generalVideos, ...selectedNonGeneralVideos].map(v => v.id));
      const uniqueMiscVideos = miscVideos.filter(v => !existingVideoIds.has(v.id));
      allPlaylistVideos = [...allPlaylistVideos, ...uniqueMiscVideos];

      // Find the first unwatched video to start playback
      let firstVideoToPlay: string;

      // First, check for unwatched general videos
      const firstUnwatchedGeneral = generalVideos.find(video => !watchedVideoIds.has(video.id));
      
      if (firstUnwatchedGeneral) {
        // If there's an unwatched general video, start with that
        firstVideoToPlay = firstUnwatchedGeneral.id;
      } else {
        // If all general videos are watched, start with the first selected video
        firstVideoToPlay = selectedVideoObjects[0].id;
      }

      // Update the playlist in localStorage
      const updatedPlaylist = {
        id: "custom-playlist",
        videos: allPlaylistVideos,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };
    
      localStorage.setItem("currentPlaylist", JSON.stringify(customPlaylist));
    
      // Set as active playlist
      const activePlaylist = {
        id: "custom-playlist",
        title: "Custom Playlist",
        lastAccessed: new Date().toISOString(),
        completionPercentage: 0,
      };
      localStorage.setItem("activePlaylist", JSON.stringify(activePlaylist));
    
      // Navigate to the first unwatched video
      router.push(`/video-player?videoId=${firstVideoToPlay}&playlistId=custom-playlist`)
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast({
        title: "Error",
        description: "Failed to update playlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-50 flex items-center px-4">
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <img src="/light.webp" height={120} width={80} alt="logo" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      {/* Sidebar */}
      <aside className="fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 border-r bg-card">
        <SidebarProvider>
          <Sidebar
            selectedVideos={selectedVideos}
            videoList={videos}
          />
        </SidebarProvider>
      </aside>
      {/* Main Content */}
      <main className="pt-14 min-h-screen md:ml-64">
        <div className="max-w-5xl mx-auto pb-4 p-0">
          <div className="flex flex-col sm:flex-row justify-between gap-4 sticky top-0 z-20 bg-background pb-2">
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