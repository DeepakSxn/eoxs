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
}

export default function FeedbackPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [videoFeedbackItems, setVideoFeedbackItems] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterVideo, setFilterVideo] = useState<string>("all")
  const [uniqueVideos, setUniqueVideos] = useState<{ id: string; title: string }[]>([])

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

      const [feedbackDocs, videoFeedbackDocs, recommendationDocs] = await Promise.all([
        getDocs(feedbackQuery),
        getDocs(videoFeedbackQuery),
        getDocs(recommendationsQuery),
      ])

      // Process completion feedback
      const completionFeedback: FeedbackItem[] = feedbackDocs.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            type: "video_completion",
          }) as FeedbackItem,
      )

      // Process video-specific feedback
      const videoFeedback: FeedbackItem[] = videoFeedbackDocs.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            type: "video_specific",
            rating: doc.data().rating || 0,
          }) as FeedbackItem,
      )

      // Process recommendations
      const recommendations: FeedbackItem[] = recommendationDocs.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            type: "playlist_creation",
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

  const filteredVideoFeedback =
    filterVideo === "all" ? videoFeedbackItems : videoFeedbackItems.filter((item) => item.videoId === filterVideo)

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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
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
                    {feedbackItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No completion feedback available</p>
                    ) : (
                      feedbackItems
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
                  <div className="mb-4">
                    <Select value={filterVideo} onValueChange={handleVideoFilterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by video" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Videos</SelectItem>
                        {uniqueVideos.map((video) => (
                          <SelectItem key={video.id} value={video.id}>
                            {video.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
            {feedbackItems
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
          <div className="mb-4">
            <Select value={filterVideo} onValueChange={handleVideoFilterChange}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Filter by video" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Videos</SelectItem>
                {uniqueVideos.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
                    {video.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
