"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"

import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, LogOut, Clock, Play, CheckCircle, Link } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Logo } from "../components/logo"
import { auth, db } from "../firebase"
import { ThemeToggle } from "../theme-toggle"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl?: string
  duration: string
  category: string
  tags?: string[]
  createdAt: any
  watched?: boolean
}

interface Module {
  name: string
  category: string
  totalDuration: string
  videos: Video[]
}

const VIDEO_ORDER: Record<string, string[]> = {
  "Sales": [
    "Sales Module Overview",
    "Sales Order for Coils",
    "Sales Order for Plates",
    "Sales Order for Tubing & Pipes",
    "Sales order for Structural Steel",
    "Sales Orders for Bars",
    "Handling Backorder and Partial Delivery",
    "How does Buyout work in the system",
  ],
  "Processing": [
    "Processing Module Overview",
    "Applying Processing Cost to Materials",
    "Toll Processing Purchase Orders",
    "Work Order Status and Tracking for Multiple Processing Lines",
  ],
  "Inventory": [
    "Inventory Module Overview",
    "Inventory for Plate and Sheet Products",
    "Material Traceability (Heat Numbers, Mill Certificates)",
    "Inventory Valuation (FIFO, Average & Actual Costing)",
    "Scrap Management",
    "Additional Cost",
  ],
  "Purchase": [
    "Creating Purchase Order for Coils",
    "Creating Purchase Orders for Plate and sheets",
    "Creating Purchase Orders for Long Products",
    "Freight Cost on PO's",
  ],
  "Finance and Accounting": [
    "Finance Module Overview",
    "Creating Customer Invoice",
    "Creating Vendor Bills",
    "Managing Accounts Payable and Receivable",
    "Multi-Stage Invoicing for Complex Orders",
    "Financial Reporting_ P&L and Balance sheets",
    "Tax Compliance and Reporting",
    "Payment Terms",
    "Handling Customer Credits",
    "Managing Multiple Entities or Divisions",
    "Multi currency Transactions",
    "Partner Aging",
  ],
  "Shipping and Receiving": [
    "Purchase Return",
    "Generating Packing List",
  ],
  "CRM": [
    "CRM Module Overview",
    "Sales Pipeline and Leads Pipeline",
  ],
  "IT & Security": [
    "User Access Control and Role-Based Permissions",
  ],
  "Advanced Analytics & Reporting": [
    "Real-Time Dashboards for Sales, Inventory, and Processing Operations",
    "Custom Reports for Processing",
    "Tracking Lead Times for Processing & Delivery",
  ],
  "Master Data Management": [
    "Product Master Creation and Management",
    "Warehouse Master and Location Managment",
    "Unit of Measure Setup (Pounds, Kg, Foot, Inches, CWT, etc.)",
  ],
  "Contact Management": [
    "Contacts Module Overview",
    "Managing Customer Contacts",
    "Managing Supplier & Vendor Contacts",
    "Configuring Custom Fields and Grouping Contacts",
    "Maps Feature",
    "Days Feature",
    "Email",
    "Credit Management",
  ],
  "QA": [
    "Mill Certs",
  ],
};

