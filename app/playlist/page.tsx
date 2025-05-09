"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ListMusic, ArrowLeft, Trash2 } from "lucide-react"

export default function PlaylistPage() {
  const [playlistVideos, setPlaylistVideos] = useState<any[]>([])
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("currentPlaylist")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.videos)) {
          setPlaylistVideos(parsed.videos.filter((v: any) => v.category !== "Company Introduction" && v.category !== "Miscellaneous"))
        }
      } catch {}
    }
  }, [])

  const handleRemove = (id: string) => {
    setConfirmRemoveId(id)
  }

  const confirmRemove = () => {
    if (!confirmRemoveId) return
    const stored = localStorage.getItem("currentPlaylist")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.videos)) {
          const updated = parsed.videos.filter((v: any) => v.id !== confirmRemoveId)
          parsed.videos = updated
          localStorage.setItem("currentPlaylist", JSON.stringify(parsed))
          setPlaylistVideos(updated.filter((v: any) => v.category !== "Company Introduction" && v.category !== "Miscellaneous"))
        }
      } catch {}
    }
    setConfirmRemoveId(null)
  }

  const handleWatchPlaylist = () => {
    if (playlistVideos.length > 0) {
      const firstVideoId = playlistVideos[0].id
      router.push(`/video-player?playlistId=custom-playlist&videoId=${firstVideoId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 flex items-center px-4 shadow-sm">
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <img src="/light.webp" height={120} width={80} alt="logo" />
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center pt-14 pb-4">
        <div className="w-full max-w-lg animate-fade-in-up">
          <Button variant="outline" className="mb-2 flex items-center gap-2" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <div className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 shadow">
              <ListMusic className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">My Playlist</h2>
            {playlistVideos.length === 0 ? (
              <div className="text-gray-500 mt-4">No videos selected</div>
            ) : (
              <>
                <ul className="w-full space-y-2 mb-4">
                  {playlistVideos.map((video: any) => (
                    <li key={video.id} className="flex items-center justify-between gap-2 bg-green-50 hover:bg-green-100 transition rounded px-3 py-2 shadow-sm">
                      <span className="truncate font-medium text-gray-800">{video.title}</span>
                      <button
                        className="ml-2 text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition"
                        title="Remove from playlist"
                        onClick={() => handleRemove(video.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button className="mb-4 w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleWatchPlaylist} disabled={playlistVideos.length === 0}>
                  Watch Playlist
                </Button>
              </>
            )}
            {confirmRemoveId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                  <p className="mb-4 text-center">Are you sure you want to remove this video from your playlist?</p>
                  <div className="flex gap-2">
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmRemove}>Remove</Button>
                    <Button variant="outline" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 