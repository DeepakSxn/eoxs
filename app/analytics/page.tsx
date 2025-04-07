"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { auth, db } from "../firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Home,
  LogOut,
  BarChart,
  Clock,
  RefreshCw,
  Play,
  Eye,
  Calendar,
  TrendingUp,
  Timer,
  Activity,
} from "lucide-react"
import { ThemeToggle } from "../theme-toggle"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
} from "chart.js"
import { Bar, Line, Radar } from "react-chartjs-2"
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
)

// Types
interface VideoWatchEvent {
  id: string
  videoId: string
  videoTitle: string
  userId: string
  playlistId: string
  watchedAt: { seconds: number; nanoseconds: number }
  watchDuration: number // in seconds
  completed: boolean
  isRewatch: boolean
}

interface VideoAnalytics {
  id: string
  title: string
  publicId?: string
  thumbnail?: string
  totalWatches: number
  uniqueWatches: number
  rewatches: number
  averageWatchDuration: number
  completionRate: number
  lastWatched?: { seconds: number; nanoseconds: number }
  engagementScore?: number
}

interface DailyWatchData {
  date: string
  count: number
  duration: number
  completions: number
}

interface TimeOfDayData {
  hour: number
  count: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [watchEvents, setWatchEvents] = useState<VideoWatchEvent[]>([])
  const [videoAnalytics, setVideoAnalytics] = useState<VideoAnalytics[]>([])
  const [topVideos, setTopVideos] = useState<VideoAnalytics[]>([])
  const [mostRewatchedVideos, setMostRewatchedVideos] = useState<VideoAnalytics[]>([])
  const [mostEngagingVideos, setMostEngagingVideos] = useState<VideoAnalytics[]>([])
  const [dailyWatchData, setDailyWatchData] = useState<DailyWatchData[]>([])
  const [timeOfDayData, setTimeOfDayData] = useState<TimeOfDayData[]>([])
  const [totalWatches, setTotalWatches] = useState(0)
  const [totalWatchTime, setTotalWatchTime] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [dateRange, setDateRange] = useState<string>("7") // Default to 7 days

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch watch events from Firestore
        const eventsQuery = query(
          collection(db, "videoWatchEvents"),
          where("userId", "==", user.uid),
          orderBy("watchedAt", "desc"),
        )

        const eventsSnapshot = await getDocs(eventsQuery)
        const events = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VideoWatchEvent[]

        setWatchEvents(events)

        // Process analytics data
        processAnalyticsData(events)

