"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import type { User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Lightbulb, Star } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import React from "react"
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command"

interface FeedbackItem {
  id: string
  userId: string
  userEmail: string
  playlistId?: string
  videoId?: string
  videoTitle?: string
  feedback: string
  recommendation?: string
  type: "video_completion" | "playlist_creation" | "video_specific"
  createdAt: any
  rating?: number
  companyName?: string // <-- add companyName
}

export default function FeedbackPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [videoFeedbackItems, setVideoFeedbackItems] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterVideo, setFilterVideo] = useState<string>("all")
  const [uniqueVideos, setUniqueVideos] = useState<{ id: string; title: string }[]>([])
  const [uniqueCompanies, setUniqueCompanies] = useState<string[]>([])
  const [filterCompany, setFilterCompany] = useState<string>("all")
  const [uniqueUsers, setUniqueUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [filterUser, setFilterUser] = useState<string>("all")

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)
    })

    loadFeedback()
    return () => unsubscribe()
  }, [router])

  const loadFeedback = async () => {
    try {
      setIsLoading(true)
      // Query for completion feedback
      const feedbackQuery = query(collection(db, "feedback"), orderBy("createdAt", "desc"))

      // Query for video-specific feedback
      const videoFeedbackQuery = query(collection(db, "videoFeedbacks"), orderBy("createdAt", "desc"))

      const recommendationsQuery = query(collection(db, "recommendations"), orderBy("createdAt", "desc"))

      // Fetch all users for company name and user name mapping
      const usersSnapshot = await getDocs(collection(db, "users"))
      const userMap = new Map()
      const userNameEmailMap = new Map<string, { name: string; email: string }>()
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data()
        userMap.set(data.userId, data.companyName || "Unknown Company")
        if (data.userId && (data.name || data.email)) {
          userNameEmailMap.set(data.userId, { name: data.name || "", email: data.email || "" })
        }
      })

      const [feedbackDocs, videoFeedbackDocs, recommendationDocs] = await Promise.all([
        getDocs(feedbackQuery),
        getDocs(videoFeedbackQuery),
        getDocs(recommendationsQuery),
      ])

      // Process completion feedback
      const completionFeedback: FeedbackItem[] = feedbackDocs.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "video_completion",
          companyName: doc.data().companyName || userMap.get(doc.data().userId) || "Unknown Company",
        }) as FeedbackItem,
      )

      // Process video-specific feedback
      const videoFeedback: FeedbackItem[] = videoFeedbackDocs.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "video_specific",
          rating: doc.data().rating || 0,
          companyName: doc.data().companyName || userMap.get(doc.data().userId) || "Unknown Company",
        }) as FeedbackItem,
      )

      // Process recommendations
      const recommendations: FeedbackItem[] = recommendationDocs.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "playlist_creation",
          companyName: doc.data().companyName || userMap.get(doc.data().userId) || "Unknown Company",
        }) as FeedbackItem,
      )

      // Combine completion feedback and recommendations
      setFeedbackItems([...completionFeedback, ...recommendations])

      // Set video-specific feedback separately
      setVideoFeedbackItems(videoFeedback)

      // Extract unique videos for filtering
      const videos = new Map<string, string>()
      videoFeedback.forEach((item) => {
        if (item.videoId && item.videoTitle) {
          videos.set(item.videoId, item.videoTitle)
        }
      })

      setUniqueVideos(Array.from(videos.entries()).map(([id, title]) => ({ id, title })))

      // Extract unique companies for filtering (case-insensitive, preserve display casing)
      const companiesMap = new Map<string, string>()
      ;[...completionFeedback, ...videoFeedback, ...recommendations].forEach(item => {
        if (item.companyName) {
          const key = item.companyName.trim().toLowerCase()
          if (!companiesMap.has(key)) {
            companiesMap.set(key, item.companyName.trim())
          }
        }
      })
      setUniqueCompanies(Array.from(companiesMap.values()))

      // Extract unique users for filtering (use name from users collection, fallback to email)
      const usersMap = new Map<string, { name: string; email: string }>()
      ;[...completionFeedback, ...videoFeedback, ...recommendations].forEach(item => {
        if (item.userId) {
          const userInfo = userNameEmailMap.get(item.userId)
          if (userInfo && !usersMap.has(item.userId)) {
            usersMap.set(item.userId, { name: userInfo.name, email: userInfo.email })
          } else if (item.userEmail && !usersMap.has(item.userId)) {
            usersMap.set(item.userId, { name: "", email: item.userEmail })
          }
        }
      })
      setUniqueUsers(Array.from(usersMap.entries()).map(([id, { name, email }]) => ({ id, name, email })))
    } catch (error) {
      console.error("Error fetching feedback:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp.seconds * 1000).toLocaleDateString()
  }

  const handleVideoFilterChange = (value: string) => {
    setFilterVideo(value)
  }

  const handleCompanyFilterChange = (value: string) => {
    setFilterCompany(value)
  }

  // Reusable filter dropdowns
  function CompanyFilterDropdown({ value, onChange, companies }: { value: string, onChange: (value: string) => void, companies: string[] }) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Filter by company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company} value={company}>{company}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  function UserFilterDropdown({ value, onChange, users }: { value: string, onChange: (value: string) => void, users: { id: string; name: string; email: string }[] }) {
    const [open, setOpen] = React.useState(false);
    const selectedUser = users.find(u => u.id === value);
    return (
      <>
        <button
          type="button"
          className="w-[300px] h-10 border rounded-md px-3 text-left bg-background flex items-center justify-between"
          onClick={() => setOpen(true)}
        >
          <span className="truncate">
            {value === "all"
              ? "All Users"
              : selectedUser?.name || selectedUser?.email || "Unknown User"}
          </span>
          <svg className="ml-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandItem
              value="all"
              onSelect={() => {
                onChange("all");
                setOpen(false);
              }}
              className={value === "all" ? "bg-accent text-accent-foreground" : ""}
            >
              All Users
            </CommandItem>
            {users.length === 0 && (
              <CommandEmpty>No users found</CommandEmpty>
            )}
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.name || user.email}
                onSelect={() => {
                  onChange(user.id);
                  setOpen(false);
                }}
                className={value === user.id ? "bg-accent text-accent-foreground" : ""}
              >
                <div className="flex flex-col">
                  <span>{user.name || "Unknown User"}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </CommandDialog>
      </>
    )
  }

  const filteredFeedbackItems = feedbackItems.filter(item => {
    const companyMatch = filterCompany === "all" ? true : (item.companyName?.trim().toLowerCase() || "") === filterCompany.trim().toLowerCase();
    const userMatch = filterUser === "all" ? true : item.userId === filterUser;
    return companyMatch && userMatch;
  });

  const filteredVideoFeedback = videoFeedbackItems.filter(item => {
    const companyMatch = filterCompany === "all" ? true : (item.companyName?.trim().toLowerCase() || "") === filterCompany.trim().toLowerCase();
    const userMatch = filterUser === "all" ? true : item.userId === filterUser;
    return companyMatch && userMatch;
  });

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Feedback</h1>
        <p className="text-muted-foreground mt-2">
          View feedback from users after completing videos and specific video reviews.
        </p>
      </div>

      {/* Filter dropdowns at the top right */}
    

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="mb-0">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              All Feedback
            </TabsTrigger>
            <TabsTrigger value="completion" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Completion Feedback
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Video Reviews
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-4 items-center justify-end">
            <CompanyFilterDropdown value={filterCompany} onChange={handleCompanyFilterChange} companies={uniqueCompanies} />
            <UserFilterDropdown value={filterUser} onChange={setFilterUser} users={uniqueUsers} />
          </div>
        </div>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Completion Feedback Column */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Completion Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <div className="grid gap-4">
                    {filteredFeedbackItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No completion feedback available</p>
                    ) : (
                      filteredFeedbackItems
                        .filter((item) => item.type === "video_completion")
                        .map((item) => (
                          <Card key={item.id} className="border-l-4 border-l-primary">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="font-medium">{item.userEmail}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Submitted on {formatDate(item.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm">{item.feedback}</p>
                            </CardContent>
                          </Card>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Video Reviews Column */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Video Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <div className="grid gap-4">
                    {filteredVideoFeedback.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No video reviews available</p>
                    ) : (
                      filteredVideoFeedback.map((item) => (
                        <Card key={item.id} className="border-l-4 border-l-amber-500">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{item.userEmail}</p>
                                <p className="text-xs text-muted-foreground">
                                  Submitted on {formatDate(item.createdAt)}
                                </p>
                                {item.videoTitle && (
                                  <Badge variant="outline" className="mt-1">
                                    {item.videoTitle}
                                  </Badge>
                                )}
                              </div>
                              {item.rating && (
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < item.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-sm mt-2">{item.feedback}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
 
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="completion">
          <div className="grid gap-4">
            {filteredFeedbackItems
              .filter((item) => item.type === "video_completion")
              .map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium">{item.userEmail}</p>
                        <p className="text-sm text-muted-foreground">Submitted on {formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm">{item.feedback}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="video">
          <div className="grid gap-4">
            {filteredVideoFeedback.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{item.userEmail}</p>
                      <p className="text-xs text-muted-foreground">Submitted on {formatDate(item.createdAt)}</p>
                      {item.videoTitle && (
                        <Badge variant="outline" className="mt-1">
                          {item.videoTitle}
                        </Badge>
                      )}
                    </div>
                    {item.rating && (
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < item.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm mt-2">{item.feedback}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}