const MODULE_ORDER = [
  "Sales",
  "Processing",
  "Inventory",
  "Purchase",
  "Finance and Accounting",
  "Shipping and Receiving",
  "CRM",
  "IT & Security",
  "Advanced Analytics & Reporting",
  "Master Data Management",
  "Toll Processing",
  "Contact Management",
  "QA",
];

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [modules, setModules] = useState<Module[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [expandedModules, setExpandedModules] = useState<string[]>([])

  const router = useRouter()

  const globalCheckboxRef = useRef<HTMLButtonElement>(null);
  const moduleCheckboxRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Check for navigation flag
    const navigationOccurred = sessionStorage.getItem("navigationOccurred")
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
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)


        fetchVideos(currentUser.uid)
      } else {
        // Redirect to login if not authenticated
        router.push("/login")
      }
    })

    // Handle browser navigation
    const handleBeforeUnload = () => {
      sessionStorage.setItem("navigationOccurred", "true")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [router])

  useEffect(() => {
    // Filter videos based on search query
    if (!searchQuery) {
      setFilteredVideos(videos)
      return
    }

    const lowerCaseQuery = searchQuery.toLowerCase()
    const filtered = videos.filter(
      (video) =>
        video.title.toLowerCase().includes(lowerCaseQuery) ||
        (video.tags && video.tags.some((tag) => tag.toLowerCase().includes(lowerCaseQuery))) ||
        (video.description && video.description.toLowerCase().includes(lowerCaseQuery)),
    )

    setFilteredVideos(filtered)
  }, [searchQuery, videos])

  useEffect(() => {
    if (filteredVideos.length > 0) {
      organizeVideosIntoModules()
    }
  }, [filteredVideos])

  // Helper function to ensure valid URLs
  const getSafeUrl = (url: string | undefined): string => {
    if (!url) return "/placeholder.svg?height=180&width=320"
    try {
      // Test if it's a valid URL
      new URL(url)
      return url
    } catch (e) {
      return "/placeholder.svg?height=180&width=320"
    }
  }

  const fetchVideos = async (userId: string) => {
    try {
      setLoading(true);
  
      // Fetch ALL videos from Firestore with ordering by timestamp
      const videosCollection = collection(db, "videos");
      // Create a query with orderBy to sort by timestamp in ascending order
      const videosQuery = query(videosCollection, orderBy("createdAt", "asc"));
      const videoSnapshot = await getDocs(videosQuery);
      
      if (videoSnapshot.empty) {
        toast({
          title: "No Videos Found",
          description: "There are no videos available in the system.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const videoList = videoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        thumbnail: getSafeUrl(
          doc.data().publicId
            ? `https://res.cloudinary.com/dh3bnbq9t/video/upload/${doc.data().publicId}.jpg`
            : undefined,
        ),
        description: doc.data().description || "-",
        category: doc.data().category || "Uncategorized",
      })) as unknown as Video[];
  
      // Fetch watch history to mark watched videos
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", userId),
        where("completed", "==", true),
      );
  
      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map((doc) => doc.data().videoId));
  
      // Mark watched videos
      const videosWithWatchStatus = videoList.map((video) => ({
        ...video,
        watched: watchedVideoIds.has(video.id),
      }));
  
      setVideos(videosWithWatchStatus);
      
      // Filter out General and Miscellaneous videos for dashboard display only
      const filteredForDisplay = videosWithWatchStatus.filter(
        (video) => video.category !== "Company Introduction" && video.category !== "Miscellaneous"
      );
      
      setFilteredVideos(filteredForDisplay);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching videos:", error);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      });
    }
  };
  
    
  const organizeVideosIntoModules = () => {
    // Group videos by category
    const videosByCategory = filteredVideos.reduce((acc, video) => {
      // Exclude General and Miscellaneous categories
      if (video.category === "Company Introduction" || video.category === "Miscellaneous") {
        return acc;
      }
      const category = video.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(video);
      return acc;
    }, {} as Record<string, Video[]>);
  
    const moduleArray: Module[] = [];
    // Calculate total duration for each module
    const calculateTotalDuration = (videos: Video[]): string => {
      let totalMinutes = 0;
      videos.forEach((video) => {
        // Extract minutes from duration string (e.g., "5 minutes" -> 5)
        const durationMatch = video.duration.match(/(\d+)/);
        if (durationMatch && durationMatch[1]) {
          totalMinutes += Number.parseInt(durationMatch[1], 10);
        }
      });
      return `${totalMinutes} mins`;
    };

    // Add other categories as modules (except General and Miscellaneous)
    Object.entries(videosByCategory)
      .forEach(([category, videos]) => {
        // Normalize category for lookup
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/gi, "");
        const normalizedCategory = normalize(category);
        // Find the VIDEO_ORDER key that matches the normalized category
        const videoOrderKey = Object.keys(VIDEO_ORDER).find(
          (key) => normalize(key) === normalizedCategory
        );
        const orderArr = videoOrderKey ? VIDEO_ORDER[videoOrderKey] : undefined;
        const sortedVideos = [...videos].sort((a, b) => {
          const orderA = orderArr?.indexOf(a.title) ?? Number.MAX_SAFE_INTEGER;
          const orderB = orderArr?.indexOf(b.title) ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== Number.MAX_SAFE_INTEGER && orderB !== Number.MAX_SAFE_INTEGER) {
            return orderA - orderB;
          }
          if (orderA !== Number.MAX_SAFE_INTEGER) return -1;
          if (orderB !== Number.MAX_SAFE_INTEGER) return 1;
          return a.title.localeCompare(b.title);
        });
        moduleArray.push({
          name: `${category} Module Overview`,
          category,
          totalDuration: calculateTotalDuration(sortedVideos),
          videos: sortedVideos,
        });
      });

    // Sort modules according to MODULE_ORDER
    moduleArray.sort((a, b) => {
      const indexA = MODULE_ORDER.findIndex(
        (name) => a.category.toLowerCase().replace(/[^a-z]/gi, "") === name.toLowerCase().replace(/[^a-z]/gi, "")
      );
      const indexB = MODULE_ORDER.findIndex(
        (name) => b.category.toLowerCase().replace(/[^a-z]/gi, "") === name.toLowerCase().replace(/[^a-z]/gi, "")
      );
      if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Set all modules as expanded by default
    setExpandedModules(moduleArray.map((module) => module.category));
    setModules(moduleArray);
  }

  const handleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId)
      } else {
        return [...prev, videoId]
      }
    })
  }

  const handleWatchSelected = async () => {
    if (selectedVideos.length === 0) {
      toast({
        title: "No videos selected",
        description: "Please select at least one video to watch.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      // Get the selected videos
      const selectedVideoObjects = videos.filter((video) => selectedVideos.includes(video.id));
      const generalVideos = videos.filter(video => video.category === "Company Introduction");
      const miscVideos = videos.filter(video => video.category === "Miscellaneous");

      // Query Firestore for all completed videos by this user
      const watchHistoryQuery = query(
        collection(db, "videoWatchEvents"),
        where("userId", "==", auth.currentUser?.uid),
        where("completed", "==", true)
      );
      const watchHistorySnapshot = await getDocs(watchHistoryQuery);
      const watchedVideoIds = new Set(watchHistorySnapshot.docs.map(doc => doc.data().videoId));

      // Check if there's an existing playlist in localStorage
      const existingPlaylistStr = localStorage.getItem("currentPlaylist");
      let existingPlaylist = existingPlaylistStr ? JSON.parse(existingPlaylistStr) : null;

      // Combine all video IDs (existing + new selection)
      let combinedVideoIds = new Set<string>();
      if (existingPlaylist) {
        existingPlaylist.videos.forEach((v: Video) => combinedVideoIds.add(v.id));
      }
      selectedVideoObjects.forEach(v => combinedVideoIds.add(v.id));
      generalVideos.forEach(v => combinedVideoIds.add(v.id));
      miscVideos.forEach(v => combinedVideoIds.add(v.id));

      // Helper to get canonical order of all videos
      const getOrderedVideos = () => {
        const ordered: Video[] = [];
        // 1. General videos first (in their order)
        generalVideos.forEach(v => {
          if (combinedVideoIds.has(v.id)) ordered.push(v);
        });
        // 2. By module order
        MODULE_ORDER.forEach(moduleName => {
          const videoTitles = VIDEO_ORDER[moduleName];
          if (videoTitles) {
            videoTitles.forEach(title => {
              const video = videos.find(v => v.title === title && v.category === moduleName);
              if (video && combinedVideoIds.has(video.id) && !ordered.some(o => o.id === video.id)) {
                ordered.push(video);
              }
            });
          }
          // Add any videos in this category not in VIDEO_ORDER
          videos.filter(v => v.category === moduleName && combinedVideoIds.has(v.id) && (!videoTitles || !videoTitles.includes(v.title)))
            .forEach(v => {
              if (!ordered.some(o => o.id === v.id)) ordered.push(v);
            });
        });
        // 3. Miscellaneous at the end
        miscVideos.forEach(v => {
          if (combinedVideoIds.has(v.id) && !ordered.some(o => o.id === v.id)) ordered.push(v);
        });
        return ordered;
      };

      const allPlaylistVideos = getOrderedVideos();

      // Find the first unwatched video to start playback
      let firstVideoToPlay: string;
      const firstUnwatchedGeneral = generalVideos.find(video => !watchedVideoIds.has(video.id));
      if (firstUnwatchedGeneral) {
        firstVideoToPlay = firstUnwatchedGeneral.id;
      } else {
        const firstUnwatchedVideo = allPlaylistVideos.find(video => !watchedVideoIds.has(video.id));
        firstVideoToPlay = firstUnwatchedVideo ? firstUnwatchedVideo.id : allPlaylistVideos[0].id;
      }

      // Update the playlist in localStorage
      const updatedPlaylist = {
        id: "custom-playlist",
        videos: allPlaylistVideos,
        createdAt: existingPlaylist?.createdAt || { seconds: Date.now() / 1000, nanoseconds: 0 },
      };
      localStorage.setItem("currentPlaylist", JSON.stringify(updatedPlaylist));

      // Update active playlist
      const activePlaylist = {
        id: "custom-playlist",
        title: "Custom Playlist",
        lastAccessed: new Date().toISOString(),
        completionPercentage: 0,
      };
      localStorage.setItem("activePlaylist", JSON.stringify(activePlaylist));

      // Navigate to the first unwatched video
      router.push(`/video-player?videoId=${firstVideoToPlay}&playlistId=custom-playlist`);
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast({
        title: "Error",
        description: "Failed to update playlist. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  
  const handleLogout = () => {
    auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    if (globalCheckboxRef.current) {
      // Set indeterminate on the underlying input if present
      const input = globalCheckboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (input) {
        input.indeterminate =
          selectedVideos.length > 0 &&
          !modules.flatMap(module => module.videos.map(v => v.id)).every(id => selectedVideos.includes(id));
      }
    }
    modules.forEach((module, i) => {
      const moduleVideoIds = module.videos.map(v => v.id);
      const btn = moduleCheckboxRefs.current[i];
      if (btn) {
        const input = btn.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (input) {
          input.indeterminate =
            moduleVideoIds.some(id => selectedVideos.includes(id)) &&
            !moduleVideoIds.every(id => selectedVideos.includes(id));
        }
      }
    });
  }, [selectedVideos, modules]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <div className="mr-4">
           
           <img src="/light.webp" height={120} width={80} alt="logo" />
          
          </div>
          <div className="ml-auto flex items-center gap-4">
      
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-4 max-w-5xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search videos..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              onClick={handleWatchSelected}
              disabled={selectedVideos.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Selected ({selectedVideos.length})
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-md"></div>
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No videos found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Global Select All Checkbox */}
              <div className="flex items-center mb-2">
                <Checkbox
                  ref={globalCheckboxRef}
                  checked={
                    modules.length > 0 &&
                    modules.flatMap(module => module.videos.map(v => v.id)).every(id => selectedVideos.includes(id))
                  }
                  onCheckedChange={() => {
                    const allVideoIds = modules.flatMap(module => module.videos.map(v => v.id));
                    if (selectedVideos.length === allVideoIds.length) {
                      setSelectedVideos([]);
                    } else {
                      setSelectedVideos(allVideoIds);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Select All Videos</span>
              </div>
              <Accordion type="multiple" value={expandedModules} className="w-full border rounded-md overflow-hidden">
                {modules.map((module, moduleIndex) => (
                  <AccordionItem key={moduleIndex} value={module.category} className="border-b last:border-b-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30 hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full bg-muted rounded">
                        <div className="flex items-center">
                          {/* Module Select All Checkbox */}
                          <Checkbox
                            ref={el => { moduleCheckboxRefs.current[moduleIndex] = el; }}
                            checked={module.videos.every(v => selectedVideos.includes(v.id))}
                            onCheckedChange={() => {
                              const moduleVideoIds = module.videos.map(v => v.id);
                              const allSelected = moduleVideoIds.every(id => selectedVideos.includes(id));
                              if (allSelected) {
                                setSelectedVideos(selectedVideos.filter(id => !moduleVideoIds.includes(id)));
                              } else {
                                setSelectedVideos([...new Set([...selectedVideos, ...moduleVideoIds])]);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="font-medium text-base">{module.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {module.totalDuration}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {module.videos.length} videos
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/20">
                            <tr>
                              <th className="w-6 px-4 py-2 text-left">
                                <span className="sr-only">Select</span>
                              </th>
                              <th className="px-4 py-2 text-left font-medium">Feature</th>
                              {/* <th className="px-4 py-2 text-left font-medium">Description</th> */}
                              <th className="px-4 py-2 text-left font-medium w-32">Time Required</th>
                              <th className="px-4 py-2 text-left font-medium w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {module.videos.map((video) => (
                              <tr key={video.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3">
                                  <Checkbox
                                    checked={selectedVideos.includes(video.id)}
                                    onCheckedChange={() => handleVideoSelection(video.id)}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium">{video.title}</td>
                                {/* <td className="px-4 py-3 text-muted-foreground">{video.description}</td> */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    {video.duration}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {video.watched ? (
                                    <div className="flex items-center text-green-600 dark:text-green-500">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      <span className="text-xs">Watched</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Unwatched</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-3">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EOXS. All rights reserved.
        </div>
      </footer>
    </div>
  )
}