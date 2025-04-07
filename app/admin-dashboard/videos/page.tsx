"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore"
import type { User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Trash2, PlayCircle, Edit, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

interface Video {
  id: string
  title: string
  description?: string
  category?: string
  videoUrl?: string
  publicId?: string
  createdAt: any
  views?: number
  watchTime?: number
  engagement?: number
  tags?: string[]
}

export default function VideosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editedVideo, setEditedVideo] = useState<Partial<Video>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)
    })

    loadVideos()
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    // Filter videos when category changes
    if (selectedCategory === "all") {
      setFilteredVideos(videos)
    } else {
      setFilteredVideos(videos.filter((video) => video.category === selectedCategory))
    }
  }, [selectedCategory, videos])

  const loadVideos = async () => {
    try {
      setIsLoading(true)
      setIsRefreshing(true)

      // Get video watch events to calculate views
      const eventsQuery = query(collection(db, "videoWatchEvents"), where("eventType", "==", "play"))
      const eventsSnapshot = await getDocs(eventsQuery)

      // Count views per video
      const viewsMap = new Map<string, number>()
      const watchTimeMap = new Map<string, number>()

      eventsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const videoId = data.videoId

        // Count views
        viewsMap.set(videoId, (viewsMap.get(videoId) || 0) + 1)

        // Sum watch time
        if (data.watchDuration) {
          watchTimeMap.set(videoId, (watchTimeMap.get(videoId) || 0) + data.watchDuration)
        }
      })

      // Get videos
      const videosSnapshot = await getDocs(collection(db, "videos"))
      const videoData = videosSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt,
          title: data.title || "Untitled Video",
          views: viewsMap.get(doc.id) || 0,
          watchTime: watchTimeMap.get(doc.id) ? Math.round(((watchTimeMap.get(doc.id) || 0) / 3600) * 100) / 100 : 0, // Convert seconds to hours with 2 decimal places
        }
      }) as Video[]

      // Extract unique categories
      const uniqueCategories = new Set<string>()
      videoData.forEach((video) => {
        if (video.category) {
          uniqueCategories.add(video.category)
        }
      })

      setCategories(Array.from(uniqueCategories))
      setVideos(videoData)
      setFilteredVideos(videoData)
    } catch (error) {
      console.error("Error fetching videos:", error)
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return

    try {
      await deleteDoc(doc(db, "videos", videoId))
      setVideos(videos.filter((video) => video.id !== videoId))
      setFilteredVideos(filteredVideos.filter((video) => video.id !== videoId))
      toast({
        title: "Success",
        description: "Video deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      })
    }
  }

  const handlePreview = (video: Video) => {
    setSelectedVideo(video)
    setIsPreviewOpen(true)
  }

  const handleEdit = (video: Video) => {
    setSelectedVideo(video)
    setEditedVideo({
      title: video.title,
      description: video.description || "",
      category: video.category || "",
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedVideo || !editedVideo.title) return

    try {
      const videoRef = doc(db, "videos", selectedVideo.id)
      await updateDoc(videoRef, {
        title: editedVideo.title,
        description: editedVideo.description,
        category: editedVideo.category,
      })

      // Update local state
      const updatedVideos = videos.map((video) =>
        video.id === selectedVideo.id ? { ...video, ...editedVideo } : video,
      )

      setVideos(updatedVideos)
      setFilteredVideos(
        selectedCategory === "all"
          ? updatedVideos
          : updatedVideos.filter((video) => video.category === selectedCategory),
      )

      setIsEditOpen(false)
      toast({
        title: "Success",
        description: "Video updated successfully",
      })
    } catch (error) {
      console.error("Error updating video:", error)
      toast({
        title: "Error",
        description: "Failed to update video",
        variant: "destructive",
      })
    }
  }

  const handleRefresh = () => {
    loadVideos()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Videos</h1>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Watch Time (hours)</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No videos found
                </TableCell>
              </TableRow>
            ) : (
              filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{video.category || "Uncategorized"}</TableCell>
                  <TableCell>{video.views}</TableCell>
                  <TableCell>{video.watchTime}</TableCell>
                  <TableCell>
                    {video.createdAt && video.createdAt.seconds
                      ? format(new Date(video.createdAt.seconds * 1000), "PPP")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(video)}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(video)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modify
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(video.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo?.videoUrl && (
            <div className="aspect-video w-full">
              <video src={selectedVideo.videoUrl} controls className="w-full h-full rounded-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>Update the details of this video</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedVideo.title || ""}
                onChange={(e) => setEditedVideo({ ...editedVideo, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={editedVideo.category || ""}
                onValueChange={(value) => setEditedVideo({ ...editedVideo, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedVideo.description || ""}
                onChange={(e) => setEditedVideo({ ...editedVideo, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

