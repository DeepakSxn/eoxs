"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth, db } from "../firebase"
import { Button } from "@/components/ui/button"
import { Home, LogOut, Play, ArrowLeft, Info, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "../theme-toggle"
import { Logo } from "../components/logo"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"

// Define Video and Playlist types
interface Video {
  id: string
  title: string
  duration: string
  thumbnail?: string
  publicId?: string
  tags?: string[]
  description?: string
  category?: string
  videoUrl?: string
}

interface Playlist {
  id: string
  createdAt: { seconds: number; nanoseconds: number }
  videos: Video[]
  userId?: string
  userEmail?: string
}

const PlaylistPage = () => {
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<any>(null)
  const [userProfession, setUserProfession] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [videoDetailsOpen, setVideoDetailsOpen] = useState(false)
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<Video | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set())

  useEffect(() => {
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
            setUserProfession(userData.profession || null)
          }

          // Fetch user playlists
          fetchUserPlaylists(currentUser.uid)

          // Fetch user's watch history
          fetchWatchHistory(currentUser.uid)
        } catch (error) {
          console.error("Error fetching user data:", error)
          setLoading(false)
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchWatchHistory = async (userId: string) => {
    try {
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set<string>()

      watchHistorySnapshot.forEach((doc) => {
        watchedVideoIds.add(doc.data().videoId)
      })

      setWatchedVideos(watchedVideoIds)
    } catch (error) {
      console.error("Error fetching watch history:", error)
    }
  }

  const fetchUserPlaylists = async (userId: string) => {
    try {
      const playlistsRef = collection(db, "playlists")
      const q = query(playlistsRef, where("userId", "==", userId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        // If no playlists, redirect to dashboard to create one
        router.push("/dashboard")
        return
      }

      const fetchedPlaylists = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Playlist[]

      // Filter videos in playlists by user profession if available
      if (userProfession && userProfession !== "Other" && userProfession !== "General") {
        fetchedPlaylists.forEach((playlist) => {
          playlist.videos = playlist.videos.filter(
            (video) =>
              video.category === userProfession || video.category === "General" || video.tags?.includes(userProfession),
          )
        })
      }

      setPlaylists(fetchedPlaylists)
      // Set the first playlist as selected by default
      if (fetchedPlaylists.length > 0) {
        setSelectedPlaylist(fetchedPlaylists[0])
      }
      setLoading(false)
    } catch (error) {
      console.error("Error fetching playlists:", error)
      setLoading(false)
    }
  }

  const showVideoDetails = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the card click
    setSelectedVideoDetails(video)
    setVideoDetailsOpen(true)
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return

    setSubmittingFeedback(true)
    try {
      // Save feedback to Firestore
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid,
        userEmail: user?.email,
        feedback,
        createdAt: serverTimestamp(),
      })

      setSubmittingFeedback(false)
      setFeedback("")
      setFeedbackOpen(false)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setSubmittingFeedback(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handlePlayVideo = (video: Video) => {
    // Navigate to video player with the selected video
    router.push(`/video-player?videoId=${video.id}&playlistId=${selectedPlaylist?.id}`)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <header className="border-b sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/">
              <Logo width={120} height={40} />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {userProfession && (
                <Badge variant="outline" className="ml-2">
                  {userProfession}
                </Badge>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                    <Home className="h-5 w-5" />
                    <span className="sr-only">Dashboard</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Back to Dashboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setFeedbackOpen(true)}>
                    <MessageSquare className="h-5 w-5" />
                    <span className="sr-only">Feedback</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Provide Feedback</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <ThemeToggle />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Log out</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Playlists</h1>
            <p className="text-muted-foreground">Watch and manage your video playlists</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white dark:bg-gray-800 animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 text-center p-8">
            <div className="mb-4">
              <Info className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">No Playlists Found</CardTitle>
            <CardDescription className="mb-6">You haven't created any playlists yet.</CardDescription>
            <Button onClick={() => router.push("/dashboard")}>Create Playlist</Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Playlist Tabs */}
            {playlists.length > 1 && (
              <Tabs
                defaultValue={playlists[0]?.id}
                onValueChange={(value) => {
                  const selected = playlists.find((p) => p.id === value)
                  if (selected) setSelectedPlaylist(selected)
                }}
                className="w-full"
              >
                <TabsList className="w-full justify-start overflow-x-auto">
                  {playlists.map((playlist) => (
                    <TabsTrigger key={playlist.id} value={playlist.id} className="flex-shrink-0">
                      Playlist {playlists.indexOf(playlist) + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Selected Playlist */}
            {selectedPlaylist && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <Card className="bg-white dark:bg-gray-800 overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Your Selected Videos</CardTitle>
                        <CardDescription>
                          Created on{" "}
                          {selectedPlaylist.createdAt?.seconds
                            ? format(new Date(selectedPlaylist.createdAt.seconds * 1000), "PPP")
                            : "Unknown date"}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {selectedPlaylist.videos.length} videos
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {selectedPlaylist.videos.length === 0 ? (
                      <div className="text-center py-8">
                        <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No videos in this category</h3>
                        <p className="text-muted-foreground mb-4">
                          There are no videos matching your profession in this playlist.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedPlaylist.videos.map((video, index) => {
                          const isWatched = watchedVideos.has(video.id)
                          return (
                            <motion.div key={video.id} variants={itemVariants}>
                              <Card
                                className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800 hover:border-primary/50"
                                onClick={() => handlePlayVideo(video)}
                              >
                                <div className="relative">
                                  <div className="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    <Image
                                      src={video.thumbnail || "/placeholder.svg?height=180&width=320"}
                                      alt={video.title}
                                      width={320}
                                      height={180}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Play className="h-12 w-12 text-white" />
                                    </div>
                                  </div>

                                  {isWatched && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                      Watched
                                    </div>
                                  )}

                                  {/* Video Number Badge */}
                                  <div className="absolute top-2 left-2 bg-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </div>

                                  {/* Category Badge */}
                                  {video.category && (
                                    <div className="absolute top-2 right-2 bg-primary/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                      {video.category}
                                    </div>
                                  )}
                                </div>

                                <CardContent className="p-4">
                                  <h3 className="font-medium line-clamp-1">{video.title}</h3>

                                  {/* Tags */}
                                  {video.tags && video.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {video.tags.slice(0, 3).map((tag, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {video.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{video.tags.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t p-4 flex justify-between">
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>
                      Create New Playlist
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/90 btn-enhanced btn-primary-enhanced"
                      onClick={() => router.push("/feedback")}
                    >
                      Submit Feedback
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </div>
        )}
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

      {/* Video Details Dialog */}
      <Dialog open={videoDetailsOpen} onOpenChange={setVideoDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedVideoDetails?.title}</DialogTitle>
            <DialogDescription>Video details and information</DialogDescription>
          </DialogHeader>

          {selectedVideoDetails && (
            <div className="space-y-4">
              {/* Video Thumbnail */}
              <div className="rounded-md overflow-hidden">
                <Image
                  src={selectedVideoDetails.thumbnail || "/placeholder.svg?height=180&width=320"}
                  alt={selectedVideoDetails.title}
                  width={400}
                  height={225}
                  className="w-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                  <p>{selectedVideoDetails.duration}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p>{selectedVideoDetails.category || "Uncategorized"}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-sm">{selectedVideoDetails.description}</p>
                </div>

                {selectedVideoDetails.tags && selectedVideoDetails.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVideoDetails.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
            <DialogDescription>We'd love to hear your thoughts about our demo videos and platform.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="What did you think about the videos? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || submittingFeedback}
              className="bg-primary hover:bg-primary/90 btn-enhanced"
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PlaylistPage

