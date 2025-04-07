// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6p_v1jNO0AsNaikYARxjO0tcek1iAuu8",
  authDomain: "demoauth-82b79.firebaseapp.com",
  projectId: "demoauth-82b79",
  storageBucket: "demoauth-82b79.firebasestorage.app",
  messagingSenderId: "502473124629",
  appId: "1:502473124629:web:07d3a191cf0757f94e571c",
  measurementId: "G-M7LYX2QWWT",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
export default app

