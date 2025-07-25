"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  User,
  Calendar,
  Clock,
  PlayCircle,
  BarChart,
  Building,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { format } from "date-fns"
import { Bar, Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js"
import { toast } from "@/components/ui/use-toast"
import { CompanyFilterAdmin } from "../../components/CompanyFilterAdmin"
import * as XLSX from "xlsx"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// Types
// Update the VideoWatchEvent interface to include rewatch count
interface VideoWatchEvent {
  id: string
  videoId: string
  videoTitle: string
  userId: string
  userEmail?: string
  playlistId: string
  watchedAt: { seconds: number; nanoseconds: number }
  watchDuration: number
  completed: boolean
  isRewatch: boolean
  rewatchCount?: number
  lastRewatchedAt?: { seconds: number; nanoseconds: number }
  eventType?: string
  category?: string
  tags?: string[]
  progressPercentage?: number
  progress?: number
  lastWatchedAt?: { seconds: number; nanoseconds: number }
  firstWatchedAt?: { seconds: number; nanoseconds: number }
  startTime?: { seconds: number; nanoseconds: number }
  endTime?: { seconds: number; nanoseconds: number }
}

interface UserAnalytics {
  id: string
  name?: string
  email: string
  companyName?: string
  phoneCountryCode?: string
  phoneNumber?: string
  timeWatched: string
  timeWatchedSeconds: number
  videoCount: number
  completionRate: number
  lastActive: string
  lastActiveTimestamp: number
  viewedVideos: {
    id: string
    title: string
    watchTime: string
    watchTimeSeconds: number
    completion: string
    completionRate: number
    lastWatched: string
    lastWatchedTimestamp: number
    startTime?: string
    endTime?: string
    thumbnailUrl?: string
    publicId?: string
    category?: string
    isRewatch: boolean
    rewatchCount: number
  }[]
}

interface CompanyAnalytics {
  name: string
  userCount: number
  totalWatchTime: string
  totalWatchTimeSeconds: number
  averageCompletionRate: number
  videoCount: number
  lastActive: string
  lastActiveTimestamp: number
  users: UserAnalytics[]
}

export default function IndividualAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("users")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanyAnalytics | null>(null)
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [companyDetailsOpen, setCompanyDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserAnalytics[]>([])
  const [companies, setCompanies] = useState<CompanyAnalytics[]>([])
  const [dateRange, setDateRange] = useState("all")
  const [sortBy, setSortBy] = useState("lastActive")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [companySortBy, setCompanySortBy] = useState("userCount")
  const [companySortDirection, setCompanySortDirection] = useState<"asc" | "desc">("desc")
  const [filterCompany, setFilterCompany] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState<string | null>(null)

  // Define sortUsers and sortCompanies functions before they're used
  const sortUsers = (users: UserAnalytics[], sortField: string, direction: "asc" | "desc") => {
    return [...users].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "")
          break
        case "email":
          comparison = a.email.localeCompare(b.email)
          break
        case "company":
          comparison = (a.companyName || "").localeCompare(b.companyName || "")
          break
        case "timeWatched":
          comparison = a.timeWatchedSeconds - b.timeWatchedSeconds
          break
        case "videoCount":
          comparison = a.videoCount - b.videoCount
          break
        case "completionRate":
          comparison = a.completionRate - b.completionRate
          break
        case "lastActive":
          comparison = a.lastActiveTimestamp - b.lastActiveTimestamp
          break
        default:
          comparison = a.lastActiveTimestamp - b.lastActiveTimestamp
      }

      return direction === "asc" ? comparison : -comparison
    })
  }

  const sortCompanies = (companies: CompanyAnalytics[], sortField: string, direction: "asc" | "desc") => {
    return [...companies].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "userCount":
          comparison = a.userCount - b.userCount
          break
        case "totalWatchTime":
          comparison = a.totalWatchTimeSeconds - b.totalWatchTimeSeconds
          break
        case "averageCompletionRate":
          comparison = a.averageCompletionRate - b.averageCompletionRate
          break
        case "videoCount":
          comparison = a.videoCount - b.videoCount
          break
        case "lastActive":
          comparison = a.lastActiveTimestamp - b.lastActiveTimestamp
          break
        default:
          comparison = a.userCount - b.userCount
      }

      return direction === "asc" ? comparison : -comparison
    })
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  // Replace the fetchAnalyticsData function with this improved version
  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Fetch all users from Firestore
      const usersCollection = collection(db, "users")
      const usersSnapshot = await getDocs(usersCollection)

      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        userId: doc.data().userId,
        name: doc.data().name || "Unknown User",
        email: doc.data().email || "Unknown Email",
        companyName: doc.data().companyName || "Unknown Company",
        phoneCountryCode: doc.data().phoneCountryCode || "",
        phoneNumber: doc.data().phoneNumber || "",
      }))

      // Create a map of userId to user data for quick lookup
      const userMap = new Map()
      usersData.forEach((user) => {
        userMap.set(user.userId, user)
      })

      // Fetch watch events with appropriate date filtering
      let eventsQuery = query(
        collection(db, "videoWatchEvents"),
        orderBy("lastWatchedAt", "desc"), // Use lastWatchedAt instead of watchedAt for consistency
      )

      // Apply date filter if needed
      if (dateRange !== "all") {
        const now = new Date()
        const startDate = new Date()

        if (dateRange === "today") {
          startDate.setHours(0, 0, 0, 0)
        } else if (dateRange === "week") {
          startDate.setDate(now.getDate() - 7)
        } else if (dateRange === "month") {
          startDate.setMonth(now.getMonth() - 1)
        }

        eventsQuery = query(
          collection(db, "videoWatchEvents"),
          where("lastWatchedAt", ">=", startDate),
          orderBy("lastWatchedAt", "desc"),
        )
      }

      const eventsSnapshot = await getDocs(eventsQuery)

      // Early return if no events found
      if (eventsSnapshot.empty) {
        setUsers([])
        setCompanies([])
        setLoading(false)
        return
      }

      const events = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as VideoWatchEvent[]

      // Process user analytics
      const userAnalyticsMap = new Map<string, UserAnalytics>()
      const companyAnalyticsMap = new Map<string, CompanyAnalytics>()

      // Create a map to track unique videos watched by each user
      const userVideoMap = new Map<string, Set<string>>()

      // First pass: collect all unique videos watched by each user
      events.forEach((event) => {
        const userId = event.userId
        const videoId = event.videoId

        if (!userVideoMap.has(userId)) {
          userVideoMap.set(userId, new Set())
        }

        userVideoMap.get(userId)?.add(videoId)
      })

      // Second pass: process events to build user analytics
      for (const userId of userVideoMap.keys()) {
        const userData = userMap.get(userId)
        if (!userData) continue // Skip if user data not found

        // Get user's events
        const userEvents = events.filter((event) => event.userId === userId)
        if (userEvents.length === 0) continue

        // Find the most recent event for last active time
        const mostRecentEvent = userEvents.reduce((latest, current) => {
          const latestTime = latest.lastWatchedAt?.seconds || latest.watchedAt?.seconds || 0
          const currentTime = current.lastWatchedAt?.seconds || current.watchedAt?.seconds || 0
          return currentTime > latestTime ? current : latest
        }, userEvents[0])

        const lastActiveTimestamp = mostRecentEvent.lastWatchedAt?.seconds || mostRecentEvent.watchedAt?.seconds || 0

        // Initialize user analytics
        const userAnalytics: UserAnalytics = {
          id: userId,
          name: userData.name,
          email: userData.email || "Unknown Email",
          companyName: userData.companyName,
          phoneCountryCode: userData.phoneCountryCode,
          phoneNumber: userData.phoneNumber,
          timeWatched: "0s",
          timeWatchedSeconds: 0,
          videoCount: 0,
          completionRate: 0,
          lastActive: formatDate(lastActiveTimestamp),
          lastActiveTimestamp: lastActiveTimestamp,
          viewedVideos: [],
        }

        // Process each unique video watched by this user
        const uniqueVideos = userVideoMap.get(userId) || new Set()
        let totalWatchTimeSeconds = 0
        let completedVideosCount = 0

        for (const videoId of uniqueVideos) {
          // Get all events for this video by this user
          const videoEvents = userEvents.filter((event) => event.videoId === videoId)
          if (videoEvents.length === 0) continue
          
          // **CRITICAL**: Sort ALL events chronologically to find the absolute earliest and first completion
          // This guarantees we're using the first ever watch timestamps regardless of rewatches
          const chronologicalEvents = [...videoEvents].sort((a, b) => {
            const getEarliestTimestamp = (event: VideoWatchEvent) => {
              return event.firstWatchedAt?.seconds || 
                     event.watchedAt?.seconds || 
                     event.lastWatchedAt?.seconds || 
                     Number.MAX_SAFE_INTEGER; // If no timestamp, put at end
            };
            return getEarliestTimestamp(a) - getEarliestTimestamp(b);
          });
          
          // Find the most complete/recent event for analytics data (progress, completion, etc.)
          const mostCompleteEvent = videoEvents.reduce((best, current) => {
            // Prefer completed events
            if (current.completed && !best.completed) return current
            if (best.completed && !current.completed) return best

            // If both completed or both not completed, prefer higher progress
            const bestProgress = best.progressPercentage || best.progress || 0
            const currentProgress = current.progressPercentage || current.progress || 0
            if (currentProgress > bestProgress) return current
            if (bestProgress > currentProgress) return best

            // If progress is the same, prefer more recent
            const bestTime = best.lastWatchedAt?.seconds || best.watchedAt?.seconds || 0
            const currentTime = current.lastWatchedAt?.seconds || current.watchedAt?.seconds || 0
            return currentTime > bestTime ? current : best
          }, videoEvents[0])

          // Calculate total watch time for this video
          const videoWatchTime = videoEvents.reduce((total, event) => {
            return total + (event.watchDuration || 0)
          }, 0)

          // Apply a minimum watch time (at least 1 second) if there's evidence the user viewed the video
          // For completed videos, ensure a meaningful watch time is shown (at least 30 seconds)
          let adjustedWatchTime = videoWatchTime;
          if (mostCompleteEvent.completed && videoWatchTime < 30) {
            console.log(`Video ${videoId} marked as completed but has low watch time (${videoWatchTime}s). Setting to 30s minimum.`);
            adjustedWatchTime = 30; // Minimum 30 seconds for completed videos
          } else if (videoWatchTime === 0 && videoEvents.length > 0) {
            adjustedWatchTime = 1; // Minimum 1 second for videos with events but no recorded duration
          }

          totalWatchTimeSeconds += adjustedWatchTime
 
          // Determine if this is a rewatch and get rewatch count - still track this for future use
          const isRewatch = !!mostCompleteEvent.isRewatch;
          const rewatchCount = mostCompleteEvent.rewatchCount || 0;

          // Determine completion status
          // If marked as completed in database, always show 100%
          const isCompleted = mostCompleteEvent.completed;
          
          // Even if reported progress is 0 but the user has played the video, consider it at least 1% complete
          // For completed videos, ensure 100%
          const actualProgress = 
            isCompleted ? 100 :
            (mostCompleteEvent.progressPercentage || mostCompleteEvent.progress || 0);
            
          const adjustedProgress = 
            isCompleted ? 100 :
            (actualProgress === 0 && adjustedWatchTime > 0 ? 1 : actualProgress);

          if (isCompleted) {
            completedVideosCount++
          }

          // Get the most recent watch time - this is the only thing that should update with rewatches
          const lastWatchedTimestamp =
            mostCompleteEvent.lastWatchedAt?.seconds || mostCompleteEvent.watchedAt?.seconds || 0

          // **CRITICAL**: ALWAYS use the FIRST event chronologically for the start time
          // This guarantees we're using the absolute first watch time regardless of rewatches
          const firstEventEver = chronologicalEvents[0];
          const startTimestamp = firstEventEver.startTime?.seconds ||
                                 firstEventEver.firstWatchedAt?.seconds || 
                                 firstEventEver.watchedAt?.seconds || 
                                 firstEventEver.lastWatchedAt?.seconds || 0;
          
          // For end time, use ONLY the endTime field from the first completed event
          let endTimestamp = 0;
          const firstCompletionEvent = chronologicalEvents.find(e => e.completed);
          if (firstCompletionEvent && firstCompletionEvent.endTime?.seconds) {
            endTimestamp = firstCompletionEvent.endTime.seconds;
          } else {
            endTimestamp = 0; // No end time available
          }
          
          console.log(`Video ${videoId}: Using FIXED timestamps - Start: ${new Date(startTimestamp * 1000).toLocaleString()}, End: ${new Date(endTimestamp * 1000).toLocaleString()}`);
          
          // Ensure start and end times are different for better UX
          if (startTimestamp > 0 && endTimestamp > 0) {
            if (isCompleted && (endTimestamp - startTimestamp < 10)) {
              // For completed videos, ensure at least 10 seconds difference
              endTimestamp = startTimestamp + 10;
            } else if (startTimestamp === endTimestamp) {
              // For other videos, ensure at least 1 second difference
              endTimestamp = startTimestamp + 1;
            }
          }
          
          // Format timestamps for display
          const formattedStartTime = startTimestamp ? formatTimestamp(startTimestamp) : "Unknown";
          const formattedEndTime = endTimestamp ? formatTimestamp(endTimestamp) : "-";
          
          // Add to viewed videos
          userAnalytics.viewedVideos.push({
            id: videoId,
            title: mostCompleteEvent.videoTitle || "Unknown Video",
            watchTime: formatTime(adjustedWatchTime),
            watchTimeSeconds: adjustedWatchTime,
            completion: isCompleted
              ? "100%"
              : `${Math.max(1, Math.round(adjustedProgress))}%`, // Show at least 1% if watched
            completionRate: isCompleted
              ? 1
              : Math.max(0.01, adjustedProgress / 100), // At least 1% completion rate if watched
            startTime: formattedStartTime, 
            endTime: formattedEndTime,
            lastWatched: formatDate(lastWatchedTimestamp),
            lastWatchedTimestamp: lastWatchedTimestamp,
            category: mostCompleteEvent.category || "Uncategorized",
            isRewatch: isRewatch,
            rewatchCount: rewatchCount,
          })
        }

        // Update user analytics with calculated values
        userAnalytics.videoCount = userAnalytics.viewedVideos.length
        userAnalytics.timeWatchedSeconds = totalWatchTimeSeconds
        userAnalytics.timeWatched = formatTime(totalWatchTimeSeconds)
        userAnalytics.completionRate =
          userAnalytics.viewedVideos.length > 0 ? completedVideosCount / userAnalytics.viewedVideos.length : 0

        // Add to user analytics map
        userAnalyticsMap.set(userId, userAnalytics)

        // Process company analytics
    // When creating the company key in fetchAnalyticsData
          const companyName = userData.companyName || "Unknown Company"
          const normalizedCompanyName = companyName.trim() // Remove any extra spaces
          const companyKey = normalizedCompanyName.toLowerCase() // Convert to lowercase for comparison

          // When initializing a new company entry
          if (!companyAnalyticsMap.has(companyKey)) {
            companyAnalyticsMap.set(companyKey, {
              name: normalizedCompanyName.charAt(0).toUpperCase() + normalizedCompanyName.slice(1), // Capitalize first letter
              userCount: 0,
              totalWatchTime: "0s",
              totalWatchTimeSeconds: 0,
              averageCompletionRate: 0,
              videoCount: 0,
              lastActive: userAnalytics.lastActive,
              lastActiveTimestamp: userAnalytics.lastActiveTimestamp,
              users: [],
            })
          }


        const companyAnalytics = companyAnalyticsMap.get(companyKey)!

        // Add user to company if not already added
        if (!companyAnalytics.users.some((u) => u.id === userId)) {
          companyAnalytics.users.push(userAnalytics)
          companyAnalytics.userCount = companyAnalytics.users.length
        }

        // Update company stats
        companyAnalytics.totalWatchTimeSeconds += userAnalytics.timeWatchedSeconds
        companyAnalytics.totalWatchTime = formatTime(companyAnalytics.totalWatchTimeSeconds)

        // Count unique videos across all company users
        const companyVideos = new Set<string>()
        companyAnalytics.users.forEach((user) => {
          user.viewedVideos.forEach((video) => {
            companyVideos.add(video.id)
          })
        })
        companyAnalytics.videoCount = companyVideos.size

        // Update company's last active time if this user's last active time is more recent
        if (userAnalytics.lastActiveTimestamp > companyAnalytics.lastActiveTimestamp) {
          companyAnalytics.lastActive = userAnalytics.lastActive
          companyAnalytics.lastActiveTimestamp = userAnalytics.lastActiveTimestamp
        }
      }

      // Calculate average completion rate for each company
      companyAnalyticsMap.forEach((company) => {
        const totalCompletionRate = company.users.reduce((sum, user) => sum + user.completionRate, 0)
        company.averageCompletionRate = company.users.length > 0 ? totalCompletionRate / company.users.length : 0
      })

      // Convert maps to arrays
      const userAnalyticsArray = Array.from(userAnalyticsMap.values())
      const companyAnalyticsArray = Array.from(companyAnalyticsMap.values())

      // Sort users and companies
      const sortedUsers = sortUsers(userAnalyticsArray, sortBy, sortDirection)
      const sortedCompanies = sortCompanies(companyAnalyticsArray, companySortBy, companySortDirection)

      setUsers(sortedUsers)
      setCompanies(sortedCompanies)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: string) => {
    if (field === sortBy) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDirection("desc")
    }

    setUsers(sortUsers(users, field, sortDirection === "asc" ? "desc" : "asc"))
  }

  const handleCompanySort = (field: string) => {
    if (field === companySortBy) {
      setCompanySortDirection(companySortDirection === "asc" ? "desc" : "asc")
    } else {
      setCompanySortBy(field)
      setCompanySortDirection("desc")
    }

    setCompanies(sortCompanies(companies, field, companySortDirection === "asc" ? "desc" : "asc"))
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const openUserDetails = (user: UserAnalytics) => {
    setSelectedUser(user)
    setUserDetailsOpen(true)
  }

  const openCompanyDetails = (company: CompanyAnalytics) => {
    setSelectedCompany(company)
    setCompanyDetailsOpen(true)
  }

  const formatDate = (seconds: number): string => {
    if (!seconds) return "Unknown"

    const now = new Date()
    const date = new Date(seconds * 1000)

    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    const diffHours = Math.round(diffMs / 3600000)
    const diffDays = Math.round(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
    } else {
      return format(date, "MMM d, yyyy")
    }
  }

  // Format timestamp as actual date and time
  const formatTimestamp = (seconds: number): string => {
    if (!seconds) {
      // If we don't have a timestamp, check if it's for a completed video
      // If completed and showing as "Unknown", show a note that it's from historical data
      return "Historical data";
    }
    const date = new Date(seconds * 1000)
    return format(date, "MMM d, yyyy h:mm a")
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}m ${remainingSeconds}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  // Update the filtered users and companies logic to correctly match the company ID format
  const uniqueUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email }))
  const filteredUsers = users.filter(
    (user) => {
      // Basic search term filter
      const matchesSearch = 
        (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.companyName?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      
      // Company filter - need to normalize company name to match filter format
      const matchesCompany = !filterCompany || 
        (user.companyName && user.companyName.toLowerCase().replace(/\s+/g, '_') === filterCompany);
      
      // User filter
      const matchesUser = !filterUser || user.id === filterUser;
      
      return matchesSearch && matchesCompany && matchesUser;
    }
  )

  const filteredCompanies = companies.filter(
    (company) => {
      // Basic search term filter
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Company filter - use normalized company name
      const normalizedCompanyName = company.name.toLowerCase().replace(/\s+/g, '_');
      const matchesCompany = !filterCompany || normalizedCompanyName === filterCompany;
      
      return matchesSearch && matchesCompany;
    }
  )

  // Handle company filter change
  const handleCompanyFilterChange = (companyName: string | null) => {
    setFilterCompany(companyName);
  }

  // Prepare chart data for user details
  const getUserCategoryData = (user: UserAnalytics) => {
    const categories = user.viewedVideos.reduce(
      (acc, video) => {
        const category = video.category || "Uncategorized"
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      labels: Object.keys(categories),
      datasets: [
        {
          data: Object.values(categories),
          backgroundColor: [
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 99, 132, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  // Prepare chart data for company details
  const getCompanyUserActivityData = (company: CompanyAnalytics) => {
    // Sort users by watch time
    const topUsers = [...company.users].sort((a, b) => b.timeWatchedSeconds - a.timeWatchedSeconds).slice(0, 10)

    return {
      labels: topUsers.map((user) => user.name || user.email),
      datasets: [
        {
          label: "Watch Time (minutes)",
          data: topUsers.map((user) => Math.round(user.timeWatchedSeconds / 60)),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    }
  }

  // Helper function to find company name from ID
  const getCompanyNameFromId = (companyId: string | null): string => {
    if (!companyId) return "All Companies";
    
    const company = companies.find(c => 
      c.name.toLowerCase().replace(/\s+/g, '_') === companyId
    );
    
    return company?.name || companyId;
  }

  return (
    <div className="space-y-6">

      {/* Update the header controls section for better spacing and layout */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-8">Individual Analytics</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-3 flex-wrap">
            <TabsList>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="companies" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Companies
              </TabsTrigger>
            </TabsList>
            <div className="relative w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users or companies..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex-shrink-0">
              <CompanyFilterAdmin
                selectedCompany={filterCompany}
                onFilterChange={handleCompanyFilterChange}
              />
            </div>
            <div className="flex-shrink-0">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="flex-shrink-0" onClick={fetchAnalyticsData}>
              Refresh
            </Button>
            <Button
              variant="outline"
              className="flex-shrink-0"
              onClick={() => {
                if (filteredUsers.length === 0) {
                  toast({
                    title: "No users to export",
                    description: "There are no users to export to Excel.",
                    variant: "destructive",
                  })
                  return
                }
                const data = filteredUsers.map((user) => ({
                  "Name": user.name || "Unknown User",
                  "Email": user.email,
                  "Company": user.companyName || "Unknown Company",
                  "Phone": `${user.phoneCountryCode || ''} ${user.phoneNumber || '-'}`.trim(),
                  "Videos Watched": user.videoCount,
                  "Watch Time": user.timeWatched,
                  "Completion Rate": `${(user.completionRate * 100).toFixed(0)}%`,
                  "Last Active": user.lastActive,
                }))
                const ws = XLSX.utils.json_to_sheet(data)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, "Users Summary")
                XLSX.writeFile(wb, `all-users-summary.xlsx`)
              }}
            >
              Download 
            </Button>
          </div>
          <TabsContent value="users" className="mt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground mb-2">No users found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? `No results matching "${searchTerm}"` : "There are no users to display yet"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleSort("name")}
                            >
                              User
                              {sortBy === "name" &&
                                (sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleSort("company")}
                            >
                              Company
                              {sortBy === "company" &&
                                (sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleSort("videoCount")}
                            >
                              Videos Watched
                              {sortBy === "videoCount" &&
                                (sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleSort("timeWatched")}
                            >
                              Watch Time
                              {sortBy === "timeWatched" &&
                                (sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleSort("completionRate")}
                            >
                              Completion Rate
                              {sortBy === "completionRate" &&
                                (sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleSort("lastActive")}
                            >
                              Last Active
                              {sortBy === "lastActive" &&
                                (sortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow
                            key={user.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openUserDetails(user)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{user.name || "Unknown User"}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.companyName || "Unknown Company"}</TableCell>
                            <TableCell>{user.videoCount}</TableCell>
                            <TableCell>{user.timeWatched}</TableCell>
                            <TableCell>{(user.completionRate * 100).toFixed(0)}%</TableCell>
                            <TableCell>{user.lastActive}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openUserDetails(user)
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="companies" className="mt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                    <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground mb-2">No companies found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? `No results matching "${searchTerm}"` : "There are no companies to display yet"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleCompanySort("name")}
                            >
                              Company Name
                              {companySortBy === "name" &&
                                (companySortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleCompanySort("userCount")}
                            >
                              Users
                              {companySortBy === "userCount" &&
                                (companySortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleCompanySort("videoCount")}
                            >
                              Videos Watched
                              {companySortBy === "videoCount" &&
                                (companySortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleCompanySort("totalWatchTime")}
                            >
                              Total Watch Time
                              {companySortBy === "totalWatchTime" &&
                                (companySortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleCompanySort("averageCompletionRate")}
                            >
                              Avg. Completion
                              {companySortBy === "averageCompletionRate" &&
                                (companySortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 p-0 font-semibold"
                              onClick={() => handleCompanySort("lastActive")}
                            >
                              Last Active
                              {companySortBy === "lastActive" &&
                                (companySortDirection === "asc" ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                ))}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow
                            key={company.name}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openCompanyDetails(company)}
                          >
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>{company.userCount}</TableCell>
                            <TableCell>{company.videoCount}</TableCell>
                            <TableCell>{company.totalWatchTime}</TableCell>
                            <TableCell>{(company.averageCompletionRate * 100).toFixed(0)}%</TableCell>
                            <TableCell>{company.lastActive}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openCompanyDetails(company)
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
      </div>

      {/* Show active filters if company filter is applied */}
      {filterCompany && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            Filtering by company: <strong>{getCompanyNameFromId(filterCompany)}</strong>
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFilterCompany(null)}
            className="h-7 text-blue-700 hover:text-blue-800"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">User Analytics: {selectedUser?.name || selectedUser?.email}</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Videos Watched
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedUser.videoCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Total Watch Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedUser.timeWatched}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <BarChart className="h-4 w-4 mr-1" />
                      Completion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(selectedUser.completionRate * 100).toFixed(0)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Last Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedUser.lastActive}</div>
                  </CardContent>
                </Card>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Categories Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Video Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] flex items-center justify-center">
                    {selectedUser.viewedVideos.length > 0 ? (
                      <Doughnut
                        data={getUserCategoryData(selectedUser)}
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
                    ) : (
                      <div className="text-center text-muted-foreground">No video data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* User Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">User Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                        <p>{selectedUser.name || "Unknown"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                        <p>{selectedUser.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
                        <p>{selectedUser.companyName || "Unknown"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                        <p>{(selectedUser.phoneCountryCode || "")} {(selectedUser.phoneNumber || "-")}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Activity Summary</h3>
                        <p>
                          Watched {selectedUser.videoCount} videos with a total watch time of {selectedUser.timeWatched}
                          . Completed {(selectedUser.completionRate * 100).toFixed(0)}% of videos watched.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Download Button */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!selectedUser) return;
                    const data = selectedUser.viewedVideos.map((video) => ({
                      "Video Title": video.title,
                      "Category": video.category || "Uncategorized",
                      "Watch Time": video.watchTime,
                      "Completion": video.completion,
                      "Start Time": video.startTime || "-",
                      "End Time": video.endTime || "-",
                      "Last Watched": video.lastWatched,
                    }))
                    const ws = XLSX.utils.json_to_sheet(data)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, "Watched Videos")
                    XLSX.writeFile(wb, `${selectedUser.name || selectedUser.email}-watched-videos.xlsx`)
                  }}
                >
                  Download Excel
                </Button>
              </div>

              {/* Watched Videos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Watched Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedUser.viewedVideos.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">No videos watched yet</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Video Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Watch Time</TableHead>
                          <TableHead>Completion</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Last Watched</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.viewedVideos
                          .sort((a, b) => b.lastWatchedTimestamp - a.lastWatchedTimestamp)
                          .map((video) => (
                            <TableRow key={video.id}>
                              <TableCell className="font-medium">{video.title}</TableCell>
                              <TableCell>{video.category || "Uncategorized"}</TableCell>
                              <TableCell>{video.watchTime}</TableCell>
                              <TableCell>{video.completion}</TableCell>
                              <TableCell>{video.startTime || "-"}</TableCell>
                              <TableCell>{video.endTime || "-"}</TableCell>
                              <TableCell>{video.lastWatched}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Company Details Dialog */}
      <Dialog open={companyDetailsOpen} onOpenChange={setCompanyDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Company Analytics: {selectedCompany?.name}</DialogTitle>
          </DialogHeader>

          {selectedCompany && (
            <div className="space-y-6">
              {/* Company Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Total Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCompany.userCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Videos Watched
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCompany.videoCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Total Watch Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCompany.totalWatchTime}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <BarChart className="h-4 w-4 mr-1" />
                      Avg. Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(selectedCompany.averageCompletionRate * 100).toFixed(0)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Activity</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {selectedCompany.users.length > 0 ? (
                    <Bar
                      data={getCompanyUserActivityData(selectedCompany)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Watch Time (minutes)",
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                      No user activity data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Company Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Users ({selectedCompany.users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCompany.users.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">No users in this company</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Videos Watched</TableHead>
                          <TableHead>Watch Time</TableHead>
                          <TableHead>Completion Rate</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCompany.users
                          .sort((a, b) => b.timeWatchedSeconds - a.timeWatchedSeconds)
                          .map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{user.name || "Unknown User"}</span>
                                  <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>{user.videoCount}</TableCell>
                              <TableCell>{user.timeWatched}</TableCell>
                              <TableCell>{(user.completionRate * 100).toFixed(0)}%</TableCell>
                              <TableCell>{user.lastActive}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCompanyDetailsOpen(false)
                                    setTimeout(() => {
                                      setSelectedUser(user)
                                      setUserDetailsOpen(true)
                                    }, 100)
                                  }}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
