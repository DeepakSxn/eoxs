"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "../firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LogOut,
  BarChart,
  Users,
  PlayCircle,
  Video,
  Upload,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
  Timer,
} from "lucide-react"
import { ThemeToggle } from "../theme-toggle"
import { Logo } from "../components/logo"
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
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

interface VideoAnalytics {
  id: string
  title: string
  totalWatches: number
  uniqueWatches: number
  completionRate: number
  averageWatchDuration: number
  category?: string
}

interface UserStats {
  totalUsers: number
  usersWithPlaylists: number
  totalPlaylists: number
  totalWatchEvents: number
  totalWatchTime: number
}

interface DailyWatchData {
  date: string
  count: number
  duration: number
}

interface CategoryData {
  category: string
  count: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    usersWithPlaylists: 0,
    totalPlaylists: 0,
    totalWatchEvents: 0,
    totalWatchTime: 0,
  })
  const [topVideos, setTopVideos] = useState<VideoAnalytics[]>([])
  const [leastWatchedVideos, setLeastWatchedVideos] = useState<VideoAnalytics[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [dailyWatchData, setDailyWatchData] = useState<DailyWatchData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [dateRange, setDateRange] = useState<string>("7") // Default to 7 days

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Check if user is an admin
        const adminQuery = query(collection(db, "admins"), where("userId", "==", currentUser.uid))
        const adminSnapshot = await getDocs(adminQuery)

        if (adminSnapshot.empty) {
          // Not an admin, redirect to home
          router.push("/")
        } else {
          setIsAdmin(true)
          fetchAdminData()
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/admin-login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchAdminData = async () => {
    try {
      setLoading(true)

      // Fetch user statistics
      const usersCollection = collection(db, "users")
      const usersSnapshot = await getDocs(usersCollection)
      const totalUsers = usersSnapshot.size

      // Fetch playlists
      const playlistsCollection = collection(db, "playlists")
      const playlistsSnapshot = await getDocs(playlistsCollection)
      const totalPlaylists = playlistsSnapshot.size

      // Count unique users with playlists
      const userIds = new Set()
      playlistsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.userId) {
          userIds.add(data.userId)
        }
      })
      const usersWithPlaylists = userIds.size

      // Fetch watch events
      const watchEventsCollection = collection(db, "videoWatchEvents")
      const watchEventsSnapshot = await getDocs(watchEventsCollection)
      const totalWatchEvents = watchEventsSnapshot.size

      // Calculate total watch time
      const totalWatchTime = watchEventsSnapshot.docs.reduce((total, doc) => {
        const data = doc.data()
        return total + (data.watchDuration || 0)
      }, 0)

      setUserStats({
        totalUsers,
        usersWithPlaylists,
        totalPlaylists,
        totalWatchEvents,
        totalWatchTime,
      })

      // Process video analytics
      const videoMap = new Map<string, VideoAnalytics>()
      const categoryMap = new Map<string, number>()
      const dailyMap = new Map<string, { count: number; duration: number }>()

      // Initialize daily data for the last X days
      const today = new Date()
      const daysToShow = Number.parseInt(dateRange)

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split("T")[0]
        dailyMap.set(dateString, { count: 0, duration: 0 })
      }

      watchEventsSnapshot.docs.forEach((doc) => {
        const data = doc.data()

        // Process video analytics
        if (!videoMap.has(data.videoId)) {
          videoMap.set(data.videoId, {
            id: data.videoId,
            title: data.videoTitle || "Unknown Video",
            totalWatches: 0,
            uniqueWatches: 0,
            completionRate: 0,
            averageWatchDuration: 0,
            category: data.category || "Uncategorized",
          })
        }

        const videoStats = videoMap.get(data.videoId)!
        videoStats.totalWatches++

        // Update average watch duration
        const totalDuration =
          videoStats.averageWatchDuration * (videoStats.totalWatches - 1) + (data.watchDuration || 0)
        videoStats.averageWatchDuration = totalDuration / videoStats.totalWatches

        if (data.completed) {
          videoStats.completionRate =
            (videoStats.completionRate * (videoStats.totalWatches - 1) + 100) / videoStats.totalWatches
        }

        // Update category data
        const category = data.category || "Uncategorized"
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)

        // Update daily watch data
        if (data.watchedAt) {
          const date = new Date(data.watchedAt.seconds * 1000)
          const dateString = date.toISOString().split("T")[0]

          if (dailyMap.has(dateString)) {
            const current = dailyMap.get(dateString)!
            dailyMap.set(dateString, {
              count: current.count + 1,
              duration: current.duration + (data.watchDuration || 0),
            })
          }
        }

        videoMap.set(data.videoId, videoStats)
      })

      // Convert maps to arrays
      const videosArray = Array.from(videoMap.values())
      const categoryArray = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      }))
      const dailyArray = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        duration: data.duration,
      }))

      // Set top videos
      const sortedByWatches = [...videosArray].sort((a, b) => b.totalWatches - a.totalWatches)
      setTopVideos(sortedByWatches.slice(0, 5))

      // Set least watched videos
      setLeastWatchedVideos([...sortedByWatches].reverse().slice(0, 5))

      // Set category data
      setCategoryData(categoryArray.sort((a, b) => b.count - a.count))

      // Set daily watch data
      setDailyWatchData(dailyArray)

      setLoading(false)
    } catch (error) {
      console.error("Error fetching admin data:", error)
      setLoading(false)
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

  // Format time function
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

  // Chart data for user stats
  const userStatsChartData = {
    labels: ["Total Users", "Users with Playlists"],
    datasets: [
      {
        data: [userStats.totalUsers, userStats.usersWithPlaylists],
        backgroundColor: ["rgba(76, 175, 80, 0.7)", "rgba(33, 150, 243, 0.7)"],
        borderColor: ["rgba(76, 175, 80, 1)", "rgba(33, 150, 243, 1)"],
        borderWidth: 1,
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

  // Chart data for category distribution
  const categoryChartData = {
    labels: categoryData.slice(0, 6).map((item) => item.category),
    datasets: [
      {
        data: categoryData.slice(0, 6).map((item) => item.count),
        backgroundColor: [
          "rgba(76, 175, 80, 0.7)",
          "rgba(33, 150, 243, 0.7)",
          "rgba(255, 152, 0, 0.7)",
          "rgba(156, 39, 176, 0.7)",
          "rgba(244, 67, 54, 0.7)",
          "rgba(96, 125, 139, 0.7)",
        ],
        borderColor: [
          "rgba(76, 175, 80, 1)",
          "rgba(33, 150, 243, 1)",
          "rgba(255, 152, 0, 1)",
          "rgba(156, 39, 176, 1)",
          "rgba(244, 67, 54, 1)",
          "rgba(96, 125, 139, 1)",
        ],
        borderWidth: 1,
      },
    ],
  }

  // Chart data for watch time comparison
  const watchTimeComparisonData = {
    labels: topVideos.map((video) => (video.title.length > 15 ? video.title.substring(0, 15) + "..." : video.title)),
    datasets: [
      {
        label: "Average Watch Time (seconds)",
        data: topVideos.map((video) => video.averageWatchDuration),
        backgroundColor: "rgba(156, 39, 176, 0.7)",
        borderColor: "rgba(156, 39, 176, 1)",
        borderWidth: 1,
      },
    ],
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

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-enhanced">
      
      <main className="flex-1 container py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <BarChart className="h-6 w-6 mr-2 text-primary" />
            Admin Dashboard
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

            <Button
              variant="outline"
              onClick={() => router.push("/upload")}
              className="flex items-center gap-2 btn-enhanced"
            >
              <Upload className="h-4 w-4" />
              Upload Video
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Overview Cards */}
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" variants={itemVariants}>
              <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>


              <Card className="overflow-hidden border-t-4 border-t-orange-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalWatchEvents}</div>
                  <p className="text-xs text-muted-foreground">Video views</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(userStats.totalWatchTime)}</div>
                  <p className="text-xs text-muted-foreground">Total time spent</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts Section - Row 1 */}
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

            {/* Charts Section - Row 2 */}
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
                    Watch Time Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Bar
                    data={watchTimeComparisonData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: "Seconds",
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

            {/* Charts Section - Row 3 */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Doughnut
                    data={userStatsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Doughnut
                    data={categoryChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="top-videos">Most Watched Videos</TabsTrigger>
                  <TabsTrigger value="least-videos">Least Watched Videos</TabsTrigger>
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
                              className="flex items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                            >
                              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                {video.totalWatches}
                              </div>
                              <div className="ml-4 flex-grow">
                                <h3 className="font-medium">{video.title}</h3>
                                <div className="flex flex-wrap text-xs text-muted-foreground mt-1 gap-x-4 gap-y-1">
                                  <span>Completion Rate: {video.completionRate.toFixed(1)}%</span>
                                  <span>Avg. Duration: {formatTime(video.averageWatchDuration)}</span>
                                  <span>Category: {video.category || "Uncategorized"}</span>
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

                <TabsContent value="least-videos" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Least Watched Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {leastWatchedVideos.length > 0 ? (
                          leastWatchedVideos.map((video) => (
                            <div
                              key={video.id}
                              className="flex items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                            >
                              <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                                {video.totalWatches}
                              </div>
                              <div className="ml-4 flex-grow">
                                <h3 className="font-medium">{video.title}</h3>
                                <div className="flex flex-wrap text-xs text-muted-foreground mt-1 gap-x-4 gap-y-1">
                                  <span>Completion Rate: {video.completionRate.toFixed(1)}%</span>
                                  <span>Avg. Duration: {formatTime(video.averageWatchDuration)}</span>
                                  <span>Category: {video.category || "Uncategorized"}</span>
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
              </Tabs>
            </motion.div>
          </motion.div>
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
    </div>
  )
}

