"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  Info,
  ArrowLeft,
  Lock,
  CheckCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Logo } from "../components/logo"
import { auth, db } from "../firebase"
import { ThemeToggle } from "../theme-toggle"

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
interface VideoWatchEvent {
  videoId: string;
  playlistId?: string;
  userId: string;
  userEmail: string;
  lastWatchedAt: any; // Firebase timestamp
  progress: number; // Percentage of video watched (0-100)
  completed: boolean;
  watchDuration: number; // Total time spent watching in seconds
  milestones: number[]; // Array of reached milestones (25, 50, 75, 100)
  category?: string;
  tags?: string[];
  videoTitle?: string;
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

// Define an interface for the document data
interface VideoWatchEvent {
  videoId: string
  playlistId?: string
  watchedAt: any
  // Add other properties as needed
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
  const [videoInfoOpen, setVideoInfoOpen] = useState(false)
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null)
  const [videoWatchEvents, setVideoWatchEvents] = useState<Record<string, boolean | null>>({})
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({})
  const [videoProgressMilestones, setVideoProgressMilestones] = useState<Record<string, number[]>>({})
  const [modules, setModules] = useState<Module[]>([])
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null)
  const [userProfessions, setUserProfessions] = useState<string[]>([])
  const [lastWatchedVideoId, setLastWatchedVideoId] = useState<string | null>(null)

  const [videoRating, setVideoRating] = useState<number | null>(null)
  const [videoFeedback, setVideoFeedback] = useState("")
  const [videoFeedbackOpen, setVideoFeedbackOpen] = useState(false)
  const [submittingVideoFeedback, setSubmittingVideoFeedback] = useState(false)
  const [videoFeedbacks, setVideoFeedbacks] = useState<any[]>([])
  const [showVideoFeedbacks, setShowVideoFeedbacks] = useState(false)

  // Add playbackRate state and handlers
  const [playbackRate, setPlaybackRate] = useState(1)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)

  const [volume, setVolume] = useState(100)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeSliderRef = useRef<HTMLDivElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const videoChangeRef = useRef<boolean>(false)
  const [isHovered, setIsHovered] = useState(false)

  // Add these state variables at the top with other state declarations
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [lastPosition, setLastPosition] = useState(0);

  // Initialize volume and mute state from localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem("videoPlayerVolume")
    const savedMuted = localStorage.getItem("videoPlayerMuted")
    if (savedVolume !== null) {
      setVolume(Number(savedVolume))
    }
    if (savedMuted !== null) {
      setIsMuted(savedMuted === "true")
    }
  }, [])

  // Persist volume to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("videoPlayerVolume", String(volume))
  }, [volume])

  // Persist mute state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("videoPlayerMuted", String(isMuted))
  }, [isMuted])

  // When volume or mute changes, update the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  // When a new video loads, apply the persisted volume/mute state
  useEffect(() => {
    if (videoRef.current) {
      const savedVolume = localStorage.getItem("videoPlayerVolume")
      const savedMuted = localStorage.getItem("videoPlayerMuted")
      videoRef.current.volume = savedVolume !== null ? Number(savedVolume) / 100 : volume / 100
      videoRef.current.muted = savedMuted !== null ? savedMuted === "true" : isMuted
    }
  }, [currentVideo])

  // 5-second rewind handler
  const handleRewind5Seconds = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Debug: Check all categories in database
        await debugCategories()

        // Fetch last watched video if no specific videoId is provided
        if (!videoId) {
          const lastWatched = await fetchLastWatchedVideo(currentUser.uid)
          if (lastWatched) {
            setLastWatchedVideoId(lastWatched.videoId)
            // If we have a playlistId, use it, otherwise fetch the video directly
            if (playlistId) {
              fetchPlaylist(playlistId, lastWatched.videoId)
              fetchWatchHistory()
            } else {
              // Redirect to the video player with the last watched video
              router.push(
                `/video-player?videoId=${lastWatched.videoId}${playlistId ? `&playlistId=${playlistId}` : ""}`,
              )
            }
          } else if (playlistId) {
            // If no last watched video but we have a playlistId, fetch the playlist
            fetchPlaylist(playlistId)
            fetchWatchHistory()
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
    if (playlist && user) {
      fetchWatchHistory()
    }
  }, [playlist, user])

  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      unlockNextVideoIfNeeded(currentVideo.id)
    }
  }, [videoWatchEvents, currentVideo])

  // Fetch the last watched video for a user
  const fetchLastWatchedVideo = async (userId: string) => {
    try {
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId)
      );
  
      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
  
      if (watchHistorySnapshot.empty) return null;
  
      // Explicitly type the mapped data
      const sortedEvents = watchHistorySnapshot.docs
        .map((doc) => ({
          ...(doc.data() as VideoWatchEvent),
          id: doc.id,
          lastWatchedAt: doc.data().lastWatchedAt?.toDate() || new Date(0),
        }))
        .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
  
      if (sortedEvents.length > 0) {
        return {
          videoId: sortedEvents[0].videoId,
          playlistId: sortedEvents[0].playlistId,
        };
      }
  
      return null;
    } catch (error) {
      console.error("Error fetching last watched video:", error);
      return null;
    }
  };
  

  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      checkAndSetVideoWatched(currentVideo.id)
    }
  }, [currentVideo])

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
    if (playlist?.videos && Array.isArray(playlist.videos) && playlist.videos.length > 0 && videoId) {
      const index = playlist.videos.findIndex((v) => v.id === videoId)

      // Guard against invalid videoId
      if (index === -1) {
        // If videoId not found, start with the first video
        videoChangeRef.current = true
        setCurrentVideoIndex(0)
        setCurrentVideo(playlist.videos[0])

        // Update URL to reflect the first video
        const newUrl = `/video-player?videoId=${playlist.videos[0].id}&playlistId=${playlistId}`
        window.history.pushState({}, "", newUrl)
      } else if (currentVideo?.id !== videoId || currentVideoIndex !== index) {
        // Only update state if video changed
        videoChangeRef.current = true
        setCurrentVideoIndex(index)
        setCurrentVideo(playlist.videos[index])
      }
    }
  }, [playlist, videoId, currentVideo?.id, currentVideoIndex, router, playlistId])

  // Add cleanup for safety
  useEffect(() => {
    return () => {
      // Reset video states on unmount
      setCurrentVideoIndex(0)
      setCurrentVideo(null)
    }
  }, [])

  // Modify the loadVideoProgress function
  const loadVideoProgress = async (videoId: string) => {
    if (!user || !videoId) return 0;

    try {
      console.log('Loading video progress for:', videoId);
      const watchEventsRef = collection(db, "videoWatchEvents");
      const q = query(
        watchEventsRef,
        where("userId", "==", user.uid),
        where("videoId", "==", videoId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log('Found saved progress:', data);
        return data.lastPosition || 0;
      }
      console.log('No saved progress found');
      return 0;
    } catch (error) {
      console.error("Error loading video progress:", error);
      return 0;
    }
  };

  // Add these new functions
  const handleResume = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = lastPosition;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setWatchStartTime(Date.now() / 1000);
          videoChangeRef.current = false;
        })
        .catch((error) => {
          console.error("Error playing video:", error);
        });
    }
    setShowResumeDialog(false);
  };

  const handleStartFromBeginning = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setWatchStartTime(Date.now() / 1000);
          videoChangeRef.current = false;
        })
        .catch((error) => {
          console.error("Error playing video:", error);
        });
    }
    setShowResumeDialog(false);
  };

  // Modify the useEffect that handles video changes
  useEffect(() => {
    if (currentVideo && videoRef.current && videoChangeRef.current) {
      console.log('Video changed, loading progress...');
      // Reset video state
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Reset mute state
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
      
      // Reset playback rate
      setPlaybackRate(1);
      if (videoRef.current) {
        videoRef.current.playbackRate = 1;
      }

      // Load and restore video progress
      const loadProgress = async () => {
        try {
          const savedPosition = await loadVideoProgress(currentVideo.id);
          console.log('Loaded saved position:', savedPosition);
          
          if (savedPosition > 0) {
            setLastPosition(savedPosition);
            setShowResumeDialog(true);
          } else {
            // If no saved position, just show the video
            videoRef.current?.load();
          }
          
          videoChangeRef.current = false;
        } catch (error) {
          console.error("Error loading video progress:", error);
          videoRef.current?.load();
        }
      };

      loadProgress();
    }
  }, [currentVideo]);

  // Add this new function to fetch videos directly from Firestore
  const fetchCategoryVideos = async (category: string) => {
    if (!user) return []

    try {
      // Fetch videos from Firestore with the specified category
      const videosCollection = collection(db, "videos")
      const q = query(videosCollection, where("category", "==", category))

      const videoSnapshot = await getDocs(q)
      const videoList = videoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        thumbnail: doc.data().publicId
          ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${doc.data().publicId}.jpg`
          : "/placeholder.svg?height=180&width=320",
        description: doc.data().description || "No description available",
        category: doc.data().category || "Uncategorized",
      })) as Video[]

      console.log(`Fetched ${videoList.length} videos for category: ${category}`)
      return videoList
    } catch (error) {
      console.error(`Error fetching ${category} videos:`, error)
      return []
    }
  }

  // Debug function to check all available categories
  const debugCategories = async () => {
    if (!user) return

    try {
      const videosCollection = collection(db, "videos")
      const videoSnapshot = await getDocs(videosCollection)
      
      const categories = new Set<string>()
      videoSnapshot.docs.forEach((doc) => {
        const category = doc.data().category
        if (category) {
          categories.add(category)
        }
      })
      
      console.log("All available categories in database:", Array.from(categories))
      
      // Check for AI tools specifically
      const aiToolsVideos = videoSnapshot.docs.filter((doc) => {
        const category = doc.data().category
        return category && (category.toLowerCase().includes('ai') || category.toLowerCase().includes('artificial'))
      })
      
      console.log("Videos with AI-related categories:", aiToolsVideos.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        category: doc.data().category
      })))
    } catch (error) {
      console.error("Error debugging categories:", error)
    }
  }

  const organizeIntoModules = async (videos: Video[]) => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) return

    // Create modules array
    const moduleArray: Module[] = []

    // Group videos by category
    const videosByCategory = videos.reduce(
      (acc, video) => {
        const category = video.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(video)
        return acc
      },
      {} as Record<string, Video[]>,
    )

    // Debug: Log all categories found
    console.log("Available categories:", Object.keys(videosByCategory))
    console.log("AI tools videos:", videosByCategory["AI tools"] || [])
    console.log("Total videos in playlist:", videos.length)

    // 1. Always add Company Introduction module first
    moduleArray.push({
      name: "Company Introduction",
      category: "Company Introduction",
      videos: videosByCategory["Company Introduction"] || [],
    })

    // 2. Add user profession modules
    console.log("User professions:", userProfessions)
    userProfessions.forEach((profession) => {
      if (videosByCategory[profession]) {
        moduleArray.push({
          name: profession,
          category: profession,
          videos: videosByCategory[profession],
        })
        console.log("Added profession module:", profession)
      }
    })

    // 3. Add other categories as modules (except Company Introduction, Miscellaneous, and AI tools)
    Object.entries(videosByCategory).forEach(([category, categoryVideos]) => {
      if (category !== "Company Introduction" && category !== "Miscellaneous" && category !== "AI tools") {
        moduleArray.push({
          name: category,
          category,
          videos: categoryVideos,
        })
      }
    })

    // 4. Always add Miscellaneous module before AI tools
    moduleArray.push({
      name: "Miscellaneous",
      category: "Miscellaneous",
      videos: videosByCategory["Miscellaneous"] || [],
    })

    // 5. Always add AI tools module last - check for various AI-related categories
    const aiToolsVideos = videosByCategory["AI tools"] || 
                         videosByCategory["AI Tools"] || 
                         videosByCategory["ai tools"] ||
                         videosByCategory["Artificial Intelligence"] ||
                         videosByCategory["artificial intelligence"] ||
                         []
    
    // Always add AI tools module for testing, even if empty
    moduleArray.push({
      name: "AI tools",
      category: "AI tools",
      videos: aiToolsVideos,
    })
    
    if (aiToolsVideos.length > 0) {
      console.log("AI tools module created with", aiToolsVideos.length, "videos")
    } else {
      console.log("AI tools module created with 0 videos (for testing)")
    }

    setModules(moduleArray)

    // Set active module based on current video
    if (currentVideo) {
      const moduleIndex = moduleArray.findIndex((module) => module.videos.some((video) => video.id === currentVideo.id))

      if (moduleIndex !== -1) {
        setActiveModuleIndex(moduleIndex)
      }
    }
  }

  // Update the fetchPlaylist function to use the async organizeIntoModules
  const fetchPlaylist = async (id: string, initialVideoId?: string) => {
    try {
      setLoading(true)

      // Check if this is a special "all-videos" playlist from localStorage
      if (id === "custom-playlist") {
        const storedPlaylist = localStorage.getItem("currentPlaylist")
        if (storedPlaylist) {
          try {
            const playlistData = JSON.parse(storedPlaylist) as Playlist

            // Validate the playlist data
            if (!playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) {
              throw new Error("Invalid playlist data: missing or empty videos array")
            }

            setPlaylist(playlistData)

            // Debug: Log playlist data
            console.log("Playlist data:", playlistData)
            console.log("Videos in playlist:", playlistData.videos)

            // Organize videos into modules (now async)
            await organizeIntoModules(playlistData.videos)

            // Initialize watch events
            await initializeWatchEvents(playlistData, initialVideoId)
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
      const docRef = doc(db, "playlists", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const playlistData = { id: docSnap.id, ...docSnap.data() } as Playlist

        // Validate the playlist data
        if (!playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) {
          throw new Error("Invalid playlist data: missing or empty videos array")
        }

        setPlaylist(playlistData)

        // Debug: Log playlist data
        console.log("Playlist data:", playlistData)
        console.log("Videos in playlist:", playlistData.videos)

        // Organize videos into modules (now async)
        await organizeIntoModules(playlistData.videos)

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
  }

  const initializeWatchEvents = async (playlistData: Playlist, initialVideoId?: string) => {
    if (!user || !playlistData.videos || !Array.isArray(playlistData.videos) || playlistData.videos.length === 0) return

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
        let lastUnlockedIndex = 0
        for (let i = 0; i < playlistData.videos.length; i++) {
          const videoId = playlistData.videos[i].id

          // If this video is watched, update lastUnlockedIndex
          if (watchEvents[videoId] === true) {
            lastUnlockedIndex = i + 1
          }

          // Unlock videos up to lastUnlockedIndex
          if (i <= lastUnlockedIndex && watchEvents[videoId] === null) {
            watchEvents[videoId] = false // Unlocked but not watched
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
      }
    } catch (error) {
      console.error("Error initializing watch events:", error)
    }
  }

  const findAndSetFirstPlayableVideo = (videos: Video[], watchEvents: Record<string, boolean | null>) => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) return

    // First try to find an unlocked but unwatched video
    const unwatchedIndex = videos.findIndex((v) => watchEvents[v.id] === false)
    if (unwatchedIndex !== -1) {
      setCurrentVideoIndex(unwatchedIndex)
      setCurrentVideo(videos[unwatchedIndex])
      return
    }

    // If no unwatched videos, find the first watched video
    const watchedIndex = videos.findIndex((v) => watchEvents[v.id] === true)
    if (watchedIndex !== -1) {
      setCurrentVideoIndex(watchedIndex)
      setCurrentVideo(videos[watchedIndex])
      return
    }

    // If all videos are locked except the first one, start with the first one
    if (watchEvents[videos[0].id] === false) {
      setCurrentVideoIndex(0)
      setCurrentVideo(videos[0])
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

        // Reset watch start time
        setWatchStartTime(null)

        // Track video pause in Google Analytics
      }
    }
  }

  const handleVideoEnded = () => {
    if (!currentVideo || !playlist || !playlist.videos || !Array.isArray(playlist.videos)) return;
  
    setIsPlaying(false);
  
    // Calculate final watch duration for analytics
    if (watchStartTime) {
      const watchDuration = Date.now() / 1000 - watchStartTime;
  
      // Mark current video as watched
      const updatedWatchEvents = { ...videoWatchEvents };
      updatedWatchEvents[currentVideo.id] = true;
  
      // Unlock the next video if it exists and is currently locked
      if (currentVideoIndex + 1 < playlist.videos.length) {
        const nextVideoId = playlist.videos[currentVideoIndex + 1].id;
        if (updatedWatchEvents[nextVideoId] === null) {
          updatedWatchEvents[nextVideoId] = false; // Unlock but not watched
        }
      }
  
      setVideoWatchEvents(updatedWatchEvents);
  
      // Check if we've already logged a completion event for this video in this session
      const sessionKey = `completed_${currentVideo.id}`;
      const alreadyCompleted = sessionStorage.getItem(sessionKey);
  
      if (!alreadyCompleted) {
        // Log completion event to Firestore
        logVideoEvent("completion", false, watchDuration, true, 100);
  
        // Mark this video as completed in this session
        sessionStorage.setItem(sessionKey, "true");
      }
  
      // Reset watch start time
      setWatchStartTime(null);
  
      // Auto play next video if available
      if (currentVideoIndex + 1 < playlist.videos.length) {
        const nextIndex = currentVideoIndex + 1;
        const nextVideoId = playlist.videos[nextIndex].id;
  
        if (updatedWatchEvents[nextVideoId] !== null) {
          videoChangeRef.current = true;
          setCurrentVideoIndex(nextIndex);
          setCurrentVideo(playlist.videos[nextIndex]);
  
          // Clear session storage for the previous video to allow a fresh document
          // for the next video when it's watched
          sessionStorage.removeItem(`played_${currentVideo.id}`);
          sessionStorage.removeItem(`completed_${currentVideo.id}`);
          
          // Update URL without refreshing the page
          const newUrl = `/video-player?videoId=${nextVideoId}&playlistId=${playlist.id}`;
          window.history.pushState({}, "", newUrl);
  
          // Update active module if needed
          if (modules.length > 0) {
            const moduleIndex = modules.findIndex((module) =>
              module.videos.some((video) => video.id === playlist.videos[nextIndex].id)
            );
  
            if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
              setActiveModuleIndex(moduleIndex);
            }
          }
        } else {
          // Show feedback dialog when playlist is completed
          setFeedbackOpen(true);
        }
      } else {
        // Show feedback dialog when playlist is completed
        setFeedbackOpen(true);
      }
    }
  };
  
  

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

        // Don't log rewatch event here - it will be logged on play if needed
      }
    } catch (error) {
      console.error("Error checking watch status:", error)
    }
  }

  // Fetch watch history for all videos
  const fetchWatchHistory = async () => {
    if (!user || !playlist || !playlist.videos || !Array.isArray(playlist.videos)) return;
  
    try {
      // Query Firestore for all video watch events by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", user.uid)
      );
  
      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
      
      if (watchHistorySnapshot.empty) return;
      
      // Create a map of videoId to completion status
      const videoCompletionMap: { [videoId: string]: boolean } = {};
      watchHistorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        videoCompletionMap[data.videoId] = data.completed || data.progress >= 100;
      });
  
      // Create a new watch events object
      const updatedWatchEvents = { ...videoWatchEvents };
  
      // Mark all watched videos
      playlist.videos.forEach((video) => {
        if (videoCompletionMap[video.id]) {
          updatedWatchEvents[video.id] = true;
        }
      });
  
      // Unlock videos after watched ones in sequence
      let lastUnlockedIndex = 0;
      for (let i = 0; i < playlist.videos.length; i++) {
        const videoId = playlist.videos[i].id;
  
        // If this video is watched, update lastUnlockedIndex
        if (updatedWatchEvents[videoId] === true) {
          lastUnlockedIndex = i + 1;
        }
        
        // Unlock videos up to lastUnlockedIndex
        if (i <= lastUnlockedIndex && updatedWatchEvents[videoId] === null) {
          updatedWatchEvents[videoId] = false; // Unlocked but not watched
        }
      }
  
      // Update state
      setVideoWatchEvents(updatedWatchEvents);
    } catch (error) {
      console.error("Error fetching watch history:", error);
    }
  };
  
 

  const fetchVideoFeedbacks = async (videoId: string) => {
    if (!user || !videoId) return

    try {
      const feedbackQuery = query(
        collection(db, "videoFeedbacks"),
        where("videoId", "==", videoId),
        orderBy("createdAt", "desc"),
      )

      const feedbackSnapshot = await getDocs(feedbackQuery)
      const feedbacks = feedbackSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))

      setVideoFeedbacks(feedbacks)
    } catch (error) {
      console.error("Error fetching video feedbacks:", error)
    }
  }

  // Add this to the useEffect that runs when playlist is loaded
  useEffect(() => {
    if (playlist && user) {
      fetchWatchHistory()
    }
  }, [playlist, user])

  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      fetchVideoFeedbacks(currentVideo.id)
    }
  }, [currentVideo])

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && currentVideo) {
      const current = videoRef.current.currentTime;
      const videoDuration = videoRef.current.duration;
  
      // Update progress state
      setCurrentTime(current);
      setDuration(videoDuration);
      const currentProgressPercentage = Math.floor((current / videoDuration) * 100);
      setProgress(currentProgressPercentage);
  
      // Save progress every 2 seconds instead of 5
      if (current % 2 < 0.1) { // Save roughly every 2 seconds
        saveVideoProgress(current);
      }
  
      // Update video progress for this specific video
      setVideoProgress((prev) => ({
        ...prev,
        [currentVideo.id]: currentProgressPercentage,
      }));
  
      // Track progress milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      const currentMilestone = Math.floor(currentProgressPercentage / 25) * 25;
  
      if (
        milestones.includes(currentMilestone) &&
        (!videoProgressMilestones[currentVideo.id] ||
          !videoProgressMilestones[currentVideo.id].includes(currentMilestone))
      ) {
        // Update tracked milestones
        setVideoProgressMilestones((prev) => {
          const updatedMilestones = { ...prev };
          if (!updatedMilestones[currentVideo.id]) {
            updatedMilestones[currentVideo.id] = [];
          }
          updatedMilestones[currentVideo.id] = [...updatedMilestones[currentVideo.id], currentMilestone];
          return updatedMilestones;
        });
  
        // Check if we've already logged this milestone in this session
        const sessionKey = `milestone_${currentVideo.id}_${currentMilestone}`;
        const alreadyTracked = sessionStorage.getItem(sessionKey);
  
        if (!alreadyTracked) {
          // Log milestone event with a valid progressPercentage
          logVideoEvent("milestone", false, current, currentMilestone === 100, currentMilestone);
  
          // Mark this milestone as tracked in this session
          sessionStorage.setItem(sessionKey, "true");
          
          // If this is 100% completion, create a new document for the next watch
          if (currentMilestone === 100) {
            sessionStorage.removeItem(`completed_${currentVideo.id}`);
          }
        }
      }
    }
  };
  
  // Add this new function to save video progress
  const saveVideoProgress = async (currentTime: number) => {
    if (!user || !currentVideo || !currentVideo.id) return;

    try {
      console.log('Saving video progress:', { currentTime, videoId: currentVideo.id });
      const watchEventsRef = collection(db, "videoWatchEvents");
      const q = query(
        watchEventsRef,
        where("userId", "==", user.uid),
        where("videoId", "==", currentVideo.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      const progressData = {
        lastWatchedAt: serverTimestamp(),
        lastPosition: currentTime,
        progress: Math.floor((currentTime / duration) * 100),
        videoId: currentVideo.id,
        userId: user.uid,
        userEmail: user.email || "Unknown User",
        playlistId: playlist?.id,
        videoTitle: currentVideo.title,
        category: currentVideo.category,
        tags: currentVideo.tags
      };

      if (!querySnapshot.empty) {
        // Update existing document
        const docRef = doc(db, "videoWatchEvents", querySnapshot.docs[0].id);
        await updateDoc(docRef, progressData);
        console.log('Updated existing progress document');
      } else {
        // Create new document
        await addDoc(watchEventsRef, progressData);
        console.log('Created new progress document');
      }
    } catch (error) {
      console.error("Error saving video progress:", error);
    }
  };
  
  const logVideoEvent = async (
    eventType: string,
    isRewatch: boolean,
    watchDuration?: number,
    completed?: boolean,
    progressPercentage?: number,
  ) => {
    if (!currentVideo || !user || !playlist) return;
  
    try {
      // First, check if a document already exists for this video and user
      const watchEventsRef = collection(db, "videoWatchEvents");
      const q = query(
        watchEventsRef,
        where("userId", "==", user.uid),
        where("videoId", "==", currentVideo.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Prepare the event data to update
      const eventData: any = {
        lastWatchedAt: serverTimestamp(),
        eventType, // Keep track of the latest event type
      };
      
      // Add watch duration (accumulate it if document exists)
      if (watchDuration) {
        eventData.watchDuration = watchDuration + 
          (querySnapshot.empty ? 0 : (querySnapshot.docs[0].data().watchDuration || 0));
      }
      
      // Update progress if provided and it's higher than existing progress
      if (progressPercentage !== undefined) {
        eventData.progress = Math.max(
          progressPercentage, 
          querySnapshot.empty ? 0 : (querySnapshot.docs[0].data().progress || 0)
        );
      }
      
      // Handle completion status
      if (completed) {
        eventData.completed = true;
        eventData.progress = 100;
      }
      
      // Track video metadata
      eventData.videoTitle = currentVideo.title || "Unknown Video";
      eventData.category = currentVideo.category || "Uncategorized";
      eventData.tags = currentVideo.tags || [];
      
      // Handle milestones (25%, 50%, 75%, 100%)
      if (progressPercentage !== undefined && progressPercentage % 25 === 0) {
        const currentMilestones = querySnapshot.empty ? [] : (querySnapshot.docs[0].data().milestones || []);
        if (!currentMilestones.includes(progressPercentage)) {
          eventData.milestones = [...currentMilestones, progressPercentage];
        }
      }
      
      // If document exists, update it
      if (!querySnapshot.empty) {
        const docRef = doc(db, "videoWatchEvents", querySnapshot.docs[0].id);
        await updateDoc(docRef, eventData);
      } 
      // If document doesn't exist, create a new one
      else {
        await addDoc(watchEventsRef, {
          videoId: currentVideo.id,
          userId: user.uid,
          userEmail: user.email || "Unknown User",
          playlistId: playlist.id,
          progress: progressPercentage || 0,
          completed: completed || false,
          isRewatch: isRewatch,
          milestones: progressPercentage && progressPercentage % 25 === 0 ? [progressPercentage] : [],
          firstWatchedAt: serverTimestamp(),
          ...eventData
        });
      }
    } catch (error) {
      console.error("Error logging video event:", error);
    }
  };
  
  

  const playNextVideo = () => {
    if (
      !playlist ||
      !playlist.videos ||
      !Array.isArray(playlist.videos) ||
      playlist.videos.length === 0 ||
      !currentVideo
    )
      return

    const nextIndex = currentVideoIndex + 1
    if (nextIndex < playlist.videos.length) {
      const nextVideoId = playlist.videos[nextIndex].id
      const currentVideoWatched = videoWatchEvents[currentVideo.id] === true

      // Check if the next video is unlocked OR if current video is watched
      if (videoWatchEvents[nextVideoId] === true || videoWatchEvents[nextVideoId] === false || currentVideoWatched) {
        // If current video is watched but next video is locked, unlock it
        if (currentVideoWatched && videoWatchEvents[nextVideoId] === null) {
          const updatedWatchEvents = { ...videoWatchEvents }
          updatedWatchEvents[nextVideoId] = false // Unlock but not watched
          setVideoWatchEvents(updatedWatchEvents)
        }

        videoChangeRef.current = true
        setCurrentVideoIndex(nextIndex)
        setCurrentVideo(playlist.videos[nextIndex])
        setProgress(0)
        setCurrentTime(0)

        // Update URL without refreshing the page
        const newUrl = `/video-player?videoId=${nextVideoId}&playlistId=${playlist.id}`
        window.history.pushState({}, "", newUrl)

        // Update active module if needed
        if (modules.length > 0) {
          const moduleIndex = modules.findIndex((module) =>
            module.videos.some((video) => video.id === playlist.videos[nextIndex].id),
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

  const unlockNextVideoIfNeeded = (videoId: string) => {
    if (!playlist || !playlist.videos) return

    const currentIndex = playlist.videos.findIndex((v) => v.id === videoId)
    if (currentIndex === -1 || currentIndex >= playlist.videos.length - 1) return

    const nextVideoId = playlist.videos[currentIndex + 1].id

    // Only update if the current video is watched and next video is locked
    if (videoWatchEvents[videoId] === true && videoWatchEvents[nextVideoId] === null) {
      const updatedWatchEvents = { ...videoWatchEvents }
      updatedWatchEvents[nextVideoId] = false // Unlock but not watched
      setVideoWatchEvents(updatedWatchEvents)
    }
  }

  const playPreviousVideo = () => {
    if (!playlist || !playlist.videos || !Array.isArray(playlist.videos) || playlist.videos.length === 0) return

    const prevIndex = currentVideoIndex - 1
    if (prevIndex >= 0) {
      const prevVideoId = playlist.videos[prevIndex].id

      // Previous videos should always be unlocked
      videoChangeRef.current = true
      setCurrentVideoIndex(prevIndex)
      setCurrentVideo(playlist.videos[prevIndex])
      setProgress(0)
      setCurrentTime(0)

      // Update URL without refreshing the page
      const newUrl = `/video-player?videoId=${playlist.videos[prevIndex].id}&playlistId=${playlist.id}`
      window.history.pushState({}, "", newUrl)

      // Update active module if needed
      if (modules.length > 0) {
        const moduleIndex = modules.findIndex((module) =>
          module.videos.some((video) => video.id === playlist.videos[prevIndex].id),
        )

        if (moduleIndex !== -1 && moduleIndex !== activeModuleIndex) {
          setActiveModuleIndex(moduleIndex)
        }
      }

      //
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted
      videoRef.current.muted = newMuted
      setIsMuted(newMuted)
      // If unmuting and volume is 0, set to a default value (e.g., 20)
      if (!newMuted && volume === 0) {
        setVolume(20)
      }
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
        userEmail: user.email || "Unknown User",
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
    if (!videoFeedback.trim() || !user || !currentVideo) return

    setSubmittingVideoFeedback(true)
    try {
      // Save video feedback to Firestore
      await addDoc(collection(db, "videoFeedbacks"), {
        userId: user.uid,
        userEmail: user.email || "Unknown User",
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        rating: videoRating,
        feedback: videoFeedback,
        createdAt: serverTimestamp(),
      })

      setSubmittingVideoFeedback(false)
      setVideoFeedback("")
      setVideoRating(null)
      setVideoFeedbackOpen(false)

      // Refresh feedbacks
      fetchVideoFeedbacks(currentVideo.id)

      toast({
        title: "Thank you!",
        description: "Your feedback for this video has been submitted successfully.",
      })
    } catch (error) {
      console.error("Error submitting video feedback:", error)
      setSubmittingVideoFeedback(false)

      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
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
      index < 0 ||
      index >= playlist.videos.length
    ) {
      return false
    }

    const video = playlist.videos[index]
    return videoWatchEvents[video.id] === true || videoWatchEvents[video.id] === false
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const playVideoFromModule = (moduleIndex: number, videoIndex: number) => {
    if (
      !playlist ||
      !modules ||
      moduleIndex < 0 ||
      moduleIndex >= modules.length ||
      videoIndex < 0 ||
      videoIndex >= modules[moduleIndex].videos.length
    )
      return

    const video = modules[moduleIndex].videos[videoIndex]
    const playlistIndex = playlist.videos.findIndex((v) => v.id === video.id)

    if (playlistIndex !== -1 && isVideoPlayable(playlistIndex)) {
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

  // Function to handle playback rate change
  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  // Add this function to clear session tracking when changing videos
  const clearVideoSessionTracking = (videoId: string) => {
    // Clear all session storage keys related to the previous video
    const keysToRemove = [
      `played_${videoId}`,
      `completed_${videoId}`,
      `milestone_${videoId}_25`,
      `milestone_${videoId}_50`,
      `milestone_${videoId}_75`,
    ]

    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  }

  // Hide the slider when clicking outside
  useEffect(() => {
    if (!showVolumeSlider) return;
    function handleClick(e: MouseEvent) {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showVolumeSlider]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!playlist || !currentVideo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
          <p className="text-muted-foreground mb-6">The requested video or playlist could not be found.</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <img src="light.webp" height={40} width={120} alt="EOXS Logo" style={{objectFit: 'contain'}} />
        </Link>
          <div className="flex items-center gap-4">

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

      {/* Back Button */}
      <div className="container mt-4 mb-2">
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <main className="flex-1 container py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
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
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={playerContainerRef}
                  className="relative aspect-video bg-black"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    src={currentVideo.videoUrl}
                    poster={currentVideo.thumbnail || "/placeholder.svg?height=360&width=640"}
                    className="w-full h-full cursor-pointer"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onClick={() => (isPlaying ? handleVideoPause() : handleVideoPlay())}
                    onError={(e) => {
                      console.error("Video loading error:", e)
                      toast({
                        title: "Video Error",
                        description: "There was an error loading the video. Please try again later.",
                        variant: "destructive",
                      })
                    }}
                    playsInline
                    controlsList="nodownload"
                  />

                  {/* Custom Controls */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${isPlaying && !isHovered ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}
                  >
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/30 mb-4 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Play/Pause Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-white hover:bg-white/20 p-2 rounded cursor-pointer"
                          onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              isPlaying ? handleVideoPause() : handleVideoPlay();
                            }
                          }}
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </div>

                        {/* Rewind Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-white hover:bg-white/20 p-2 rounded cursor-pointer"
                          onClick={handleRewind5Seconds}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              handleRewind5Seconds();
                            }
                          }}
                        >
                          <img src="/rewind-double-arrow.png" alt="Rewind 5s" width="22" height="22" style={{ display: 'inline', verticalAlign: 'middle' }} />
                          <span className="ml-0.3 text-xs text-white">5s</span>
                        </div>

                        {/* Previous Video Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className={`text-white hover:bg-white/20 p-2 rounded cursor-pointer ${currentVideoIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={currentVideoIndex === 0 ? undefined : playPreviousVideo}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && currentVideoIndex !== 0) {
                              playPreviousVideo();
                            }
                          }}
                        >
                          <SkipBack className="h-5 w-5" />
                        </div>

                        {/* Next Video Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className={`text-white hover:bg-white/20 p-2 rounded cursor-pointer ${
                            !playlist?.videos ||
                            !Array.isArray(playlist.videos) ||
                            currentVideoIndex >= playlist.videos.length - 1 ||
                            (!isVideoPlayable(currentVideoIndex + 1) && videoWatchEvents[currentVideo.id] !== true)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          onClick={
                            playlist?.videos &&
                            Array.isArray(playlist.videos) &&
                            currentVideoIndex < playlist.videos.length - 1 &&
                            (isVideoPlayable(currentVideoIndex + 1) || videoWatchEvents[currentVideo.id] === true)
                              ? playNextVideo
                              : undefined
                          }
                          onKeyDown={(e) => {
                            if (
                              (e.key === 'Enter' || e.key === ' ') &&
                              playlist?.videos &&
                              Array.isArray(playlist.videos) &&
                              currentVideoIndex < playlist.videos.length - 1 &&
                              (isVideoPlayable(currentVideoIndex + 1) || videoWatchEvents[currentVideo.id] === true)
                            ) {
                              playNextVideo();
                            }
                          }}
                        >
                          <SkipForward className="h-5 w-5" />
                        </div>

                        {/* Volume Control */}
                        <div className="relative flex items-center">
                          <div
                            role="button"
                            tabIndex={0}
                            className="focus:outline-none cursor-pointer"
                            onClick={() => setShowVolumeSlider((v) => !v)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setShowVolumeSlider((v) => !v);
                              }
                            }}
                          >
                            {volume === 0 ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                          </div>
                          {showVolumeSlider && (
                            <div
                              ref={volumeSliderRef}
                              className="absolute left-1/2 -translate-x-1/2 bottom-12 z-50 bg-black/60 px-2 py-1 rounded flex items-center shadow-lg"
                              style={{ minWidth: 90, maxWidth: 120 }}
                            >
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={e => {
                                  const newVolume = Number(e.target.value)
                                  setVolume(newVolume)
                                  if (newVolume > 0) setIsMuted(false)
                                  else setIsMuted(true)
                                }}
                                className="w-16 accent-primary h-1"
                                style={{ verticalAlign: 'middle', marginRight: 4 }}
                              />
                              <span className="text-xs text-white opacity-70" style={{ minWidth: 16, textAlign: 'right' }}>{volume}</span>
                            </div>
                          )}
                        </div>

                        {/* Playback Speed Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              role="button"
                              tabIndex={0}
                              className="text-white hover:bg-white/20 text-xs px-2 py-1 rounded cursor-pointer"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setSpeedMenuOpen((v) => !v);
                                }
                              }}
                            >
                              {playbackRate}x
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-16">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <DropdownMenuItem
                                key={rate}
                                className={playbackRate === rate ? "bg-muted" : ""}
                                onClick={() => handlePlaybackRateChange(rate)}
                              >
                                {rate}x
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Time Display */}
                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Video Info Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-white hover:bg-white/20 p-2 rounded cursor-pointer"
                          onClick={() => setVideoInfoOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setVideoInfoOpen(true);
                            }
                          }}
                        >
                          <Info className="h-5 w-5" />
                        </div>

                        {/* Fullscreen Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-white hover:bg-white/20 p-2 rounded cursor-pointer"
                          onClick={toggleFullscreen}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              toggleFullscreen();
                            }
                          }}
                        >
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating and Feedback Buttons */}
            <div className="flex items-center justify-center gap-4 mt-4 mb-6">
              <Button variant="outline" onClick={() => setVideoFeedbackOpen(true)} className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Rate & Review This Video
              </Button>
            </div>

            {/* Video Feedbacks Section */}
            {showVideoFeedbacks && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-4">Video Feedback</h2>
                  {videoFeedbacks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No feedback available for this video yet.</p>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                      {videoFeedbacks.map((feedback) => (
                        <div key={feedback.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{feedback.userEmail || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground">
                                {feedback.createdAt.toLocaleDateString()} {feedback.createdAt.toLocaleTimeString()}
                              </p>
                            </div>
                            {feedback.rating && (
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${i < feedback.rating ? "text-yellow-400" : "text-gray-300"}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                  </svg>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm">{feedback.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Modules and Videos */}
          <div>
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Learning Modules</h2>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={activeModuleIndex !== null ? `module-${activeModuleIndex}` : undefined}
                    className="w-full"
                  >
                    {modules.map((module, moduleIndex) => (
                      <AccordionItem key={moduleIndex} value={`module-${moduleIndex}`}>
                        <AccordionTrigger className="hover:no-underline">
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
                              const isPlayable = playlistIndex !== -1 ? isVideoPlayable(playlistIndex) : false

                              return (
                                <div
                                  key={video.id}
                                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                    isCurrentVideo
                                      ? "bg-primary/10 border border-primary/30"
                                      : isPlayable
                                        ? "hover:bg-muted cursor-pointer"
                                        : "opacity-50 cursor-not-allowed"
                                  }`}
                                  onClick={() => {
                                    if (isPlayable && !isCurrentVideo) {
                                      playVideoFromModule(moduleIndex, videoIndex)
                                    }
                                  }}
                                >
                                  <div className="relative w-20 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                                    {video.thumbnail ? (
                                      <Image
                                        src={video.thumbnail || "/placeholder.svg?height=40&width=40"}
                                        width={40}
                                        height={40}
                                        alt={video.title}
                                        className="object-cover w-full h-full"
                                        onError={() => {
                                          // If image fails to load, replace with placeholder
                                          const imgElement = document.getElementById(
                                            `thumb-${video.id}`,
                                          ) as HTMLImageElement
                                          if (imgElement) {
                                            imgElement.src = "/placeholder.svg?height=40&width=40"
                                          }
                                        }}
                                        id={`thumb-${video.id}`}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <Play className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    {isWatched && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      </div>
                                    )}
                                    {!isPlayable && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{video.title}</p>
                                    <p className="text-xs text-muted-foreground">{video.duration}</p>
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

      {/* Video Info Dialog */}
      <Dialog open={videoInfoOpen} onOpenChange={setVideoInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentVideo.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {currentVideo.thumbnail && (
              <div className="rounded-md overflow-hidden">
                <Image
                  src={currentVideo.thumbnail || "/placeholder.svg"}
                  alt={currentVideo.title}
                  width={400}
                  height={225}
                  className="w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                <p>{currentVideo.duration}</p>
              </div>

              {currentVideo.category && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p>{currentVideo.category}</p>
                </div>
              )}

              {currentVideo.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-sm">{currentVideo.description}</p>
                </div>
              )}

              {currentVideo.tags && currentVideo.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {currentVideo.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
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
              className="bg-primary hover:bg-primary/90"
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Feedback Dialog */}
      <Dialog open={videoFeedbackOpen} onOpenChange={setVideoFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate & Review: {currentVideo?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" className="p-1" onClick={() => setVideoRating(rating)}>
                  <svg
                    className={`w-8 h-8 ${
                      videoRating !== null && rating <= videoRating ? "text-yellow-400" : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </button>
              ))}
            </div>
            <Textarea
              placeholder="What did you think about this video? Any suggestions for improvement?"
              value={videoFeedback}
              onChange={(e) => setVideoFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVideoFeedback}
              disabled={!videoFeedback.trim() || videoRating === null || submittingVideoFeedback}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingVideoFeedback ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resume Video?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>You were watching this video at {formatTime(lastPosition)}. Would you like to resume from where you left off?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleStartFromBeginning}>
              Start from Beginning
            </Button>
            <Button onClick={handleResume}>
              Resume from {formatTime(lastPosition)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
