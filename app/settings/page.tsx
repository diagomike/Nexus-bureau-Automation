"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { storageService, type Entity, type Personnel } from "@/lib/storage"
import { User, Building2, Save } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"

export default function SettingsPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [userEntity, setUserEntity] = useState<Entity | null>(null)
  const [signatureUrl, setSignatureUrl] = useState("")
  const [stampUrl, setStampUrl] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    // Load user's entity
    const entity = storageService.getEntityById(currentUser.entityId)
    setUserEntity(entity)
    setSignatureUrl(currentUser.signatureUrl || "")
    setStampUrl(entity?.stampUrl || "")
  }, [router])

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSignatureUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleStampUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setStampUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Update user signature
      const updatedUser = storageService.updatePersonnel(user.id, { signatureUrl })

      // Update entity stamp if user is manager
      if (user.role === "manager" && userEntity) {
        storageService.updateEntity(userEntity.id, { stampUrl })
      }

      // Update session data
      if (updatedUser) {
        AuthService.updateSession(updatedUser)
        setUser(updatedUser)
      }

      alert("Settings saved successfully!")
    } catch (error) {
      alert("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="outline">← Back</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-500">Manage your digital signatures and entity stamps</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Digital Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Digital Signature
              </CardTitle>
              <CardDescription>Upload your personal digital signature for approving workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="signature-upload">Upload Signature Image</Label>
                <Input
                  id="signature-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: PNG with transparent background, 300x100px</p>
              </div>

              {signatureUrl && (
                <div>
                  <Label>Preview</Label>
                  <div className="border rounded-lg p-4 bg-white">
                    <img
                      src={signatureUrl || "/placeholder.svg"}
                      alt="Digital Signature"
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Current User</Label>
                <div className="text-sm text-gray-600">
                  <div>{user.name}</div>
                  <div>{user.email}</div>
                  <div className="capitalize">{user.role}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entity Stamp */}
          {user.role === "manager" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Entity Official Stamp
                </CardTitle>
                <CardDescription>Upload your organization's official stamp for document authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stamp-upload">Upload Stamp Image</Label>
                  <Input id="stamp-upload" type="file" accept="image/*" onChange={handleStampUpload} className="mt-1" />
                  <p className="text-xs text-gray-500 mt-1">Recommended: PNG with transparent background, 150x150px</p>
                </div>

                {stampUrl && (
                  <div>
                    <Label>Preview</Label>
                    <div className="border rounded-lg p-4 bg-white">
                      <img
                        src={stampUrl || "/placeholder.svg"}
                        alt="Entity Stamp"
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Entity Information</Label>
                  <div className="text-sm text-gray-600">
                    <div>{userEntity?.name}</div>
                    <div>Manager: {user.name}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Additional Settings */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <div className="text-sm text-gray-600 mt-1">{user.name}</div>
              </div>
              <div>
                <Label>Email Address</Label>
                <div className="text-sm text-gray-600 mt-1">{user.email}</div>
              </div>
              <div>
                <Label>Role</Label>
                <div className="text-sm text-gray-600 mt-1 capitalize">{user.role}</div>
              </div>
              <div>
                <Label>Entity</Label>
                <div className="text-sm text-gray-600 mt-1">{userEntity?.name}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
