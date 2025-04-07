"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { signOut, User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Calendar, Mail, User as UserIcon, Lightbulb } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface FeedbackItem {
  id: string;
  userId: string;
  userEmail: string;
  playlistId: string;
  feedback: string;
  recommendation?: string;
  type: "video_completion" | "playlist_creation";
  createdAt: any;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    });

    loadFeedback();
    return () => unsubscribe();
  }, [router]);

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      const feedbackQuery = query(
        collection(db, "feedback"),
        orderBy("createdAt", "desc")
      );
      const recommendationsQuery = query(
        collection(db, "recommendations"),
        orderBy("createdAt", "desc")
      );

      const [feedbackDocs, recommendationDocs] = await Promise.all([
        getDocs(feedbackQuery),
        getDocs(recommendationsQuery)
      ]);

      const allFeedback: FeedbackItem[] = [
        ...feedbackDocs.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "video_completion"
        } as FeedbackItem)),
        ...recommendationDocs.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "playlist_creation"
        } as FeedbackItem))
      ];

      setFeedbackItems(allFeedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Feedback</h1>
        <p className="text-muted-foreground mt-2">
          View feedback from users after completing videos.
        </p>
      </div>

      <Tabs defaultValue="feedback" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Video Completion Feedback
          </TabsTrigger>
          
        </TabsList>

        <TabsContent value="feedback">
          <div className="grid gap-4">
            {feedbackItems
              .filter(item => item.type === "video_completion")
              .map(item => (
                <Card key={item.id}>
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
              ))}
          </div>
        </TabsContent>

      
      </Tabs>
    </div>
  );
} 