"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { auth, db } from "../firebase"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { User as UserIcon, ArrowLeft } from "lucide-react"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ name: "", companyName: "", email: "", phoneCountryCode: "+1", phoneNumber: "" })
  const [editing, setEditing] = useState(false)
  const [editProfile, setEditProfile] = useState({ name: "", companyName: "", email: "", phoneCountryCode: "+1", phoneNumber: "" })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchProfile(currentUser.uid, currentUser.email ?? "")
      } else {
        router.push("/login")
      }
    })
    return () => unsubscribe()
  }, [router])

  const fetchProfile = async (uid: string, email: string) => {
    const q = query(collection(db, "users"), where("userId", "==", uid))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data()
      setProfile({
        name: data.name || "-",
        companyName: data.companyName || "-",
        email: email || data.email || "-",
        phoneCountryCode: data.phoneCountryCode || "+1",
        phoneNumber: data.phoneNumber || "",
      })
      setEditProfile({
        name: data.name || "",
        companyName: data.companyName || "",
        email: email || data.email || "",
        phoneCountryCode: data.phoneCountryCode || "+1",
        phoneNumber: data.phoneNumber || "",
      })
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setMessage("")
    setError("")
  }

  const handleCancel = () => {
    setEditing(false)
    setEditProfile(profile)
    setMessage("")
    setError("")
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    setMessage("")
    setError("")
    try {
      if (editing && (newPassword || confirmPassword || oldPassword)) {
        if (!oldPassword) {
          setError("Please enter your current password.")
          setLoading(false)
          return
        }
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match.")
          setLoading(false)
          return
        }
        const credential = EmailAuthProvider.credential(user.email, oldPassword)
        await reauthenticateWithCredential(user, credential)
        await updatePassword(user, newPassword)
      }
      if (!editProfile.phoneNumber) {
        setError("Phone number is required.");
        setLoading(false);
        return;
      } else if (!/^\d{6,15}$/.test(editProfile.phoneNumber)) {
        setError("Phone number must be digits only (6-15 digits)");
        setLoading(false);
        return;
      }
      if (!editProfile.phoneCountryCode) {
        setError("Country code is required.");
        setLoading(false);
        return;
      } else if (!/^\+\d{1,4}$/.test(editProfile.phoneCountryCode)) {
        setError("Country code must start with + and be 1-4 digits");
        setLoading(false);
        return;
      }
      const q = query(collection(db, "users"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        await updateDoc(doc(db, "users", userDoc.id), {
          name: editProfile.name,
          companyName: editProfile.companyName,
          email: editProfile.email,
          phoneCountryCode: editProfile.phoneCountryCode,
          phoneNumber: editProfile.phoneNumber,
        })
        setProfile({
          name: editProfile.name,
          companyName: editProfile.companyName,
          email: editProfile.email,
          phoneCountryCode: editProfile.phoneCountryCode,
          phoneNumber: editProfile.phoneNumber,
        })
        setEditing(false)
        setMessage("Profile updated successfully.")
        setNewPassword("")
        setConfirmPassword("")
        setOldPassword("")
      } else {
        setError("User profile not found.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile.")
    } finally {
      setLoading(false)
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
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-8">
        <div className="w-full max-w-2xl animate-fade-in-up">
          <Button variant="outline" className="mb-8 flex items-center gap-2 text-lg px-6 py-3" style={{fontWeight:500}} onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </Button>
          <div className="p-12 bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center" style={{minWidth:400}}>
            <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center mb-6 shadow">
              <UserIcon className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight">User Profile</h2>
            <div className="w-full mt-2">
              {editing ? (
                <>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">Name</label>
                    <input
                      className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition"
                      value={editProfile.name}
                      onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">Company</label>
                    <input
                      className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition"
                      value={editProfile.companyName}
                      onChange={e => setEditProfile({ ...editProfile, companyName: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">Email</label>
                    <input
                      className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition"
                      value={editProfile.email}
                      onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                      disabled={loading}
                      type="email"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition pr-12"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        disabled={loading}
                        type={showOldPassword ? "text" : "password"}
                        placeholder="Enter current password"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowOldPassword(v => !v)} tabIndex={-1}>
                        {showOldPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">New Password</label>
                    <div className="relative">
                      <input
                        className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition pr-12"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        disabled={loading}
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowNewPassword(v => !v)} tabIndex={-1}>
                        {showNewPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">Confirm Password</label>
                    <div className="relative">
                      <input
                        className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition pr-12"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1}>
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-lg font-medium mb-2">Phone Number</label>
                    <div className="flex gap-2">
                      <input
                        id="phoneCountryCode"
                        type="text"
                        placeholder="+1"
                        value={editProfile.phoneCountryCode}
                        onChange={e => setEditProfile({ ...editProfile, phoneCountryCode: e.target.value.replace(/[^+\d]/g, "") })}
                        required
                        disabled={loading}
                        className="border rounded px-4 py-3 text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition w-24"
                        maxLength={5}
                      />
                      <input
                        className="border rounded px-4 py-3 w-full text-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition flex-1"
                        value={editProfile.phoneNumber}
                        onChange={e => setEditProfile({ ...editProfile, phoneNumber: e.target.value.replace(/\D/g, "") })}
                        disabled={loading}
                        type="tel"
                        placeholder="Phone Number"
                        maxLength={15}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3">
                      {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} disabled={loading} className="text-lg px-8 py-3">
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 text-2xl text-gray-800">{profile.name || "-"}</div>
                  <div className="mb-2 text-xl text-gray-600">{profile.companyName || "-"}</div>
                  <div className="mb-2 text-lg text-gray-500">{profile.email || user?.email || "-"}</div>
                  <div className="mb-2 text-lg text-gray-500">
                    {profile.phoneCountryCode} {profile.phoneNumber}
                  </div>
                  <Button className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3" onClick={handleEdit}>Edit</Button>
                </>
              )}
              {(message || error) && (
                <div className={`mt-6 text-lg rounded px-4 py-3 ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{error || message}</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 