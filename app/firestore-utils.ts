import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore"
import { db } from "./firebase"

// Function to add videos to Firestore (admin use)
export const addVideoToFirestore = async (videoData: {
  title: string
  duration: string
  thumbnail: string
}) => {
  try {
    const docRef = await addDoc(collection(db, "videos"), {
      ...videoData,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding video:", error)
    throw error
  }
}

// Function to get all videos
export const getVideosFromFirestore = async () => {
  try {
    const videosCollection = collection(db, "videos")
    const videoSnapshot = await getDocs(videosCollection)
    return videoSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting videos:", error)
    throw error
  }
}

// Function to submit feedback
export const submitFeedback = async (userId: string, userEmail: string, feedback: string) => {
  try {
    const docRef = await addDoc(collection(db, "feedback"), {
      userId,
      userEmail,
      feedback,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error submitting feedback:", error)
    throw error
  }
}

