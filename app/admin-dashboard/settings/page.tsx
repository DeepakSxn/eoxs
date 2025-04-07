"use client"

import { useState, useEffect } from "react"

import { db } from "@/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save, Video, Mail, Gift, Bell } from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    siteName: "EOXS Video Tool",
    siteDescription: "Your learning platform",
    contactEmail: "contact@eoxs.com",
    giftCardAmount: "5",
    giftCardEmailTemplate: "Thank you for your feedback! Here's your $5 Starbucks gift card.",
    emailNotifications: true,
    autoPlayVideos: true,
    showGiftCardIncentive: true,
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "general"))
        if (settingsDoc.exists()) {
          setSettings(prev => ({
            ...prev,
            ...settingsDoc.data()
          }))
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }
    loadSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "settings", "general"), settings)
      toast({
        title: "Settings Updated",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Update Failed",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your application settings and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) =>
                    setSettings({ ...settings, siteName: e.target.value })
                  }
                  disabled={loading}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) =>
                    setSettings({ ...settings, siteDescription: e.target.value })
                  }
                  disabled={loading}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, contactEmail: e.target.value })
                  }
                  disabled={loading}
                  className="bg-background"
                />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Gift Card Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="giftCardAmount">Gift Card Amount ($)</Label>
                <Input
                  id="giftCardAmount"
                  type="number"
                  value={settings.giftCardAmount}
                  onChange={(e) =>
                    setSettings({ ...settings, giftCardAmount: e.target.value })
                  }
                  disabled={loading}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="giftCardEmailTemplate">Gift Card Email Template</Label>
                <Input
                  id="giftCardEmailTemplate"
                  value={settings.giftCardEmailTemplate}
                  onChange={(e) =>
                    setSettings({ ...settings, giftCardEmailTemplate: e.target.value })
                  }
                  disabled={loading}
                  className="bg-background"
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Show Gift Card Incentive</Label>
                  <p className="text-sm text-muted-foreground">
                    Display gift card offer in feedback forms
                  </p>
                </div>
                <Switch
                  checked={settings.showGiftCardIncentive}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showGiftCardIncentive: checked })
                  }
                />
              </div>
            </form>
          </CardContent>
        </Card>

    

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white px-6"
          >
            {loading ? (
              <>Not
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 