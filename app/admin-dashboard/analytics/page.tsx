"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where, orderBy, type Timestamp } from "firebase/firestore"
import type { User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, TrendingUp, Timer, Eye, PlayCircle } from "lucide-react"
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
import { Bar, Doughnut, Line } from "react-chartjs-2"

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

interface VideoType {
  id: string
  title: string
  description?: string
  category?: string
  videoUrl?: string
  publicId?: string
  createdAt: string
  views?: number
  watchTime?: number
  engagement?: number
  thumbnailUrl?: string
  duration?: number
}

interface WatchEvent {
  eventType: string
  videoId: string
  videoTitle: string
  userId: string
  userEmail: string
  watchedAt: Timestamp
  watchDuration: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [timeRange, setTimeRange] = useState("7d")
  const [videos, setVideos] = useState<VideoType[]>([])
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined" || !auth) {
      // Skip auth check on server or if auth is not initialized
      return
    }

    try {
      const unsubscribe = auth.onAuthStateChanged(
        (currentUser) => {
          if (!currentUser) {
            router.push("/login")
            return
          }
          setUser(currentUser)
        },
        (error) => {
          console.error("Auth state change error:", error)
          // Handle auth error gracefully
        },
      )

      loadData()
      return () => unsubscribe()
    } catch (error) {
      console.error("Error setting up auth listener:", error)
      // Handle setup error gracefully
    }
  }, [router, timeRange])

  const loadData = async () => {
    try {
      setIsLoading(true)
      if (!db) {
        console.error("Firestore not initialized")
        return
      }
      await Promise.all([loadVideos(), loadWatchEvents()])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadVideos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "videos"))
      const videoData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date().toISOString(),
        title: doc.data().title || "Untitled Video",
        views: doc.data().views || 0,
        watchTime: doc.data().watchTime || 0,
        engagement: doc.data().engagement || 0,
        category: doc.data().category || "Uncategorized",
        duration: doc.data().duration || 0,
      })) as VideoType[]
      setVideos(videoData)
    } catch (error) {
      console.error("Error fetching videos:", error)
    }
  }

  const loadWatchEvents = async () => {
    try {
      // Get date range based on selected time period
      const endDate = new Date()
      const startDate = new Date()
      if (timeRange === "7d") {
        startDate.setDate(endDate.getDate() - 7)
      } else if (timeRange === "30d") {
        startDate.setDate(endDate.getDate() - 30)
      } else {
        startDate.setDate(endDate.getDate() - 90)
      }

      // Query watch events from the collection created by the playlist page
      const eventsQuery = query(
        collection(db, "videoWatchEvents"),
        where("watchedAt", ">=", startDate),
        where("watchedAt", "<=", endDate),
        orderBy("watchedAt", "desc"),
      )

      const querySnapshot = await getDocs(eventsQuery)
      const eventsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as WatchEvent[]

      setWatchEvents(eventsData)

      // Update video stats based on watch events
      updateVideoStatsFromEvents(eventsData)
    } catch (error) {
      console.error("Error fetching watch events:", error)
    }
  }

  const updateVideoStatsFromEvents = (events: WatchEvent[]) => {
    // Create a map to aggregate stats by video
    const videoStatsMap = new Map<
      string,
      {
        views: number
        watchTime: number
        totalDuration: number
        engagement: number
      }
    >()

    // Process all events to calculate stats
    events.forEach((event) => {
      if (!videoStatsMap.has(event.videoId)) {
        // Find the video to get its duration
        const video = videos.find((v) => v.id === event.videoId)
        videoStatsMap.set(event.videoId, {
          views: 0,
          watchTime: 0,
          totalDuration: video?.duration || 0,
          engagement: 0,
        })
      }

      const stats = videoStatsMap.get(event.videoId)!

      // Count play events as views
      if (event.eventType === "play") {
        stats.views += 1
      }

      // Add watch duration to total watch times
      if (event.watchDuration) {
        stats.watchTime += event.watchDuration / 3600 // Convert seconds to hours
      }
    })

    // Update videos with the calculated stats
    setVideos((prevVideos) => {
      return prevVideos.map((video) => {
        const stats = videoStatsMap.get(video.id)
        if (stats) {
          // Calculate engagement as percentage of watch time relative to video duration
          // If we have views but no duration info, use a reasonable estimate
          const videoDuration = video.duration || 0
          const totalPossibleWatchTime =
            videoDuration > 0
              ? (videoDuration * stats.views) / 3600
              : // Convert to hours
                stats.views * 0.1 // Assume 6 minutes (0.1 hours) per view if no duration

          const engagement = totalPossibleWatchTime > 0 ? Math.min(stats.watchTime / totalPossibleWatchTime, 1) : 0

          return {
            ...video,
            views: stats.views,
            watchTime: stats.watchTime,
            engagement: engagement,
          }
        }
        return video
      })
    })
  }

  // Calculate real data for charts
  const calculateChartData = () => {
    // Get dates for the selected time range
    const getDaysArray = (timeRange: string) => {
      const today = new Date()
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        return date
      }).reverse()
    }

    const daysArray = getDaysArray(timeRange)
    const labels = daysArray.map((date) =>
      date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    )

    // Initialize data arrays
    const viewsArray = new Array(daysArray.length).fill(0)
    const watchTimeArray = new Array(daysArray.length).fill(0)
    const engagementArray = new Array(daysArray.length).fill(0)

    // Calculate category distribution
    const categories = videos.reduce(
      (acc, video) => {
        const category = video.category || "Uncategorized"
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Process watch events data for time-based charts
    watchEvents.forEach((event) => {
      if (!event.watchedAt) return

      const eventDate = event.watchedAt.toDate()
      const index = daysArray.findIndex((date) => date.toDateString() === eventDate.toDateString())

      if (index !== -1) {
        if (event.eventType === "play") {
          viewsArray[index] += 1
        }

        if (event.watchDuration) {
          watchTimeArray[index] += event.watchDuration / 3600 // Convert seconds to hours
        }
      }
    })

    // Calculate engagement rate per day (simplified)
    for (let i = 0; i < daysArray.length; i++) {
      engagementArray[i] = watchTimeArray[i] > 0 ? Math.min(watchTimeArray[i] / 10, 1) : 0
    }

    // Calculate growth rates
    const calculateGrowthRate = (data: number[]) => {
      if (data.length < 2) return 0
      const currentPeriod = data.slice(-7).reduce((a, b) => a + b, 0)
      const previousPeriod = data.slice(-14, -7).reduce((a, b) => a + b, 0)
      return previousPeriod === 0 ? 0 : ((currentPeriod - previousPeriod) / previousPeriod) * 100
    }

    return {
      viewsData: {
        labels,
        datasets: [
          {
            label: "Views",
            data: viewsArray,
            backgroundColor: "rgba(29, 78, 216, 0.2)",
            borderColor: "rgb(29, 78, 216)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      categoryData: {
        labels: Object.keys(categories),
        datasets: [
          {
            data: Object.values(categories),
            backgroundColor: [
              "rgba(59, 130, 246, 0.8)",
              "rgba(16, 185, 129, 0.8)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(139, 92, 246, 0.8)",
              "rgba(236, 72, 153, 0.8)",
            ],
            borderWidth: 1,
          },
        ],
      },
      engagementData: {
        labels,
        datasets: [
          {
            label: "Watch Time (hours)",
            data: watchTimeArray,
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            borderColor: "rgb(16, 185, 129)",
            borderWidth: 2,
          },
        ],
      },
      growthRates: {
        views: calculateGrowthRate(viewsArray),
        watchTime: calculateGrowthRate(watchTimeArray),
        engagement: calculateGrowthRate(engagementArray),
      },
    }
  }

  const { viewsData, categoryData, engagementData, growthRates } = calculateChartData()

  // Calculate summary statistics
  const totalViews = watchEvents.filter((event) => event.eventType === "play").length
  const totalWatchTime = watchEvents.reduce((sum, event) => sum + (event.watchDuration || 0), 0) / 3600 // Convert to hours

  const videosWithEngagement = videos.filter(
    (video) => typeof video.engagement === "number" && !isNaN(video.engagement),
  )
  const averageEngagement =
    videosWithEngagement.length > 0
      ? videosWithEngagement.reduce((sum, video) => sum + (video.engagement || 0), 0) / videosWithEngagement.length
      : 0
  const averageWatchTime = videos.length > 0 ? totalWatchTime / videos.length : 0

  // Get top performing videos based on views from watch events
  const videoViewsMap = new Map<string, { id: string; title: string; category: string; views: number }>()

  // Count views per video from events
  watchEvents.forEach((event) => {
    if (event.eventType === "play") {
      if (!videoViewsMap.has(event.videoId)) {
        videoViewsMap.set(event.videoId, {
          id: event.videoId,
          title: event.videoTitle,
          category: videos.find((v) => v.id === event.videoId)?.category || "Uncategorized",
          views: 0,
        })
      }
      videoViewsMap.get(event.videoId)!.views += 1
    }
  })

  // Convert to array and sort
  const topVideos = Array.from(videoViewsMap.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Overview</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {growthRates.views > 0 ? "+" : ""}
              {growthRates.views.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWatchTime.toLocaleString()}h</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {growthRates.watchTime > 0 ? "+" : ""}
              {growthRates.watchTime.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(averageEngagement * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {growthRates.engagement > 0 ? "+" : ""}
              {growthRates.engagement.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}</div>
            <p className="text-xs text-muted-foreground">Avg. {averageWatchTime.toFixed(1)}h watch time per video</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={viewsData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    mode: "index",
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: "rgba(0, 0, 0, 0.1)",
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Videos by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-64 h-64">
              <Doughnut
                data={categoryData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "bottom",
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Watch Time Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={engagementData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    mode: "index",
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: "rgba(0, 0, 0, 0.1)",
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Top Performing Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVideos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-4">
                  <div className="flex-none w-6 text-muted-foreground">{index + 1}</div>
                  <div className="flex-1 truncate">
                    <p className="font-medium truncate">{video.title}</p>
                    <p className="text-sm text-muted-foreground">{video.category}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    {video.views.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

