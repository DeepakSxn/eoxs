import { db } from "./firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

// In a real application, you would use a proper email service like SendGrid, Mailgun, etc.
// For this demo, we'll simulate email sending by storing the email data in Firestore

export async function sendPlaylistEmail(userId: string, userEmail: string, playlistId: string, videos: any[]) {
  try {
    // Generate a unique link for the playlist
    const playlistLink = `${window.location.origin}/playlists/${playlistId}`

    // Create email content
    const emailContent = {
      to: userEmail,
      subject: "Your EOXS Video Playlist",
      body: `
        <h1>Your Video Playlist is Ready!</h1>
        <p>Thank you for creating a playlist with EOXS Video Tool.</p>
        <p>You can access your playlist using the following link:</p>
        <p><a href="${playlistLink}">${playlistLink}</a></p>
        <p>Your playlist contains ${videos.length} videos:</p>
        <ul>
          ${videos.map((video) => `<li>${video.title}</li>`).join("")}
        </ul>
        <p>Thank you for using EOXS Video Tool!</p>
      `,
      sentAt: serverTimestamp(),
      userId,
      playlistId,
    }

    // Store the email in Firestore (simulating email sending)
    const emailRef = await addDoc(collection(db, "emails"), emailContent)

    console.log("Email sent successfully with ID:", emailRef.id)
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

