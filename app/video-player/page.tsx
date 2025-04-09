"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
} from "firebase/firestore"
import { auth, db } from "../firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "../theme-toggle"
import { Logo } from "../components/logo"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  LogOut,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MessageSquare,
  ArrowLeft,
  Lock,
  CheckCircle,
  Star,
  FastForward,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { signOut } from "firebase/auth"
import { Label } from "@/components/ui/label"

interface Video {
  id: string
  title: string
  duration: string
  thumbnail?: string
  publicId?: string
  videoUrl?: string
  description?: string
  category?: string
  tags?: string[]
}

interface Module {
  name: string
  category: string
  videos: Video[]
}

interface Playlist {
  id: string
  createdAt: { seconds: number; nanoseconds: number }
  videos: Video[]
  userId?: string
  userEmail?: string
}

interface LastWatchedVideo {
  videoId: string
  playlistId: string
}

interface VideoFeedback {
  rating: number
  comment: string
}

export default function VideoPlayerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoId = searchParams.get("videoId")
  const playlistId = searchParams.get("playlistId")

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null)
  const [videoWatchEvents, setVideoWatchEvents] = useState<Record<string, boolean | null>>({})
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({})
  const [modules, setModules] = useState<Module[]>([])
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [videoFeedbackOpen, setVideoFeedbackOpen] = useState(false)
  const [videoFeedback, setVideoFeedback] = useState<VideoFeedback>({ rating: 0, comment: "" })
  const [submittingVideoFeedback, setSubmittingVideoFeedback] = useState(false)
  const [videoProgressMilestones, setVideoProgressMilestones] = useState<Record<string, number[]>>({})
  const [lockProcessComplete, setLockProcessComplete] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const videoChangeRef = useRef<boolean>(false)

  // Check if user is admin
  useEffect(() => {
    if (user) {
      // Check if user email contains admin or is in admin list
      const isUserAdmin =
        user.email && (user.email.includes("admin") || ["admin@eoxs.com", "test@test.com"].includes(user.email))
      setIsAdmin(isUserAdmin)
    }
  }, [user])

  // Update the fetchLastWatchedVideo function to use the new interface
  const fetchLastWatchedVideo = async (userId: string): Promise<LastWatchedVideo | null> => {
    try {
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId),
        where("eventType", "in", ["play", "pause", "completion"]),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)

      if (watchHistorySnapshot.empty) return null

      // Sort by timestamp to get the most recent
      const sortedEvents = watchHistorySnapshot.docs
        .map((doc) => ({
          ...doc.data(),
          id: doc.id,
          watchedAt: doc.data().watchedAt?.toDate() || new Date(0),
        }))
        .sort((a, b) => b.watchedAt - a.watchedAt)

      if (sortedEvents.length > 0 && sortedEvents[0].videoId && sortedEvents[0].playlistId) {
        return {
          videoId: sortedEvents[0].videoId,
          playlistId: sortedEvents[0].playlistId,
        }
      }

      return null
    } catch (error) {
      console.error("Error fetching last watched video:", error)
      return null
    }
  }

  // Update the useEffect that uses fetchLastWatchedVideo to handle the return type properly
  useEffect(() => {
    // Check for navigation flag
    const navigationOccurred = sessionStorage.getItem("navigationOccurred")
    let unsubscribe: () => void = () => {} // Initialize unsubscribe

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
    unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Fetch last watched video if no specific videoId is provided
        if (!videoId) {
          const lastWatched = await fetchLastWatchedVideo(currentUser.uid)
          if (lastWatched && lastWatched.videoId) {
            // If we have a playlistId, use it, otherwise fetch the video directly
            if (playlistId) {
              fetchPlaylist(playlistId, lastWatched.videoId)
            } else if (lastWatched.playlistId) {
              // Redirect to the video player with the last watched video and its playlist
              router.push(`/video-player?videoId=${lastWatched.videoId}&playlistId=${lastWatched.playlistId}`)
            } else {
              // Just redirect to the video without a playlist
              router.push(`/video-player?videoId=${lastWatched.videoId}`)
            }
          } else if (playlistId) {
            // If no last watched video but we have a playlistId, fetch the playlist
            fetchPlaylist(playlistId)
          }
        } else if (playlistId) {
          // If we have both videoId and playlistId, fetch the playlist
          fetchPlaylist(playlistId, videoId)
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router, playlistId, videoId])

  useEffect(() => {
    if (currentVideo && lockProcessComplete) {
      checkAndSetVideoWatched(currentVideo.id)
    }
  }, [currentVideo, lockProcessComplete])

  useEffect(() => {
    // Set up fullscreen change event listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  useEffect(() => {
    // Initialize current video only when necessary
    if (
      playlist?.videos &&
      Array.isArray(playlist.videos) &&
      playlist.videos.length > 0 &&
      videoId &&
      lockProcessComplete
    ) {
      const index = playlist.videos.findIndex((v) => v && v.id === videoId)

      // Guard against invalid videoId
      if (index === -1) {
        router.push("/dashboard")
        return
      }

      // Only update state if video changed
      if (currentVideo?.id !== videoId || currentVideoIndex !== index) {
        videoChangeRef.current = true
        setCurrentVideoIndex(index)
        setCurrentVideo(playlist.videos[index])
      }
    }
  }, [playlist, videoId, currentVideo?.id, currentVideoIndex, router, lockProcessComplete])

  // Add cleanup for safety
  useEffect(() => {
    return () => {
      // Reset video states on unmount
      setCurrentVideoIndex(0)
      setCurrentVideo(null)
    }
  }, [])

  // Add a new useEffect to handle video playback when currentVideo changes
  useEffect(() => {
    if (currentVideo && videoRef.current && videoChangeRef.current && lockProcessComplete) {
      // Reset video state
      setProgress(0)
      setCurrentTime(0)
      setIsPlaying(false)

      // Auto-play the video after a short delay to ensure the video element is ready
      const playTimer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load()
          videoRef.current
            .play()
            .then(() => {
              setIsPlaying(true)
              setWatchStartTime(Date.now() / 1000)
              videoChangeRef.current = false
            })
            .catch((error) => {
              console.error("Error playing video:", error)
              videoChangeRef.current = false
            })
        }
      }, 300)

      return () => clearTimeout(playTimer)
    }
  }, [currentVideo, lockProcessComplete])

  const fetchPlaylist = async (id: string, initialVideoId?: string) => {
    try {
      setLoading(true)
      setLockProcessComplete(false) // Reset lock process state

      // Check if this is a special "all-videos" playlist or custom playlist from localStorage
      if (id === "all-videos" || id === "custom-playlist") {
        const storedPlaylist = localStorage.getItem("currentPlaylist")
        if (storedPlaylist) {
          try {
            const playlistData = JSON.parse(storedPlaylist) as Playlist

            // Validate the playlist data
            if (!playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) {
              throw new Error("Invalid playlist data: missing or empty videos array")
            }

            setPlaylist(playlistData)

            // Organize videos into modules
            organizeIntoModules(playlistData.videos)

            // Initialize watch events
            await initializeWatchEvents(playlistData, initialVideoId)
            setLoading(false)
            return
          } catch (error) {
            console.error("Error parsing playlist from localStorage:", error)
            toast({
              title: "Error",
              description: "Invalid playlist data. Redirecting to dashboard.",
              variant: "destructive",
            })
            router.push("/dashboard")
            return
          }
        }
      }

      // Regular Firestore playlist fetch
      try {
        const docRef = doc(db, "playlists", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const playlistData = { id: docSnap.id, ...docSnap.data() } as Playlist

          // Validate the playlist data
          if (!playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) {
            throw new Error("Invalid playlist data: missing or empty videos array")
          }

          setPlaylist(playlistData)

          // Organize videos into modules
          organizeIntoModules(playlistData.videos)

          // Initialize watch events
          await initializeWatchEvents(playlistData, initialVideoId)
        } else {
          toast({
            title: "Error",
            description: "Playlist not found",
            variant: "destructive",
          })
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("Error fetching playlist:", error)
        toast({
          title: "Error",
          description: "Failed to load playlist",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    } catch (error) {
      console.error("Error in fetchPlaylist:", error)
      setLoading(false)
      router.push("/dashboard")
    }
  }

  const initializeWatchEvents = async (playlistData: Playlist, initialVideoId?: string) => {
    if (!user) return

    const watchEvents: Record<string, boolean | null> = {}

    // Initialize all videos as locked initially
    playlistData.videos.forEach((video, index) => {
      watchEvents[video.id] = index === 0 ? false : null
    })

    try {
      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      if (watchedVideoIds.size > 0) {
        // First pass: Mark watched videos
        playlistData.videos.forEach((video) => {
          if (watchedVideoIds.has(video.id)) {
            watchEvents[video.id] = true
          }
        })

        // Second pass: Unlock videos in sequence
        let lastWatchedIndex = -1
        for (let i = 0; i < playlistData.videos.length; i++) {
          const videoId = playlistData.videos[i].id
          if (watchEvents[videoId] === true) {
            lastWatchedIndex = i
          }
        }

        // Unlock the next video after the last watched one
        if (lastWatchedIndex >= 0 && lastWatchedIndex + 1 < playlistData.videos.length) {
          const nextVideoId = playlistData.videos[lastWatchedIndex + 1].id
          watchEvents[nextVideoId] = false // Unlocked but not watched
        }
      }

      setVideoWatchEvents(watchEvents)

      // Set current video based on initialVideoId or find the first unlocked unwatched video
      if (initialVideoId) {
        const index = playlistData.videos.findIndex((v) => v.id === initialVideoId)
        if (index !== -1 && (watchEvents[initialVideoId] === true || watchEvents[initialVideoId] === false)) {
          setCurrentVideoIndex(index)
          setCurrentVideo(playlistData.videos[index])
        } else {
          // If the initialVideoId is locked, find the first unlocked video
          findAndSetFirstPlayableVideo(playlistData.videos, watchEvents)
        }
      } else {
        // No initialVideoId, find the first unlocked unwatched video
        findAndSetFirstPlayableVideo(playlistData.videos, watchEvents)
      }

      // Mark lock process as complete
      setLockProcessComplete(true)
    } catch (error) {
      console.error("Error initializing watch events:", error)
      setLockProcessComplete(true) // Still mark as complete to avoid blocking UI
    }
  }

  const findAndSetFirstPlayableVideo = (videos: Video[], watchEvents: Record<string, boolean | null>) => {
    // First try to find an unlocked but unwatched video
    const unwatchedIndex = videos.findIndex((v) => watchEvents[v.id] === false)
    if (unwatchedIndex !== -1) {
      setCurrentVideoIndex(unwatchedIndex)
      setCurrentVideo(videos[unwatchedIndex])
      return
    }

    // If all videos are watched, start with the first one
    setCurrentVideoIndex(0)
    setCurrentVideo(videos[0])
  }

  const organizeIntoModules = (videos: Video[]) => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      setModules([])
      return
    }

    // Create modules array
    const moduleArray: Module[] = []

    // Group videos by category
    const videosByCategory = videos.reduce(
      (acc, video) => {
        if (!video) return acc
        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      },
      {} as Record<string, Video[]>,
    )

    // 1. Always add Company Introduction module first (General category)
    if (videosByCategory["General"] && videosByCategory["General"].length > 0) {
      moduleArray.push({
        name: "Company Introduction",
        category: "General",
        videos: videosByCategory["General"],
      })
      delete videosByCategory["General"]
    }

    // 2. Add other categories as modules (except Miscellaneous)
    Object.entries(videosByCategory)
      .filter(([category]) => category !== "Miscellaneous")
      .forEach(([category, categoryVideos]) => {
        if (categoryVideos && categoryVideos.length > 0) {
          moduleArray.push({
            name: category,
            category: category,
            videos: categoryVideos,
          })
        }
      })

    // 3. Always add Miscellaneous module last
    if (videosByCategory["Miscellaneous"] && videosByCategory["Miscellaneous"].length > 0) {
      moduleArray.push({
        name: "Miscellaneous",
        category: "Miscellaneous",
        videos: videosByCategory["Miscellaneous"],
      })
    }

    setModules(moduleArray)

    // Set active module based on current video
    if (currentVideo && moduleArray.length > 0) {
      const moduleIndex = moduleArray.findIndex(
        (module) =>
          module.videos &&
          Array.isArray(module.videos) &&
          module.videos.some((video) => video && video.id === currentVideo.id),
      )

      if (moduleIndex !== -1) {
        setActiveModuleIndex(moduleIndex)
      }
    }
  }

  // New function to update user analytics
  const updateUserAnalytics = async (
    eventType: string,
    videoId: string,
    watchDuration?: number,
    completed?: boolean,
  ) => {
    if (!user) return

    try {
      // Get user analytics doc or create if it doesn't exist
      const userAnalyticsRef = collection(db, "userAnalytics")
      const q = query(userAnalyticsRef, where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)

      let analyticsDocRef

      if (querySnapshot.empty) {
        // Create new analytics document
        analyticsDocRef = await addDoc(userAnalyticsRef, {
          userId: user.uid,
          userEmail: user.email,
          totalWatchTime: 0,
          videosWatched: 0,
          videosCompleted: 0,
          lastActive: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
      } else {
        // Use existing document
        analyticsDocRef = querySnapshot.docs[0].ref
      }

      // Update analytics based on event type
      const updateData: any = {
        lastActive: serverTimestamp(),
      }

      if (watchDuration) {
        updateData.totalWatchTime = increment(watchDuration)
      }

      if (eventType === "play") {
        updateData.videosWatched = increment(1)
      }

      if (completed) {
        updateData.videosCompleted = increment(1)
      }

      await updateDoc(analyticsDocRef, updateData)
    } catch (error) {
      console.error("Error updating user analytics:", error)
    }
  }

  // New function to update video analytics
  const updateVideoAnalytics = async (
    eventType: string,
    videoId: string,
    watchDuration?: number,
    completed?: boolean,
  ) => {
    if (!videoId) return

    try {
      // Get video analytics doc or create if it doesn't exist
      const videoAnalyticsRef = collection(db, "videoAnalytics")
      const q = query(videoAnalyticsRef, where("videoId", "==", videoId))
      const querySnapshot = await getDocs(q)

      let analyticsDocRef

      if (querySnapshot.empty) {
        // Create new analytics document
        analyticsDocRef = await addDoc(videoAnalyticsRef, {
          videoId,
          title: currentVideo?.title || "Unknown",
          category: currentVideo?.category || "Uncategorized",
          views: 0,
          completions: 0,
          totalWatchTime: 0,
          averageRating: 0,
          ratingCount: 0,
          lastWatched: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
      } else {
        // Use existing document
        analyticsDocRef = querySnapshot.docs[0].ref
      }

      // Update analytics based on event type
      const updateData: any = {
        lastWatched: serverTimestamp(),
      }

      if (watchDuration) {
        updateData.totalWatchTime = increment(watchDuration)
      }

      if (eventType === "play") {
        updateData.views = increment(1)
      }

      if (completed) {
        updateData.completions = increment(1)
      }

      await updateDoc(analyticsDocRef, updateData)
    } catch (error) {
      console.error("Error updating video analytics:", error)
    }
  }

  const handleVideoPlay = () => {
    if (videoRef.current && currentVideo) {
      videoRef.current.play()
      setIsPlaying(true)

      // Record start time for analytics
      setWatchStartTime(Date.now() / 1000)

      // Only log play event if this is the first play in this session
      // or if the video was previously completed (rewatch)
      const isRewatch = videoWatchEvents[currentVideo.id] === true

      // Check if we've already logged a play event for this video in this session
      const sessionKey = `played_${currentVideo.id}`
      const alreadyPlayed = sessionStorage.getItem(sessionKey)

      if (!alreadyPlayed) {
        // Log play event to Firestore
        logVideoEvent("play", isRewatch)

        // Update analytics
        updateUserAnalytics("play", currentVideo.id)
        updateVideoAnalytics("play", currentVideo.id)

        // Mark this video as played in this session
        sessionStorage.setItem(sessionKey, "true")
      }
    }
  }

  const handleVideoPause = () => {
    if (videoRef.current && currentVideo) {
      videoRef.current.pause()
      setIsPlaying(false)

      // Calculate watch duration for analytics
      if (watchStartTime) {
        const watchDuration = Date.now() / 1000 - watchStartTime

        // Log pause event to Firestore
        logVideoEvent("pause", false, watchDuration)

        // Update analytics
        updateUserAnalytics("pause", currentVideo.id, watchDuration)
        updateVideoAnalytics("pause", currentVideo.id, watchDuration)

        // Reset watch start time
        setWatchStartTime(null)
      }
    }
  }

  const handleVideoEnded = () => {
    if (
      !currentVideo ||
      !playlist ||
      !playlist.videos ||
      !Array.isArray(playlist.videos) ||
      playlist.videos.length === 0
    ) {
      return
    }

    setIsPlaying(false)

    // Set progress to 100% when video ends
    setProgress(100)

    // Calculate final watch duration for analytics
    if (watchStartTime) {
      const watchDuration = Date.now() / 1000 - watchStartTime

      // Mark current video as watched
      const updatedWatchEvents = { ...videoWatchEvents }
      updatedWatchEvents[currentVideo.id] = true

      // Unlock the next video if it exists and is currently locked
      if (currentVideoIndex + 1 < playlist.videos.length) {
        const nextVideoId = playlist.videos[currentVideoIndex + 1].id
        if (updatedWatchEvents[nextVideoId] === null) {
          updatedWatchEvents[nextVideoId] = false // Unlock but not watched
        }
      }

      setVideoWatchEvents(updatedWatchEvents)

      // Log completion event to Firestore
      logVideoEvent("completion", false, watchDuration, true)

      // Update analytics
      updateUserAnalytics("completion", currentVideo.id, watchDuration, true)
      updateVideoAnalytics("completion", currentVideo.id, watchDuration, true)

      // Reset watch start time
      setWatchStartTime(null)

      // Prompt for video feedback
      setVideoFeedbackOpen(true)

      // Auto play next video if available
      if (currentVideoIndex + 1 < playlist.videos.length) {
        const nextIndex = currentVideoIndex + 1
        const nextVideoId = playlist.videos[nextIndex].id

        if (updatedWatchEvents[nextVideoId] !== null) {
          videoChangeRef.current = true
          setCurrentVideoIndex(nextIndex)
          setCurrentVideo(playlist.videos[nextIndex])

          // Update URL without refreshing the page
          const newUrl = `/video-player?videoId=${nextVideoId}&playlistId=${playlist.id}`
          window.history.pushState({}, "", newUrl)

          // Update active module if needed
          if (modules && modules.length > 0) {
            const moduleIndex = modules.findIndex(
              (module) =>
                module.videos &&
                Array.isArray(module.videos) &&
                module.videos.some((video) => video && video.id === playlist.videos[nextIndex].id),
            )

            if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
              setActiveModuleIndex(moduleIndex)
            }
          }
        } else {
          // Show feedback dialog when playlist is completed
          setFeedbackOpen(true)
        }
      } else {
        // Show feedback dialog when playlist is completed
        setFeedbackOpen(true)
      }
    }
  }

  const checkAndSetVideoWatched = async (videoId: string) => {
    if (!user || !playlist || !videoId) return

    try {
      // Query Firestore for watch history of the current video
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid),
        where("videoId", "==", videoId),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)

      if (!watchHistorySnapshot.empty) {
        // If the video has been watched, update its status
        const updatedWatchEvents = { ...videoWatchEvents }
        updatedWatchEvents[videoId] = true

        // Find the current video index in the playlist
        const currentIndex = playlist.videos.findIndex((v) => v.id === videoId)

        // Unlock the next video if it exists and is currently locked
        if (currentIndex !== -1 && currentIndex + 1 < playlist.videos.length) {
          const nextVideoId = playlist.videos[currentIndex + 1].id
          if (updatedWatchEvents[nextVideoId] === null) {
            updatedWatchEvents[nextVideoId] = false // Unlock but not watched
          }
        }

        setVideoWatchEvents(updatedWatchEvents)

        // Optionally log rewatch event
        logVideoEvent("rewatch", true)
      }
    } catch (error) {
      console.error("Error checking watch status:", error)
    }
  }

  // Fetch watch history for all videos
  const fetchWatchHistory = async () => {
    if (!user || !playlist) return

    try {
      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid),
        where("completed", "==", true),
      )

      const watchHistorySnapshot = await getDocs(watchHistoryQuery)
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId))

      if (watchedVideoIds.size > 0) {
        // Create a new watch events object
        const updatedWatchEvents = { ...videoWatchEvents }

        // Mark all watched videos
        playlist.videos.forEach((video) => {
          if (watchedVideoIds.has(video.id)) {
            updatedWatchEvents[video.id] = true
          }
        })

        // Unlock videos after watched ones in sequence
        let lastWatchedIndex = -1
        for (let i = 0; i < playlist.videos.length; i++) {
          if (updatedWatchEvents[playlist.videos[i].id] === true) {
            lastWatchedIndex = i
          }
        }

        // Unlock the next video after the last watched one
        if (lastWatchedIndex >= 0 && lastWatchedIndex + 1 < playlist.videos.length) {
          const nextVideoId = playlist.videos[lastWatchedIndex + 1].id
          if (updatedWatchEvents[nextVideoId] === null) {
            updatedWatchEvents[nextVideoId] = false // Unlocked but not watched
          }
        }

        // Update state
        setVideoWatchEvents(updatedWatchEvents)
      }
    } catch (error) {
      console.error("Error fetching watch history:", error)
    }
  }

  // Add this to the useEffect that runs when playlist is loaded
  useEffect(() => {
    if (playlist && user && lockProcessComplete) {
      fetchWatchHistory()
    }
  }, [playlist, user, lockProcessComplete])

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !currentVideo) return

    const current = videoRef.current.currentTime
    const videoDuration = videoRef.current.duration

    // Update progress state
    setCurrentTime(current)
    setDuration(videoDuration)
    setProgress((current / videoDuration) * 100)

    // Update video progress for this specific video
    setVideoProgress((prev) => ({
      ...prev,
      [currentVideo.id]: (current / videoDuration) * 100,
    }))

    // Track progress milestones (25%, 50%, 75%)
    const milestones = [25, 50, 75]
    const currentProgress = (current / videoDuration) * 100
    const currentMilestone = Math.floor(currentProgress / 25) * 25

    if (
      milestones.includes(currentMilestone) &&
      (!videoProgressMilestones[currentVideo.id] ||
        !Array.isArray(videoProgressMilestones[currentVideo.id]) ||
        !videoProgressMilestones[currentVideo.id].includes(currentMilestone))
    ) {
      // Update tracked milestones
      setVideoProgressMilestones((prev) => {
        const updatedMilestones = { ...prev }
        if (!updatedMilestones[currentVideo.id]) {
          updatedMilestones[currentVideo.id] = []
        }
        updatedMilestones[currentVideo.id] = [...updatedMilestones[currentVideo.id], currentMilestone]
        return updatedMilestones
      })

      // Log milestone event with a valid progressPercentage
      logVideoEvent("milestone", false, current, false, currentMilestone)
    }
  }

  const logVideoEvent = async (
    eventType: string,
    isRewatch: boolean,
    watchDuration?: number,
    completed?: boolean,
    progressPercentage?: number,
  ) => {
    if (!currentVideo || !user || !playlist) return

    try {
      const eventData: any = {
        videoId: currentVideo.id,
        userId: user.uid,
        playlistId: playlist.id,
        watchedAt: serverTimestamp(),
        watchDuration: watchDuration || 0,
        completed: completed || false,
        isRewatch: isRewatch,
        eventType,
      }

      if (progressPercentage !== undefined) {
        eventData.progressPercentage = progressPercentage
      }

      await addDoc(collection(db, "videoWatchEvents"), eventData)
    } catch (error) {
      console.error("Error logging video event:", error)
    }
  }

  const playNextVideo = () => {
    if (!playlist || !playlist.videos || !Array.isArray(playlist.videos) || playlist.videos.length === 0) return

    const nextIndex = currentVideoIndex + 1
    if (nextIndex < playlist.videos.length) {
      const nextVideoId = playlist.videos[nextIndex].id
      if (videoWatchEvents[nextVideoId] !== null || isAdmin) {
        videoChangeRef.current = true
        setCurrentVideoIndex(nextIndex)
        setCurrentVideo(playlist.videos[nextIndex])
        setProgress(0)
        setCurrentTime(0)

        // Update URL without refreshing the page
        const newUrl = `/video-player?videoId=${nextVideoId}&playlistId=${playlist.id}`
        window.history.pushState({}, "", newUrl)

        // Update active module if needed
        if (modules && modules.length > 0) {
          const moduleIndex = modules.findIndex(
            (module) =>
              module.videos &&
              Array.isArray(module.videos) &&
              module.videos.some((video) => video && video.id === playlist.videos[nextIndex].id),
          )

          if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
            setActiveModuleIndex(moduleIndex)
          }
        }
      } else {
        toast({
          title: "Video Locked",
          description: "You need to watch the previous videos first",
          variant: "destructive",
        })
      }
    }
  }

  const playPreviousVideo = () => {
    if (!playlist || !playlist.videos || !Array.isArray(playlist.videos) || playlist.videos.length === 0) return

    const prevIndex = currentVideoIndex - 1
    if (prevIndex >= 0) {
      videoChangeRef.current = true
      setCurrentVideoIndex(prevIndex)
      setCurrentVideo(playlist.videos[prevIndex])
      setProgress(0)
      setCurrentTime(0)

      // Update URL without refreshing the page
      const newUrl = `/video-player?videoId=${playlist.videos[prevIndex].id}&playlistId=${playlist.id}`
      window.history.pushState({}, "", newUrl)

      // Update active module if needed
      if (modules && modules.length > 0) {
        const moduleIndex = modules.findIndex(
          (module) =>
            module.videos &&
            Array.isArray(module.videos) &&
            module.videos.some((video) => video && video.id === playlist.videos[prevIndex].id),
        )

        if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
          setActiveModuleIndex(moduleIndex)
        }
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !user || !playlist) return

    setSubmittingFeedback(true)
    try {
      // Save feedback to Firestore
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        userEmail: user.email,
        feedback,
        playlistId: playlist.id,
        createdAt: serverTimestamp(),
      })

      setSubmittingFeedback(false)
      setFeedback("")
      setFeedbackOpen(false)

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      })

      // Redirect to thank you page
      router.push("/thank-you")
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setSubmittingFeedback(false)

      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitVideoFeedback = async () => {
    if (!currentVideo || !user || videoFeedback.rating === 0) return

    setSubmittingVideoFeedback(true)
    try {
      // Save video feedback to Firestore
      await addDoc(collection(db, "videoFeedback"), {
        userId: user.uid,
        userEmail: user.email,
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        rating: videoFeedback.rating,
        comment: videoFeedback.comment,
        createdAt: serverTimestamp(),
      })

      // Update video analytics with new rating
      try {
        const videoAnalyticsRef = collection(db, "videoAnalytics")
        const q = query(videoAnalyticsRef, where("videoId", "==", currentVideo.id))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const analyticsDoc = querySnapshot.docs[0]
          const analyticsData = analyticsDoc.data()

          // Calculate new average rating
          const currentRatingCount = analyticsData.ratingCount || 0
          const currentAvgRating = analyticsData.averageRating || 0

          const newRatingCount = currentRatingCount + 1
          const newAvgRating = (currentAvgRating * currentRatingCount + videoFeedback.rating) / newRatingCount

          // Update the document
          await updateDoc(analyticsDoc.ref, {
            averageRating: newAvgRating,
            ratingCount: newRatingCount,
          })
        }
      } catch (error) {
        console.error("Error updating video rating:", error)
      }

      setSubmittingVideoFeedback(false)
      setVideoFeedback({ rating: 0, comment: "" })
      setVideoFeedbackOpen(false)

      toast({
        title: "Thank you!",
        description: "Your feedback on this video has been submitted.",
      })
    } catch (error) {
      console.error("Error submitting video feedback:", error)
      setSubmittingVideoFeedback(false)

      toast({
        title: "Error",
        description: "Failed to submit video feedback. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const isVideoPlayable = (index: number) => {
    if (
      !playlist ||
      !playlist.videos ||
      !Array.isArray(playlist.videos) ||
      playlist.videos.length === 0 ||
      index < 0 ||
      index >= playlist.videos.length
    )
      return false

    const video = playlist.videos[index]
    if (!video || !video.id) return false

    // Admin can play any video
    if (isAdmin) return true

    return videoWatchEvents[video.id] !== null
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const playVideoFromModule = (moduleIndex: number, videoIndex: number) => {
    if (!playlist || !modules || moduleIndex < 0 || moduleIndex >= modules.length) return

    const module = modules[moduleIndex]
    if (!module.videos || !Array.isArray(module.videos) || videoIndex < 0 || videoIndex >= module.videos.length) return

    const video = module.videos[videoIndex]
    if (!video || !video.id) return

    const playlistIndex =
      playlist.videos && Array.isArray(playlist.videos) ? playlist.videos.findIndex((v) => v && v.id === video.id) : -1

    if (playlistIndex !== -1 && (isVideoPlayable(playlistIndex) || isAdmin)) {
      videoChangeRef.current = true
      setCurrentVideoIndex(playlistIndex)
      setCurrentVideo(playlist.videos[playlistIndex])
      setProgress(0)
      setCurrentTime(0)
      setActiveModuleIndex(moduleIndex)

      // Update URL without refreshing the page
      const newUrl = `/video-player?videoId=${video.id}&playlistId=${playlist.id}`
      window.history.pushState({}, "", newUrl)
    } else {
      toast({
        title: "Video Locked",
        description: "You need to watch the previous videos first",
        variant: "destructive",
      })
    }
  }

  // Admin function to skip to the end of the video
  const handleSkipToEnd = () => {
    if (videoRef.current && currentVideo) {
      // Set current time to near the end of the video
      videoRef.current.currentTime = videoRef.current.duration - 0.5
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!playlist || !currentVideo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Video Not Found</h1>
          <p className="text-gray-300 mb-6">The requested video or playlist could not be found.</p>
          <Button onClick={() => router.push("/dashboard")} className="bg-primary hover:bg-primary/90">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <header className="border-b border-gray-700 sticky top-0 z-10 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Logo width={120} height={40} />
          </Link>
          <div className="flex items-center gap-4">
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

      <main className="flex-1 container py-6 px-4 max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">{currentVideo.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {currentVideo.category && <Badge variant="outline">{currentVideo.category}</Badge>}
            {currentVideo.tags &&
              currentVideo.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div ref={playerContainerRef} className="relative aspect-video bg-black">
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    src={currentVideo.videoUrl}
                    poster={currentVideo.thumbnail}
                    className="w-full h-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleVideoTimeUpdate}
                    playsInline
                    controlsList="nodownload"
                  />

                  {/* Custom Controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/30 mb-4 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Play/Pause Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>

                        {/* Previous Video Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={playPreviousVideo}
                          disabled={currentVideoIndex === 0}
                        >
                          <SkipBack className="h-5 w-5" />
                        </Button>

                        {/* Next Video Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={playNextVideo}
                          disabled={
                            !playlist?.videos ||
                            !Array.isArray(playlist.videos) ||
                            currentVideoIndex === playlist.videos.length - 1 ||
                            (!isAdmin && !isVideoPlayable(currentVideoIndex + 1))
                          }
                        >
                          <SkipForward className="h-5 w-5" />
                        </Button>

                        {/* Mute Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={toggleMute}
                        >
                          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </Button>

                        {/* Time Display */}
                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Admin Skip Button */}
                        {isAdmin && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-white hover:bg-white/20"
                                  onClick={handleSkipToEnd}
                                >
                                  <FastForward className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Skip to End (Admin Only)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Fullscreen Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={toggleFullscreen}
                        >
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Feedback Section */}
            <Card className="mt-4 bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Rate this video</h3>
                  <Button variant="outline" size="sm" onClick={() => setVideoFeedbackOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Provide Feedback
                  </Button>
                </div>
                <div className="flex items-center mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        videoFeedback.rating >= star ? "text-yellow-500 fill-yellow-500" : "text-gray-400"
                      }`}
                      onClick={() => setVideoFeedback({ ...videoFeedback, rating: star })}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-300">
                    {videoFeedback.rating > 0 ? `${videoFeedback.rating}/5` : "Rate this video"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modules and Videos */}
          <div>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-white">Learning Modules</h2>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={activeModuleIndex !== null ? `module-${activeModuleIndex}` : undefined}
                    className="w-full"
                  >
                    {modules.map((module, moduleIndex) => (
                      <AccordionItem key={moduleIndex} value={`module-${moduleIndex}`} className="border-gray-700">
                        <AccordionTrigger className="hover:no-underline text-white">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{module.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {module.videos.length} videos
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-2">
                            {module.videos.map((video, videoIndex) => {
                              const playlistIndex = playlist.videos.findIndex((v) => v.id === video.id)
                              const isCurrentVideo = currentVideo.id === video.id
                              const isWatched = videoWatchEvents[video.id] === true
                              const isPlayable =
                                isAdmin || (playlistIndex !== -1 ? isVideoPlayable(playlistIndex) : false)

                              return (
                                <div
                                  key={video.id}
                                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                    isCurrentVideo
                                      ? "bg-primary/10 border border-primary/30"
                                      : isPlayable
                                        ? "hover:bg-gray-700 cursor-pointer"
                                        : "opacity-50 cursor-not-allowed"
                                  }`}
                                  onClick={() => {
                                    if (isPlayable && !isCurrentVideo) {
                                      playVideoFromModule(moduleIndex, videoIndex)
                                    }
                                  }}
                                >
                                  <div className="relative w-20 h-12 flex-shrink-0 bg-gray-700 rounded overflow-hidden">
                                    {video.thumbnail ? (
                                      <Image
                                        src={video.thumbnail || "/placeholder.svg"}
                                        width={40}
                                        height={40}
                                        alt={video.title}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <Play className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                    {isWatched && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      </div>
                                    )}
                                    {!isPlayable && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Lock className="h-4 w-4 text-gray-400" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate text-white">{video.title}</p>
                                    <p className="text-xs text-gray-400">{video.duration}</p>
                                  </div>

                                  {isCurrentVideo && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <Play className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Video Feedback Dialog */}
      <Dialog open={videoFeedbackOpen} onOpenChange={setVideoFeedbackOpen}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Video Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Rate this video</h3>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${
                      videoFeedback.rating >= star ? "text-yellow-500 fill-yellow-500" : "text-gray-400"
                    }`}
                    onClick={() => setVideoFeedback({ ...videoFeedback, rating: star })}
                  />
                ))}
                <span className="ml-2 text-sm">
                  {videoFeedback.rating > 0 ? `${videoFeedback.rating}/5` : "Select rating"}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="video-comment">Comments (optional)</Label>
              <Textarea
                id="video-comment"
                placeholder="What did you think about this video? Any suggestions for improvement?"
                value={videoFeedback.comment}
                onChange={(e) => setVideoFeedback({ ...videoFeedback, comment: e.target.value })}
                rows={4}
                className="resize-none mt-2 bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoFeedbackOpen(false)}>
              Skip
            </Button>
            <Button
              onClick={handleSubmitVideoFeedback}
              disabled={videoFeedback.rating === 0 || submittingVideoFeedback}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingVideoFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Playlist Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="What did you think about the videos? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none bg-gray-700 border-gray-600"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || submittingFeedback}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