        setLoading(false)
      } catch (error) {
        console.error("Error fetching analytics data:", error)
        setLoading(false)
      }
    }

    if (user) {
      fetchAnalyticsData()
    }
  }, [user])

  const processAnalyticsData = (events: VideoWatchEvent[]) => {
    // Calculate total watches and watch time
    setTotalWatches(events.length)
    setTotalWatchTime(events.reduce((total, event) => total + (event.watchDuration || 0), 0))

    // Calculate completion rate
    const completedEvents = events.filter((event) => event.completed)
    setCompletionRate(events.length > 0 ? (completedEvents.length / events.length) * 100 : 0)

    // Process video-specific analytics
    const videoMap = new Map<string, VideoAnalytics>()
    const uniqueWatchesMap = new Map<string, Set<string>>()

    events.forEach((event) => {
      // Initialize maps for new videos
      if (!videoMap.has(event.videoId)) {
        videoMap.set(event.videoId, {
          id: event.videoId,
          title: event.videoTitle,
          totalWatches: 0,
          uniqueWatches: 0,
          rewatches: 0,
          averageWatchDuration: 0,
          completionRate: 0,
          lastWatched: event.watchedAt,
        })
        uniqueWatchesMap.set(event.videoId, new Set())
      }

      // Update video analytics
      const videoStats = videoMap.get(event.videoId)!
      const uniqueWatches = uniqueWatchesMap.get(event.videoId)!

      // Increment total watches
      videoStats.totalWatches++

      // Track unique watches by combining userId and playlistId
      const watchKey = `${event.userId}-${event.playlistId}`
      uniqueWatches.add(watchKey)
      videoStats.uniqueWatches = uniqueWatches.size

      // Count rewatches
      if (event.isRewatch) {
        videoStats.rewatches++
      }

      // Update average watch duration
      const totalDuration = videoStats.averageWatchDuration * (videoStats.totalWatches - 1) + (event.watchDuration || 0)
      videoStats.averageWatchDuration = totalDuration / videoStats.totalWatches

      // Update completion rate
      const completedCount = events.filter((e) => e.videoId === event.videoId && e.completed).length
      const totalCount = events.filter((e) => e.videoId === event.videoId).length
      videoStats.completionRate = (completedCount / totalCount) * 100

      // Update last watched time if more recent
      if (!videoStats.lastWatched || event.watchedAt.seconds > videoStats.lastWatched.seconds) {
        videoStats.lastWatched = event.watchedAt
      }

      // Update the map
      videoMap.set(event.videoId, videoStats)
    })

    // Calculate engagement score for each video
    videoMap.forEach((video) => {
      // Engagement score formula: (completionRate * 0.4) + (rewatches * 10 * 0.3) + (averageWatchDuration * 0.3)
      const normalizedCompletionRate = video.completionRate / 100
      const normalizedRewatches = Math.min(video.rewatches / 5, 1) // Cap at 5 rewatches
      const normalizedDuration = Math.min(video.averageWatchDuration / 300, 1) // Cap at 5 minutes

      video.engagementScore = normalizedCompletionRate * 0.4 + normalizedRewatches * 0.3 + normalizedDuration * 0.3
    })

    // Convert map to array
    const analyticsArray = Array.from(videoMap.values())
    setVideoAnalytics(analyticsArray)

    // Set top videos by total watches
    setTopVideos([...analyticsArray].sort((a, b) => b.totalWatches - a.totalWatches).slice(0, 5))

    // Set most rewatched videos
    setMostRewatchedVideos([...analyticsArray].sort((a, b) => b.rewatches - a.rewatches).slice(0, 5))

    // Set most engaging videos
    setMostEngagingVideos(
      [...analyticsArray].sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0)).slice(0, 5),
    )

    // Process daily watch data
    const dailyData = processDailyWatchData(events)
    setDailyWatchData(dailyData)

    // Process time of day data
    const timeData = processTimeOfDayData(events)
    setTimeOfDayData(timeData)
  }

  const processDailyWatchData = (events: VideoWatchEvent[]): DailyWatchData[] => {
    // Create a map for the last X days based on selected range
    const dailyMap = new Map<string, { count: number; duration: number; completions: number }>()
    const today = new Date()
    const daysToShow = Number.parseInt(dateRange)

    // Initialize the map with zeros for the selected days
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split("T")[0]
      dailyMap.set(dateString, { count: 0, duration: 0, completions: 0 })
    }

    // Count events by day
    events.forEach((event) => {
      if (!event.watchedAt) return

      const date = new Date(event.watchedAt.seconds * 1000)
      const dateString = date.toISOString().split("T")[0]

      if (dailyMap.has(dateString)) {
        const current = dailyMap.get(dateString)!
        dailyMap.set(dateString, {
          count: current.count + 1,
          duration: current.duration + (event.watchDuration || 0),
          completions: current.completions + (event.completed ? 1 : 0),
        })
      }
    })

    // Convert map to array
    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      duration: data.duration,
      completions: data.completions,
    }))
  }

  const processTimeOfDayData = (events: VideoWatchEvent[]): TimeOfDayData[] => {
    // Initialize array with 24 hours
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))

    // Count events by hour
    events.forEach((event) => {
      if (!event.watchedAt) return

      const date = new Date(event.watchedAt.seconds * 1000)
      const hour = date.getHours()

      hourlyData[hour].count++
    })

    return hourlyData
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDate = (seconds: number): string => {
    return new Date(seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Chart data for daily watches
  const dailyWatchChartData = {
    labels: dailyWatchData.map((item) => item.date.slice(5)), // MM-DD format
    datasets: [
      {
        label: "Video Views",
        data: dailyWatchData.map((item) => item.count),
        backgroundColor: "rgba(76, 175, 80, 0.5)",
        borderColor: "rgba(76, 175, 80, 1)",
        borderWidth: 1,
        tension: 0.3,
      },
    ],
  }

  // Chart data for daily watch time
  const dailyWatchTimeChartData = {
    labels: dailyWatchData.map((item) => item.date.slice(5)), // MM-DD format
    datasets: [
      {
        label: "Watch Time (minutes)",
        data: dailyWatchData.map((item) => Math.round(item.duration / 60)),
        backgroundColor: "rgba(33, 150, 243, 0.5)",
        borderColor: "rgba(33, 150, 243, 1)",
        borderWidth: 1,
        tension: 0.3,
      },
    ],
  }

  // Chart data for top videos
  const topVideosChartData = {
    labels: topVideos.map((video) => (video.title.length > 15 ? video.title.substring(0, 15) + "..." : video.title)),
    datasets: [
      {
        label: "Total Views",
        data: topVideos.map((video) => video.totalWatches),
        backgroundColor: "rgba(76, 175, 80, 0.7)",
        borderColor: "rgba(76, 175, 80, 1)",
        borderWidth: 1,
      },
    ],
  }

  // Chart data for time of day
  const timeOfDayChartData = {
    labels: timeOfDayData.map((item) => `${item.hour}:00`),
    datasets: [
      {
        label: "Views by Hour",
        data: timeOfDayData.map((item) => item.count),
        backgroundColor: "rgba(156, 39, 176, 0.5)",
        borderColor: "rgba(156, 39, 176, 1)",
        borderWidth: 1,
        fill: true,
      },
    ],
  }

  // Chart data for engagement metrics
  const engagementRadarData = {
    labels: ["Completion Rate", "Rewatches", "Watch Duration", "Total Views", "Unique Views"],
    datasets: mostEngagingVideos.slice(0, 3).map((video, index) => {
      const colors = [
        { bg: "rgba(76, 175, 80, 0.2)", border: "rgba(76, 175, 80, 1)" },
        { bg: "rgba(33, 150, 243, 0.2)", border: "rgba(33, 150, 243, 1)" },
        { bg: "rgba(255, 152, 0, 0.2)", border: "rgba(255, 152, 0, 1)" },
      ]

      return {
        label: video.title.length > 15 ? video.title.substring(0, 15) + "..." : video.title,
        data: [
          video.completionRate / 100,
          Math.min(video.rewatches / 5, 1),
          Math.min(video.averageWatchDuration / 300, 1),
          Math.min(video.totalWatches / 20, 1),
          Math.min(video.uniqueWatches / 10, 1),
        ],
        backgroundColor: colors[index].bg,
        borderColor: colors[index].border,
        borderWidth: 2,
      }
    }),
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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO-iZKjcWij4vfxfUuaJ19T8bUqjZrXoP.jpeg"
              alt="EOXS Logo"
              width={120}
              height={40}
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <Home className="h-5 w-5" />
              <span className="sr-only">Dashboard</span>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <BarChart className="h-6 w-6 mr-2 text-primary" />
            Video Analytics Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : watchEvents.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed">
            <BarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">No watch data available yet.</p>
            <p className="text-muted-foreground mb-6">Watch some videos to see analytics here.</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => router.push("/playlists")}>
              Go to My Playlists
            </Button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Overview Cards */}
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" variants={itemVariants}>
              <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalWatches}</div>
                  <p className="text-xs text-muted-foreground">All time video views</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(totalWatchTime)}</div>
                  <p className="text-xs text-muted-foreground">Total time spent watching</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Play className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Videos watched to completion</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-t-4 border-t-orange-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rewatches</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{watchEvents.filter((event) => event.isRewatch).length}</div>
                  <p className="text-xs text-muted-foreground">Videos watched multiple times</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts Section */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Daily Video Views
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Line
                    data={dailyWatchChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0,
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          position: "top",
                        },
                        tooltip: {
                          mode: "index",
                          intersect: false,
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Top Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Bar
                    data={topVideosChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0,
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          position: "top",
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Charts */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Timer className="h-5 w-5 mr-2 text-primary" />
                    Daily Watch Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Line
                    data={dailyWatchTimeChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: "Minutes",
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          position: "top",
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-primary" />
                    Engagement Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Radar
                    data={engagementRadarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          min: 0,
                          max: 1,
                          ticks: {
                            stepSize: 0.2,
                            showLabelBackdrop: false,
                            backdropColor: "rgba(203, 207, 212, 1)",
                          },
                          pointLabels: {
                            font: {
                              size: 12,
                            },
                          },
                        },
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              let label = context.dataset.label || ""
                              if (label) {
                                label += ": "
                              }

                              const metrics = [
                                "Completion Rate",
                                "Rewatches",
                                "Watch Duration",
                                "Total Views",
                                "Unique Views",
                              ]
                              const metric = metrics[context.dataIndex]
                              const value = context.raw

                              if (metric === "Completion Rate") {
                                return label + (value * 100).toFixed(1) + "%"
                              } else {
                                return label + (value * 100).toFixed(0) + "% of max"
                              }
                            },
                          },
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Detailed Analytics Tabs */}
            <motion.div variants={itemVariants}>
              <Tabs defaultValue="top-videos" className="mb-8">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="top-videos">Most Watched</TabsTrigger>
                  <TabsTrigger value="rewatches">Most Rewatched</TabsTrigger>
                  <TabsTrigger value="engaging">Most Engaging</TabsTrigger>
                  <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="top-videos" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Watched Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topVideos.length > 0 ? (
                          topVideos.map((video) => (
                            <div
                              key={video.id}
                              className="flex items-center p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                {video.totalWatches}
                              </div>
                              <div className="ml-4 flex-grow">
                                <h3 className="font-medium">{video.title}</h3>
                                <div className="flex flex-wrap text-xs text-muted-foreground mt-1 gap-x-4 gap-y-1">
                                  <span>Completion: {video.completionRate.toFixed(1)}%</span>
                                  <span>Avg. Duration: {formatTime(video.averageWatchDuration)}</span>
                                  <span>Unique Views: {video.uniqueWatches}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">No data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="rewatches" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Rewatched Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mostRewatchedVideos.length > 0 ? (
                          mostRewatchedVideos.map((video) => (
                            <div
                              key={video.id}
                              className="flex items-center p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                {video.rewatches}
                              </div>
                              <div className="ml-4 flex-grow">
                                <h3 className="font-medium">{video.title}</h3>
                                <div className="flex flex-wrap text-xs text-muted-foreground mt-1 gap-x-4 gap-y-1">
                                  <span>Total Views: {video.totalWatches}</span>
                                  <span>Unique Views: {video.uniqueWatches}</span>
                                  <span>Completion: {video.completionRate.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">No rewatch data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="engaging" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Engaging Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mostEngagingVideos.length > 0 ? (
                          mostEngagingVideos.map((video) => (
                            <div
                              key={video.id}
                              className="flex items-center p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {(video.engagementScore! * 100).toFixed(0)}%
                              </div>
                              <div className="ml-4 flex-grow">
                                <h3 className="font-medium">{video.title}</h3>
                                <div className="flex flex-wrap text-xs text-muted-foreground mt-1 gap-x-4 gap-y-1">
                                  <span>Completion: {video.completionRate.toFixed(1)}%</span>
                                  <span>Rewatches: {video.rewatches}</span>
                                  <span>Avg. Duration: {formatTime(video.averageWatchDuration)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">No engagement data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recent" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Watch Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {watchEvents.slice(0, 10).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                              {event.completed ? (
                                <Play className="h-6 w-6 text-primary fill-current" />
                              ) : (
                                <Play className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="ml-4 flex-grow">
                              <h3 className="font-medium">{event.videoTitle}</h3>
                              <div className="flex flex-wrap text-xs text-muted-foreground mt-1 gap-x-4 gap-y-1">
                                <span>{formatDate(event.watchedAt.seconds)}</span>
                                <span>Duration: {formatTime(event.watchDuration)}</span>
                                {event.isRewatch && <span className="text-primary">Rewatched</span>}
                                {event.completed && <span className="text-green-500">Completed</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </motion.div>
        )}
      </main>

      <footer className="border-t bg-muted/20 dark:bg-muted/5 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EOXS. All rights reserved. Where Steel Meets Technology.
      </footer>
    </div>
  )
}

